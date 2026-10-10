import type { LocalizedText } from '@shared/localized'
import { benchTest, runBenchTest, type BenchResult, type BenchTestId, type ToolId } from '@simulation/bench'
import { CATALOG, componentName, getComponent } from '@simulation/catalog'
import { checkCompatibility, type CompatibilityReport } from '@simulation/compatibility'
import { isSimulable, resolveBuild } from '@simulation/simulate'
import { EMPTY_BUILD, SLOTS, type BuildIds, type Slot } from '@simulation/types'
import { refillBoard, TUTORIAL_CONTRACT, type GenerationContext } from './contracts'
import { conditionFromFaults, FAULT_SERVICE, FAULT_SLOT } from './faults'
import {
  CATEGORIES,
  levelFromXp,
  PRO_BENCH_TIME_FACTOR,
  RESALE_RATE,
  serviceInfo,
  STARTING_MONEY,
  STARTING_REPUTATION,
  toolInfo,
  TOOLS
} from './progression'
import { checkRequirements, type RequirementCheck } from './requirements'
import { CAREER_SCHEMA_VERSION, type Career, type Contract, type Job, type LedgerEntry, type Service } from './schema'

const t = (fr: string, en: string): LocalizedText => ({ fr, en })

export type ActionError =
  | 'unknown-component'
  | 'locked'
  | 'insufficient-funds'
  | 'not-owned'
  | 'no-job'
  | 'job-in-progress'
  | 'unknown-contract'
  | 'wrong-slot'
  | 'incomplete-build'
  | 'incompatible-build'
  | 'tool-missing'
  | 'already-owned'
  | 'cannot-deliver'

export type ActionResult<Extra = object> = ({ ok: true; career: Career } & Extra) | { ok: false; error: ActionError }

const fail = (error: ActionError): { ok: false; error: ActionError } => ({ ok: false, error })

const BUILD_CATEGORIES = new Set(['gaming', 'office', 'high-end', 'upgrade'])

export function isBuildContract(contract: Contract): boolean {
  return BUILD_CATEGORIES.has(contract.category)
}

function context(career: Career): GenerationContext {
  return { seed: career.seed, counter: career.contractCounter, xp: career.xp, reputation: career.reputation, tools: career.tools }
}

function addLedger(career: Career, entry: Omit<LedgerEntry, 'day'>): void {
  career.ledger.push({ ...entry, day: career.day })
  if (career.ledger.length > 500) career.ledger.splice(0, career.ledger.length - 500)
  if (entry.amount < 0) career.stats.spent += -entry.amount
  else career.stats.earned += entry.amount
}

function touch(career: Career, now: Date): Career {
  career.updatedAt = now.toISOString()
  return career
}

/** Nouvelle carrière : la première commande est toujours la mission d'introduction. */
export function newCareer(seed: number, now = new Date()): Career {
  const career: Career = {
    schemaVersion: CAREER_SCHEMA_VERSION,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    seed: seed >>> 0,
    contractCounter: 1,
    day: 1,
    money: STARTING_MONEY,
    reputation: STARTING_REPUTATION,
    xp: 0,
    tools: [],
    inventory: {},
    board: [structuredClone(TUTORIAL_CONTRACT)],
    active: null,
    history: [],
    ledger: [],
    stats: { delivered: 0, abandoned: 0, earned: 0, spent: 0 }
  }
  const refill = refillBoard(career.board, context(career))
  career.board = refill.board
  career.contractCounter = refill.counter
  return career
}

export function level(career: Career): number {
  return levelFromXp(career.xp)
}

export function inventoryCount(career: Career, componentId: string): number {
  return career.inventory[componentId] ?? 0
}

// ---------------------------------------------------------------- Achats

export function buyComponent(source: Career, componentId: string, now = new Date()): ActionResult {
  const component = getComponent(componentId)
  if (!component) return fail('unknown-component')
  if (component.unlockLevel > level(source)) return fail('locked')
  if (source.money < component.price) return fail('insufficient-funds')
  const career = structuredClone(source)
  career.money -= component.price
  career.inventory[componentId] = inventoryCount(career, componentId) + 1
  addLedger(career, { kind: 'purchase', amount: -component.price, label: t(`Achat : ${componentName(component)}`, `Purchase: ${componentName(component)}`) })
  return { ok: true, career: touch(career, now) }
}

