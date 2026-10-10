import type { LocalizedText } from '@shared/localized'
import type { ToolId } from '@simulation/bench'
import { getComponentOfSlot } from '@simulation/catalog'
import { buildCost, isSimulable, performance, resolveBuild, simulate } from '@simulation/simulate'
import type { BuildIds, Cpu, Gpu } from '@simulation/types'
import { conditionFromFaults, FAULT_SLOT, FAULT_SYMPTOM } from './faults'
import { boardSize, CATEGORIES, maxDifficulty, levelFromXp } from './progression'
import { createRng, mixSeed, type Rng } from './random'
import type { Contract, ContractCategory, Fault, Requirement } from './schema'
import { availableComponents, cheapestPsu, completeBuild } from './solver'

const t = (fr: string, en: string): LocalizedText => ({ fr, en })

const FIRST_NAMES = ['Lucas', 'Emma', 'Hugo', 'Léa', 'Nathan', 'Chloé', 'Inès', 'Mathis', 'Sarah', 'Yanis', 'Camille', 'Noah', 'Jade', 'Tom', 'Manon', 'Adam', 'Zoé', 'Malik', 'Lina', 'Théo']
const LAST_NAMES = ['Martin', 'Bernard', 'Dubois', 'Petit', 'Moreau', 'Laurent', 'Garcia', 'Roux', 'Fournier', 'Girard', 'Bonnet', 'Mercier', 'Lambert', 'Faure', 'Rousseau', 'Diallo', 'Nguyen', 'Haddad']
const COMPANIES = ['Cabinet Lefèvre', 'Atelier Nord', 'Studio Pixelune', 'Agence Horizon', 'Boulangerie Lemoine', 'Comptabilité Arnaud', 'Lycée Jean-Moulin', 'Archi&Co']

/** Contexte nécessaire à la génération : déterminé par l'état de la carrière. */
export type GenerationContext = { seed: number; counter: number; xp: number; reputation: number; tools: readonly ToolId[] }

const roundDown = (value: number, step: number) => Math.floor(value / step) * step
const roundUp = (value: number, step: number) => Math.ceil(value / step) * step

function labourFee(base: number, context: GenerationContext): number {
  const extension = context.tools.includes('workshop-extension') ? 1.1 : 1
  return roundUp(base * (1 + context.reputation / 150) * extension, 5)
}

/** Première mission, identique pour tous les joueurs. */
export const TUTORIAL_CONTRACT: Contract = {
  id: 'contract-0001-tutorial',
  category: 'gaming',
  difficulty: 1,
  client: { name: 'Lucas Martin' },
  title: t('Premier PC de jeu', 'First gaming PC'),
  message: t(
    'Bonjour ! Je voudrais mon premier vrai PC de jeu. Je joue surtout en 1080p et j’aimerais au moins 60 images par seconde. Il me faut 16 Go de mémoire et un SSD d’au moins 500 Go pour que tout charge vite. Mon budget maximum pour les pièces est de 850 €. Je compte sur vous pour qu’il soit stable !',
    'Hi! I’d like my first real gaming PC. I mostly play at 1080p and want at least 60 frames per second. I need 16 GB of memory and an SSD of at least 500 GB so everything loads fast. My maximum budget for parts is €850. I’m counting on you for a stable machine!'
  ),
  requirements: [
    { kind: 'fps', resolution: '1080p', min: 60 },
    { kind: 'ram', minGb: 16 },
    { kind: 'storage', minGb: 500 },
    { kind: 'ssd' }
  ],
  budget: 850,
  labourFee: 120,
  hoursAllowed: 6,
  reference: {
    cpu: 'cpu-axion-a5-5600',
    motherboard: 'mb-strata-a420m',
    ram: 'ram-kinetik-16-ddr4',
    gpu: 'gpu-nebula-rx-6600',
    storage: 'sto-datalith-nvme-1tb',
    psu: 'psu-voltis-550b',
    cooler: 'cool-glacier-t120',
    case: 'case-atrium-m'
  }
}

type Draft = Omit<Contract, 'id' | 'client' | 'labourFee'> & { labourBase: number; business?: boolean }

function pickCpuGpu(rng: Rng, level: number, cpuTiers: [number, number], gpuTiers: [number, number] | null) {
  const cpus = availableComponents('cpu', level).filter((cpu) => cpu.tier >= cpuTiers[0] && cpu.tier <= cpuTiers[1])
  const gpus = gpuTiers ? availableComponents('gpu', level).filter((gpu) => gpu.tier >= gpuTiers[0] && gpu.tier <= gpuTiers[1]) : []
  if (cpus.length === 0 || (gpuTiers && gpus.length === 0)) return null
  return { cpu: rng.pick(cpus), gpu: gpuTiers ? rng.pick(gpus) : null }
}