export function resaleValue(componentId: string): number {
  const component = getComponent(componentId)
  return component ? Math.round(component.price * RESALE_RATE) : 0
}

export function sellComponent(source: Career, componentId: string, now = new Date()): ActionResult {
  const component = getComponent(componentId)
  if (!component) return fail('unknown-component')
  if (inventoryCount(source, componentId) < 1) return fail('not-owned')
  const career = structuredClone(source)
  career.inventory[componentId] = inventoryCount(career, componentId) - 1
  if (career.inventory[componentId] === 0) delete career.inventory[componentId]
  const value = resaleValue(componentId)
  career.money += value
  addLedger(career, { kind: 'sale', amount: value, label: t(`Revente : ${componentName(component)}`, `Resale: ${componentName(component)}`) })
  return { ok: true, career: touch(career, now) }
}

export function buyTool(source: Career, toolId: ToolId, now = new Date()): ActionResult {
  const tool = toolInfo(toolId)
  if (source.tools.includes(toolId)) return fail('already-owned')
  if (tool.unlockLevel > level(source)) return fail('locked')
  if (source.money < tool.price) return fail('insufficient-funds')
  const career = structuredClone(source)
  career.money -= tool.price
  career.tools.push(toolId)
  addLedger(career, { kind: 'tool', amount: -tool.price, label: t(`Équipement : ${tool.name.fr}`, `Equipment: ${tool.name.en}`) })
  if (toolId === 'workshop-extension') {
    const refill = refillBoard(career.board, context(career))
    career.board = refill.board
    career.contractCounter = refill.counter
  }
  return { ok: true, career: touch(career, now) }
}

// ---------------------------------------------------------------- Contrats

export function acceptContract(source: Career, contractId: string, now = new Date()): ActionResult {
  if (source.active) return fail('job-in-progress')
  const contract = source.board.find((candidate) => candidate.id === contractId)
  if (!contract) return fail('unknown-contract')
  const career = structuredClone(source)
  career.board = career.board.filter((candidate) => candidate.id !== contractId)
  const build: BuildIds = contract.machine ? { ...contract.machine.build } : { ...EMPTY_BUILD }
  const origins = Object.fromEntries(SLOTS.map((slot) => [slot, build[slot] ? 'client' : null])) as Job['origins']
  career.active = {
    contract: structuredClone(contract),
    build,
    origins,
    clientSpares: [],
    replacedSlots: [],
    faultsRemaining: [...(contract.machine?.faults ?? [])],
    services: [],
    hoursUsed: 0,
    bench: []
  }
  return { ok: true, career: touch(career, now) }
}

/** Pièces de l'atelier installées dans la machine du contrat en cours. */
export function workshopParts(job: Job): { slot: Slot; id: string; price: number }[] {
  return SLOTS.filter((slot) => job.origins[slot] === 'workshop' && job.build[slot]).map((slot) => ({
    slot,
    id: job.build[slot]!,
    price: getComponent(job.build[slot]!)?.price ?? 0
  }))
}

export function partsCost(job: Job): number {
  return workshopParts(job).reduce((total, part) => total + part.price, 0)
}

/** Libère l'emplacement : pièce d'atelier rendue au stock, pièce du client mise de côté. */
function vacate(career: Career, job: Job, slot: Slot): void {
  const current = job.build[slot]
  if (!current) return
  if (job.origins[slot] === 'workshop') career.inventory[current] = inventoryCount(career, current) + 1
  else if (job.origins[slot] === 'client') {
    job.clientSpares.push(current)
    if (!job.replacedSlots.includes(slot)) job.replacedSlots.push(slot)
  }
  job.build[slot] = null
  job.origins[slot] = null
}

export function installPart(source: Career, slot: Slot, componentId: string, now = new Date()): ActionResult {
  if (!source.active) return fail('no-job')
  const component = getComponent(componentId)
  if (!component) return fail('unknown-component')
  if (component.slot !== slot) return fail('wrong-slot')
  const fromClient = source.active.clientSpares.includes(componentId)
  if (!fromClient && inventoryCount(source, componentId) < 1) return fail('not-owned')
  const career = structuredClone(source)
  const job = career.active!
  vacate(career, job, slot)
  if (fromClient) {
    job.clientSpares.splice(job.clientSpares.indexOf(componentId), 1)
    job.origins[slot] = 'client'
  } else {
    career.inventory[componentId] = inventoryCount(career, componentId) - 1
    if (career.inventory[componentId] === 0) delete career.inventory[componentId]
    job.origins[slot] = 'workshop'
    // Une pièce neuve élimine la panne liée à cet emplacement (un refroidisseur neuf arrive avec sa pâte).
    job.faultsRemaining = job.faultsRemaining.filter((fault) => FAULT_SLOT[fault] !== slot)
  }
  job.build[slot] = componentId
  return { ok: true, career: touch(career, now) }
}

export function buyAndInstall(source: Career, slot: Slot, componentId: string, now = new Date()): ActionResult {
  const bought = buyComponent(source, componentId, now)
  if (!bought.ok) return bought
  return installPart(bought.career, slot, componentId, now)
}

export function removePart(source: Career, slot: Slot, now = new Date()): ActionResult {
  if (!source.active) return fail('no-job')
  if (!source.active.build[slot]) return { ok: true, career: source }
  const career = structuredClone(source)
  vacate(career, career.active!, slot)
  return { ok: true, career: touch(career, now) }
}

export function performService(source: Career, service: Service, now = new Date()): ActionResult {
  if (!source.active) return fail('no-job')
  const info = serviceInfo(service)
  if (source.money < info.cost) return fail('insufficient-funds')
  const career = structuredClone(source)
  const job = career.active!
  const fixes = job.faultsRemaining.filter((fault) => FAULT_SERVICE[fault] === service)
  job.faultsRemaining = job.faultsRemaining.filter((fault) => FAULT_SERVICE[fault] !== service)
  job.services.push({ service, productive: fixes.length > 0 })
  job.hoursUsed += info.hours
  career.money -= info.cost
  addLedger(career, { kind: 'service', amount: -info.cost, label: t(`Consommables : ${info.name.fr}`, `Supplies: ${info.name.en}`) })
  return { ok: true, career: touch(career, now) }
}

/** Identifie l'état exact de la machine testée : un test n'est valable que pour cet état. */
export function machineKey(job: Job): string {
  return `${SLOTS.map((slot) => job.build[slot] ?? '-').join('|')}#${[...job.faultsRemaining].sort().join(',')}`
}

export function testHours(career: Career, test: BenchTestId): number {
  const hours = benchTest(test).hours
  return career.tools.includes('pro-bench') ? Math.round(hours * PRO_BENCH_TIME_FACTOR * 10) / 10 : hours
}

export function runTest(source: Career, test: BenchTestId, now = new Date()): ActionResult<{ result: BenchResult }> {
  if (!source.active) return fail('no-job')
  const info = benchTest(test)
  if (info.tool && !source.tools.includes(info.tool)) return fail('tool-missing')
  const build = resolveBuild(source.active.build)
  if (!isSimulable(build)) return fail('incomplete-build')
  if (checkCompatibility(build).status === 'incompatible') return fail('incompatible-build')
  const career = structuredClone(source)
  const job = career.active!
  const result = runBenchTest(test, build, conditionFromFaults(job.faultsRemaining))
  const hours = testHours(career, test)
  job.hoursUsed = Math.round((job.hoursUsed + hours) * 10) / 10
  job.bench.push({ test, buildKey: machineKey(job), outcome: result.outcome, hours, findings: result.findings })
  if (job.bench.length > 200) job.bench.splice(0, job.bench.length - 200)
  return { ok: true, career: touch(career, now), result }
}

// ---------------------------------------------------------------- Livraison

export type DeliveryCheck = {
  canDeliver: boolean
  blockers: LocalizedText[]
  compatibility: CompatibilityReport | null
  requirements: RequirementCheck[]
  partsCost: number
  budget: number
  stability: Job['bench'][number] | null
}