function gamingDraft(rng: Rng, level: number, difficulty: number): Draft | null {
  const pair = pickCpuGpu(rng, level, [1, Math.min(5, difficulty + 1)], [Math.max(2, difficulty - 1), Math.min(5, difficulty + 1)])
  if (!pair) return null
  const reference = completeBuild(pair.cpu, pair.gpu, { level, minRamGb: 16, minStorageGb: 500, ssd: true })
  if (!reference) return null
  const build = resolveBuild(reference)
  if (!isSimulable(build)) return null
  const perf = performance(build)
  const resolution = difficulty >= 3 && perf.fps['1440p'] >= 60 ? '1440p' : '1080p'
  const min = Math.max(30, roundDown(perf.fps[resolution] * rng.range(0.84, 0.95), 5))
  const budget = roundUp(buildCost(build) * rng.range(1.12, 1.3), 50)
  const requirements: Requirement[] = [
    { kind: 'fps', resolution, min },
    { kind: 'ram', minGb: 16 },
    { kind: 'storage', minGb: 500 },
    { kind: 'ssd' }
  ]
  let extra = t('', '')
  if (difficulty >= 2 && rng.chance(0.4)) {
    const noise = Math.ceil(simulate(build, 'gaming').noiseDb + 1.5)
    requirements.push({ kind: 'noise', maxDb: noise, load: 'gaming' })
    extra = t(` Je joue dans ma chambre : pas plus de ${noise} dB en jeu, s’il vous plaît.`, ` I play in my bedroom: no more than ${noise} dB while gaming, please.`)
  }
  return {
    category: 'gaming',
    difficulty,
    title: t(`PC de jeu ${resolution}`, `${resolution} gaming PC`),
    message: t(
      `Bonjour, je cherche un PC pour jouer en ${resolution} avec au moins ${min} images par seconde. 16 Go de mémoire, un SSD de 500 Go minimum. Budget pièces : ${budget} € maximum.${extra.fr}`,
      `Hello, I’m looking for a PC to play at ${resolution} with at least ${min} frames per second. 16 GB of memory, a 500 GB SSD minimum. Parts budget: €${budget} max.${extra.en}`
    ),
    requirements,
    budget,
    labourBase: 70 + 45 * difficulty,
    hoursAllowed: 5 + difficulty,
    reference
  }
}

function officeDraft(rng: Rng, level: number, difficulty: number): Draft | null {
  const cpus = availableComponents('cpu', level).filter((cpu) => cpu.igpuScore > 0 && cpu.tier <= 2)
  if (cpus.length === 0) return null
  const cpu = rng.pick(cpus)
  const ram = difficulty >= 2 ? 16 : 8
  const reference = completeBuild(cpu, null, { level, minRamGb: ram, minStorageGb: 500, ssd: true })
  if (!reference) return null
  const build = resolveBuild(reference)
  if (!isSimulable(build)) return null
  const perf = performance(build)
  const min = roundDown(perf.officeScore * rng.range(0.86, 0.95), 5)
  const budget = roundUp(buildCost(build) * rng.range(1.12, 1.3), 25)
  const watts = roundUp(simulate(build, 'office').wallPower * 1.25, 5)
  const noise = Math.ceil(simulate(build, 'office').noiseDb + 2)
  const requirements: Requirement[] = [
    { kind: 'office', min },
    { kind: 'ram', minGb: ram },
    { kind: 'storage', minGb: 500 },
    { kind: 'ssd' },
    { kind: 'noise', maxDb: noise, load: 'office' }
  ]
  if (difficulty >= 2) requirements.push({ kind: 'power', maxW: watts, load: 'office' })
  return {
    category: 'office',
    difficulty,
    title: t('Poste bureautique', 'Office workstation'),
    message: t(
      `Nous équipons un poste de travail : traitement de texte, tableur, visioconférence. Il doit être réactif (indice bureautique ≥ ${min}), silencieux (≤ ${noise} dB) et doté d’un SSD de 500 Go et de ${ram} Go de mémoire.${difficulty >= 2 ? ` Consommation en bureautique ≤ ${watts} W.` : ''} Budget pièces : ${budget} €.`,
      `We are equipping a workstation: word processing, spreadsheets, video calls. It must be snappy (office score ≥ ${min}), quiet (≤ ${noise} dB) with a 500 GB SSD and ${ram} GB of memory.${difficulty >= 2 ? ` Office power draw ≤ ${watts} W.` : ''} Parts budget: €${budget}.`
    ),
    requirements,
    budget,
    labourBase: 50 + 35 * difficulty,
    hoursAllowed: 4 + difficulty,
    reference,
    business: true
  }
}

function highEndDraft(rng: Rng, level: number, difficulty: number): Draft | null {
  const pair = pickCpuGpu(rng, level, [3, 5], [4, 5])
  if (!pair) return null
  const reference = completeBuild(pair.cpu, pair.gpu, { level, minRamGb: 32, minStorageGb: 1000, ssd: true })
  if (!reference) return null
  const build = resolveBuild(reference)
  if (!isSimulable(build)) return null
  const perf = performance(build)
  const resolution = perf.fps['4k'] >= 60 && difficulty >= 5 ? '4k' : '1440p'
  const fps = roundDown(perf.fps[resolution] * rng.range(0.85, 0.94), 5)
  const creation = roundDown(perf.creationScore * rng.range(0.85, 0.94), 5)
  const budget = roundUp(buildCost(build) * rng.range(1.1, 1.25), 100)
  return {
    category: 'high-end',
    difficulty,
    title: t('Station de jeu et de création', 'Gaming & creator workstation'),
    message: t(
      `Je monte des vidéos et je stream mes parties. Il me faut ${fps} images par seconde en ${resolution}, un indice de création d’au moins ${creation}, 32 Go de mémoire et 1 To de SSD. Budget pièces : ${budget} €. Je veux du solide, pas de compromis sur la stabilité.`,
      `I edit videos and stream my games. I need ${fps} fps at ${resolution}, a creation score of at least ${creation}, 32 GB of memory and a 1 TB SSD. Parts budget: €${budget}. I want rock-solid, no compromise on stability.`
    ),
    requirements: [
      { kind: 'fps', resolution, min: fps },
      { kind: 'creation', min: creation },
      { kind: 'ram', minGb: 32 },
      { kind: 'storage', minGb: 1000 },
      { kind: 'ssd' }
    ],
    budget,
    labourBase: 150 + 60 * difficulty,
    hoursAllowed: 6 + difficulty,
    reference
  }
}

/** Machine « ancienne » d'un client : composants d'entrée de gamme. */
function clientMachine(rng: Rng, level: number, cpuFilter: (cpu: Cpu) => boolean, gpuFilter: (gpu: Gpu) => boolean, withGpu: boolean) {
  const cpus = availableComponents('cpu', level).filter(cpuFilter)
  const gpus = availableComponents('gpu', level).filter(gpuFilter)
  if (cpus.length === 0 || (withGpu && gpus.length === 0)) return null
  const cpu = rng.pick(cpus)
  return completeBuild(cpu, withGpu ? rng.pick(gpus) : null, { level, minRamGb: 8, minStorageGb: 500, ssd: true })
}