export function deliveryCheck(career: Career): DeliveryCheck | null {
  const job = career.active
  if (!job) return null
  const blockers: LocalizedText[] = []
  const build = resolveBuild(job.build)
  const cost = partsCost(job)
  let compatibility: CompatibilityReport | null = null
  let requirements: RequirementCheck[] = []
  if (!isSimulable(build)) {
    blockers.push(t('La configuration est incomplète.', 'The build is incomplete.'))
  } else {
    compatibility = checkCompatibility(build)
    if (compatibility.status === 'incompatible') blockers.push(t('La configuration contient des incompatibilités.', 'The build has compatibility errors.'))
    requirements = checkRequirements(build, conditionFromFaults(job.faultsRemaining), job.contract.requirements)
    for (const check of requirements) {
      if (!check.met) blockers.push(t(`Exigence non atteinte : ${check.label.fr} (${check.value}, attendu ${check.target}).`, `Requirement not met: ${check.label.en} (${check.value}, expected ${check.target}).`))
    }
  }
  if (cost > job.contract.budget) blockers.push(t(`Budget dépassé : ${cost} € de pièces pour ${job.contract.budget} € autorisés.`, `Over budget: €${cost} of parts for €${job.contract.budget} allowed.`))
  const key = machineKey(job)
  const stability = [...job.bench].reverse().find((record) => record.test === 'stability' && record.buildKey === key) ?? null
  if (!stability) blockers.push(t('Lancez un test de stabilité sur la configuration finale.', 'Run a stability test on the final build.'))
  else if (stability.outcome === 'fail') blockers.push(t('Le dernier test de stabilité a échoué.', 'The latest stability test failed.'))
  return { canDeliver: blockers.length === 0, blockers, compatibility, requirements, partsCost: cost, budget: job.contract.budget, stability }
}

export type Unlocks = { components: string[]; categories: string[]; tools: ToolId[] }

export type DeliveryReport = {
  contract: Contract
  score: number
  stars: number
  reimbursed: number
  labour: number
  savingsBonus: number
  total: number
  partsCost: number
  xpGained: number
  reputationDelta: number
  levelBefore: number
  levelAfter: number
  unlocks: Unlocks
  faultsMissed: number
  notes: LocalizedText[]
}

function unlocksBetween(before: number, after: number): Unlocks {
  const between = (value: number) => value > before && value <= after
  return {
    components: CATALOG.filter((component) => between(component.unlockLevel)).map((component) => component.id),
    categories: CATEGORIES.filter((category) => between(category.unlockLevel)).map((category) => category.id),
    tools: TOOLS.filter((tool) => between(tool.unlockLevel)).map((tool) => tool.id)
  }
}

export function starsFromScore(score: number): number {
  return score >= 90 ? 5 : score >= 75 ? 4 : score >= 55 ? 3 : score >= 35 ? 2 : 1
}

/**
 * Livre la machine. Barème (documenté dans PROJECT_STATUS.md) :
 * satisfaction sur 100, pénalités pour avertissements de compatibilité, stabilité imparfaite,
 * retard et interventions inutiles ; une panne non résolue plafonne la note et annule la main-d'œuvre.
 */