function upgradeDraft(rng: Rng, level: number, difficulty: number): Draft | null {
  const machine = clientMachine(rng, level, (cpu) => cpu.tier === 2, (gpu) => gpu.tier === 1, true)
  if (!machine) return null
  const old = resolveBuild(machine)
  if (!isSimulable(old) || !old.gpu) return null
  const before = performance(old).fps['1080p']
  const candidates = availableComponents('gpu', level).filter(
    (gpu) => gpu.perfScore >= old.gpu!.perfScore * 1.6 && gpu.lengthMm <= old.case.maxGpuLengthMm && gpu.tier <= difficulty + 2
  )
  if (candidates.length === 0) return null
  const gpu = rng.pick(candidates)
  let reference: BuildIds = { ...machine, gpu: gpu.id }
  // Plus de mémoire si la machine n'a que 8 Go.
  let ramNote = t('', '')
  const requirements: Requirement[] = []
  if (old.ram.capacityGb < 16) {
    const ram = availableComponents('ram', level).find(
      (candidate) => candidate.memoryType === old.motherboard.memoryType && candidate.capacityGb >= 16 && candidate.modules <= old.motherboard.memorySlots
    )
    if (!ram) return null
    reference = { ...reference, ram: ram.id }
    requirements.push({ kind: 'ram', minGb: 16 })
    ramNote = t(' Et passer à 16 Go de mémoire.', ' And move up to 16 GB of memory.')
  }
  const psu = cheapestPsu(reference, level)
  if (!psu) return null
  reference = { ...reference, psu: psu.id }
  const after = resolveBuild(reference)
  if (!isSimulable(after)) return null
  const fps = roundDown(performance(after).fps['1080p'] * rng.range(0.86, 0.95), 5)
  if (fps < before * 1.3) return null
  const newParts = (['gpu', 'ram', 'psu'] as const).reduce((total, slot) => total + (reference[slot] !== machine[slot] ? (after[slot]?.price ?? 0) : 0), 0)
  const budget = roundUp(newParts * rng.range(1.15, 1.35), 25)
  requirements.unshift({ kind: 'fps', resolution: '1080p', min: fps })
  return {
    category: 'upgrade',
    difficulty,
    title: t('Mise à niveau graphique', 'Graphics upgrade'),
    message: t(
      `Mon PC fait ${before} images par seconde dans mes jeux en 1080p, c’est devenu insuffisant. J’aimerais atteindre ${fps} images par seconde sans tout changer.${ramNote.fr} Je peux mettre ${budget} € dans les nouvelles pièces.`,
      `My PC does ${before} fps in my games at 1080p, which is no longer enough. I’d like to reach ${fps} fps without replacing everything.${ramNote.en} I can spend €${budget} on new parts.`
    ),
    requirements,
    budget,
    labourBase: 60 + 40 * difficulty,
    hoursAllowed: 4 + difficulty,
    machine: { build: machine, faults: [] },
    reference
  }
}

/** Applique une panne à une machine saine ; renvoie null si la panne n'aurait pas de symptôme observable. */
function injectFault(machine: BuildIds, fault: Fault, level: number): BuildIds | null {
  const build = resolveBuild(machine)
  if (!isSimulable(build)) return null
  switch (fault) {
    case 'undersized-cooler': {
      const weak = availableComponents('cooler', level).find(
        (cooler) => cooler.kind === 'air' && cooler.sockets.includes(build.cpu.socket) && cooler.heightMm <= build.case.maxCoolerHeightMm && cooler.capacityW < build.cpu.loadPower * 0.8
      )
      if (!weak) return null
      const faulty = resolveBuild({ ...machine, cooler: weak.id })
      return isSimulable(faulty) && simulate(faulty, 'cpu').cpuThrottled ? { ...machine, cooler: weak.id } : null
    }
    case 'undersized-psu': {
      if (!build.gpu) return null
      const weak = availableComponents('psu', level).find((psu) => {
        if (psu.pcieConnectors < build.gpu!.pcieConnectors || !build.case.psuFormFactors.includes(psu.formFactor)) return false
        const candidate = resolveBuild({ ...machine, psu: psu.id })
        if (!isSimulable(candidate)) return false
        const full = simulate(candidate, 'full')
        return full.psuTrip && full.systemPower <= full.psuCapacity
      })
      return weak ? { ...machine, psu: weak.id } : null
    }
    default: {
      const condition = conditionFromFaults([fault])
      if (fault === 'dust' || fault === 'dried-paste') {
        const full = simulate(build, 'full', condition)
        return full.cpuThrottled || full.gpuThrottled ? machine : null
      }
      if (fault === 'degraded-psu') return simulate(build, 'full', condition).psuTrip ? machine : null
      return machine
    }
  }
}

const REPAIR_TITLES: Record<'thermal' | 'stability' | 'diagnosis', LocalizedText> = {
  thermal: t('Machine qui surchauffe', 'Overheating machine'),
  stability: t('Machine instable', 'Unstable machine'),
  diagnosis: t('Panne à identifier', 'Fault to track down')
}