export function deliver(source: Career, now = new Date()): ActionResult<{ report: DeliveryReport }> {
  const check = deliveryCheck(source)
  if (!check || !source.active) return fail('no-job')
  if (!check.canDeliver) return fail('cannot-deliver')

  const career = structuredClone(source)
  const job = career.active!
  const contract = job.contract
  const notes: LocalizedText[] = []
  let score = 100

  const warnings = check.compatibility?.issues.filter((issue) => issue.severity === 'warning') ?? []
  if (warnings.length > 0) {
    score -= Math.min(24, warnings.length * 6)
    notes.push(t(`${warnings.length} réserve(s) de compatibilité relevée(s) par le client.`, `${warnings.length} compatibility caveat(s) noticed by the client.`))
  }
  if (check.stability?.outcome === 'warning') {
    score -= 10
    notes.push(t('Stabilité correcte mais avec des limitations (température ou puissance).', 'Stable, but with throttling or power limits.'))
  }
  const late = Math.ceil(Math.max(0, job.hoursUsed - contract.hoursAllowed))
  if (late > 0) {
    score -= 8 * late
    notes.push(t(`Livraison en retard de ${late} h.`, `Delivered ${late} h late.`))
  }

  let reimbursed = 0
  const originalFaults = contract.machine?.faults ?? []
  if (isBuildContract(contract)) {
    reimbursed = check.partsCost
  } else {
    const usefulSlots = new Set(originalFaults.map((fault) => FAULT_SLOT[fault]).filter((slot): slot is Slot => slot !== null))
    for (const part of workshopParts(job)) {
      if (usefulSlots.has(part.slot)) reimbursed += part.price
      else {
        score -= 10
        notes.push(t(`Remplacement jugé inutile par le client (${componentName(getComponent(part.id)!)}) : non facturé.`, `Replacement deemed unnecessary by the client (${componentName(getComponent(part.id)!)}): not billed.`))
      }
    }
    for (const service of job.services) {
      if (service.productive) reimbursed += serviceInfo(service.service).cost
      else score -= 5
    }
  }

  const numeric = check.requirements.filter((item) => ['fps', 'office', 'creation'].includes(item.requirement.kind))
  if (numeric.length > 0) {
    const margin = numeric.reduce((total, item) => total + item.margin, 0) / numeric.length
    if (margin >= 0.2) score += 10
    else if (margin >= 0.1) score += 5
  }

  const faultsMissed = job.faultsRemaining.length
  if (faultsMissed > 0) {
    score = Math.min(score, 20)
    notes.push(t(`Le client revient : ${faultsMissed} panne(s) non résolue(s). Main-d’œuvre non payée.`, `The client comes back: ${faultsMissed} unresolved fault(s). Labour not paid.`))
  }
  score = Math.max(0, Math.min(100, Math.round(score)))
  const stars = starsFromScore(score)

  const labour = faultsMissed > 0 ? 0 : Math.round(contract.labourFee * (0.5 + (0.5 * score) / 100))
  const savingsBonus = isBuildContract(contract) && faultsMissed === 0 ? Math.round(0.15 * (contract.budget - check.partsCost)) : 0
  const total = reimbursed + labour + savingsBonus

  const difficulty = contract.difficulty
  const reputationDelta = faultsMissed > 0 ? -(4 + 2 * difficulty) : stars >= 3 ? (stars - 2) * (1 + difficulty) : -(3 - stars) * (1 + difficulty)
  const xpGained = faultsMissed > 0 ? 10 : 20 + 25 * difficulty + 8 * stars

  const levelBefore = level(career)
  career.money += total
  addLedger(career, { kind: 'payout', amount: total, label: t(`Livraison : ${contract.title.fr} (${contract.client.name})`, `Delivery: ${contract.title.en} (${contract.client.name})`) })
  career.reputation = Math.max(0, Math.min(100, career.reputation + reputationDelta))
  career.xp += xpGained
  const levelAfter = level(career)
  career.stats.delivered += 1
  career.history.push({
    contractId: contract.id,
    category: contract.category,
    difficulty,
    title: contract.title,
    clientName: contract.client.name,
    day: career.day,
    outcome: 'delivered',
    stars,
    score,
    payout: total,
    partsCost: check.partsCost,
    reputationDelta,
    xpGained,
    faultsMissed
  })
  if (career.history.length > 1000) career.history.splice(0, career.history.length - 1000)
  career.active = null
  career.day += 1
  const refill = refillBoard(career.board, context(career))
  career.board = refill.board
  career.contractCounter = refill.counter

  return {
    ok: true,
    career: touch(career, now),
    report: {
      contract,
      score,
      stars,
      reimbursed,
      labour,
      savingsBonus,
      total,
      partsCost: check.partsCost,
      xpGained,
      reputationDelta,
      levelBefore,
      levelAfter,
      unlocks: unlocksBetween(levelBefore, levelAfter),
      faultsMissed,
      notes
    }
  }
}

export const ABANDON_REPUTATION_PENALTY = 6

/** Abandon : les pièces de l'atelier reviennent en stock, la machine du client lui est rendue. */
export function abandonContract(source: Career, now = new Date()): ActionResult {
  if (!source.active) return fail('no-job')
  const career = structuredClone(source)
  const job = career.active!
  for (const part of workshopParts(job)) career.inventory[part.id] = inventoryCount(career, part.id) + 1
  career.reputation = Math.max(0, career.reputation - ABANDON_REPUTATION_PENALTY)
  career.stats.abandoned += 1
  career.history.push({
    contractId: job.contract.id,
    category: job.contract.category,
    difficulty: job.contract.difficulty,
    title: job.contract.title,
    clientName: job.contract.client.name,
    day: career.day,
    outcome: 'abandoned',
    stars: 0,
    score: 0,
    payout: 0,
    partsCost: 0,
    reputationDelta: -ABANDON_REPUTATION_PENALTY,
    xpGained: 0,
    faultsMissed: 0
  })
  career.active = null
  career.day += 1
  const refill = refillBoard(career.board, context(career))
  career.board = refill.board
  career.contractCounter = refill.counter
  return { ok: true, career: touch(career, now) }
}