function repairDraft(rng: Rng, level: number, difficulty: number, category: 'thermal' | 'stability' | 'diagnosis'): Draft | null {
  const pool: Fault[] =
    category === 'thermal'
      ? ['dust', 'dried-paste', 'undersized-cooler']
      : category === 'stability'
        ? ['degraded-psu', 'faulty-ram', 'undersized-psu']
        : ['dust', 'dried-paste', 'degraded-psu', 'faulty-ram', 'failing-storage', 'undersized-psu', 'undersized-cooler']
  const count = category === 'diagnosis' && difficulty >= 4 ? 2 : 1
  const healthy = clientMachine(rng, level, (cpu) => cpu.tier >= 2 && cpu.tier <= 4, (gpu) => gpu.tier >= 2 && gpu.tier <= 4, true)
  if (!healthy) return null

  let machine = healthy
  const faults: Fault[] = []
  for (let attempt = 0; attempt < 12 && faults.length < count; attempt++) {
    const fault = rng.pick(pool)
    if (faults.includes(fault)) continue
    // Deux pannes sur le même emplacement rendraient le diagnostic ambigu.
    if (faults.some((existing) => FAULT_SLOT[existing] !== null && FAULT_SLOT[existing] === FAULT_SLOT[fault])) continue
    const injected = injectFault(machine, fault, level)
    if (!injected) continue
    machine = injected
    faults.push(fault)
  }
  if (faults.length === 0) return null

  const fixed = resolveBuild(healthy)
  const replacements = faults.reduce((total, fault) => {
    const slot = FAULT_SLOT[fault]
    return slot && fault !== 'dried-paste' ? total + (fixed[slot]?.price ?? 0) : total
  }, 0)
  const budget = roundUp(replacements * 1.3 + 60, 25)
  const symptoms = faults.map((fault) => FAULT_SYMPTOM[fault])
  const join = (lang: 'fr' | 'en') => symptoms.map((symptom) => symptom[lang]).join(lang === 'fr' ? ', et ' : ', and ')
  return {
    category,
    difficulty,
    title: REPAIR_TITLES[category],
    message: t(
      `Bonjour, mon ordinateur pose problème : ${join('fr')}. Pouvez-vous trouver la cause et le réparer ? Je peux payer jusqu’à ${budget} € de pièces si nécessaire, mais pas de remplacement inutile.`,
      `Hello, my computer is acting up: ${join('en')}. Can you find the cause and fix it? I can pay up to €${budget} in parts if needed, but no unnecessary replacements.`
    ),
    requirements: [],
    budget,
    labourBase: 70 + 45 * difficulty + 30 * (faults.length - 1),
    hoursAllowed: 4 + 2.5 * faults.length + difficulty * 0.5,
    machine: { build: machine, faults },
    reference: healthy
  }
}

function draftFor(category: ContractCategory, rng: Rng, level: number, difficulty: number): Draft | null {
  switch (category) {
    case 'gaming':
      return gamingDraft(rng, level, difficulty)
    case 'office':
      return officeDraft(rng, level, difficulty)
    case 'high-end':
      return highEndDraft(rng, level, Math.max(3, difficulty))
    case 'upgrade':
      return upgradeDraft(rng, level, difficulty)
    case 'thermal':
    case 'stability':
    case 'diagnosis':
      return repairDraft(rng, level, difficulty, category)
  }
}

/** Génère un contrat réalisable. Renvoie null si aucune variante cohérente n'a été trouvée. */
export function generateContract(context: GenerationContext, category: ContractCategory): Contract | null {
  const level = levelFromXp(context.xp)
  const rng = createRng(mixSeed(context.seed, context.counter))
  const top = maxDifficulty(context.reputation)
  for (let attempt = 0; attempt < 25; attempt++) {
    const difficulty = Math.max(1, Math.min(top, rng.int(Math.max(1, top - 2), top)))
    const draft = draftFor(category, rng, level, difficulty)
    if (!draft) continue
    const { labourBase, business, ...rest } = draft
    const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`
    return {
      ...rest,
      id: `contract-${String(context.counter).padStart(4, '0')}-${category}`,
      client: business ? { name, company: rng.pick(COMPANIES) } : { name },
      labourFee: labourFee(labourBase, context)
    }
  }
  return null
}

/** Complète le tableau des contrats disponibles. */
export function refillBoard(
  board: readonly Contract[],
  context: GenerationContext
): { board: Contract[]; counter: number } {
  const level = levelFromXp(context.xp)
  const unlocked = CATEGORIES.filter((category) => category.unlockLevel <= level).map((category) => category.id)
  const next = [...board]
  let counter = context.counter
  const target = boardSize(context.tools)
  let guard = 0
  while (next.length < target && guard++ < 40) {
    counter += 1
    const rng = createRng(mixSeed(context.seed, counter * 7919))
    // Favorise les catégories absentes du tableau pour varier les commandes.
    const missing = unlocked.filter((category) => !next.some((contract) => contract.category === category))
    const category = rng.pick(missing.length > 0 ? missing : unlocked)
    const contract = generateContract({ ...context, counter }, category)
    if (contract) next.push(contract)
  }
  return { board: next, counter }
}
