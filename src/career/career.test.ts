import { describe, expect, it } from 'vitest'
import { getComponent } from '@simulation/catalog'
import { SLOTS, type Slot } from '@simulation/types'
import {
  abandonContract,
  acceptContract,
  buyAndInstall,
  buyComponent,
  buyTool,
  deliver,
  deliveryCheck,
  installPart,
  newCareer,
  performService,
  removePart,
  resaleValue,
  runTest,
  sellComponent,
  type ActionResult
} from './career'
import { generateContract, TUTORIAL_CONTRACT } from './contracts'
import { STARTING_MONEY } from './progression'
import type { Career } from './schema'

const NOW = new Date('2026-10-10T10:00:00Z')

function ok<T extends object>(result: ActionResult<T>): Career & { extra: T } {
  if (!result.ok) throw new Error(`action refusée : ${result.error}`)
  const { career, ...extra } = result as { ok: true; career: Career } & T
  return Object.assign(career, { extra: extra as unknown as T })
}

function buildReference(career: Career): Career {
  let state = career
  for (const slot of SLOTS) {
    const id = state.active!.contract.reference[slot]
    if (id && state.active!.build[slot] !== id) state = ok(buyAndInstall(state, slot, id, NOW))
  }
  return state
}

describe('économie', () => {
  it('démarre avec le solde, la réputation et le tableau de contrats prévus', () => {
    const career = newCareer(123, NOW)
    expect(career.money).toBe(STARTING_MONEY)
    expect(career.board[0]!.id).toBe(TUTORIAL_CONTRACT.id)
    expect(career.board).toHaveLength(4)
  })

  it('retire réellement le prix d’un achat et ajoute la pièce au stock', () => {
    const career = ok(buyComponent(newCareer(1, NOW), 'gpu-nebula-rx-6600', NOW))
    expect(career.money).toBe(STARTING_MONEY - 209)
    expect(career.inventory['gpu-nebula-rx-6600']).toBe(1)
    expect(career.ledger.at(-1)!.amount).toBe(-209)
    expect(career.stats.spent).toBe(209)
  })

  it('refuse un achat si le solde est insuffisant ou la pièce verrouillée', () => {
    const poor = { ...newCareer(1, NOW), money: 100 }
    expect(buyComponent(poor, 'gpu-nebula-rx-6600', NOW)).toEqual({ ok: false, error: 'insufficient-funds' })
    expect(buyComponent(newCareer(1, NOW), 'gpu-vektor-rtx-4090', NOW)).toEqual({ ok: false, error: 'locked' })
  })

  it('revend une pièce inutilisée à 60 % de son prix', () => {
    let career = ok(buyComponent(newCareer(1, NOW), 'psu-voltis-650g', NOW))
    career = ok(sellComponent(career, 'psu-voltis-650g', NOW))
    expect(resaleValue('psu-voltis-650g')).toBe(53)
    expect(career.money).toBe(STARTING_MONEY - 89 + 53)
    expect(career.inventory['psu-voltis-650g']).toBeUndefined()
    expect(sellComponent(career, 'psu-voltis-650g', NOW)).toEqual({ ok: false, error: 'not-owned' })
  })

  it('achète des outils une seule fois, selon le niveau', () => {
    const career = newCareer(1, NOW)
    expect(buyTool(career, 'psu-tester', NOW)).toEqual({ ok: false, error: 'locked' })
    const leveled = { ...career, xp: 600 }
    const equipped = ok(buyTool(leveled, 'psu-tester', NOW))
    expect(equipped.money).toBe(STARTING_MONEY - 120)
    expect(buyTool(equipped, 'psu-tester', NOW)).toEqual({ ok: false, error: 'already-owned' })
  })
})

describe('mission d’introduction de bout en bout', () => {
  it('se joue entièrement : contrat, achats, test, livraison, récompense', () => {
    let career = newCareer(7, NOW)
    career = ok(acceptContract(career, TUTORIAL_CONTRACT.id, NOW))
    expect(career.active).not.toBeNull()
    expect(career.board.some((contract) => contract.id === TUTORIAL_CONTRACT.id)).toBe(false)

    // Impossible de livrer une machine vide.
    expect(deliveryCheck(career)!.canDeliver).toBe(false)
    expect(runTest(career, 'stability', NOW)).toEqual({ ok: false, error: 'incomplete-build' })

    career = buildReference(career)
    const cost = 139 + 69 + 42 + 209 + 65 + 59 + 35 + 49
    expect(career.money).toBe(STARTING_MONEY - cost)

    // Sans test de stabilité, la livraison reste bloquée.
    const before = deliveryCheck(career)!
    expect(before.partsCost).toBe(cost)
    expect(before.canDeliver).toBe(false)
    expect(before.requirements.every((check) => check.met)).toBe(true)

    career = ok(runTest(career, 'stability', NOW))
    expect(career.active!.hoursUsed).toBe(2)
    expect(deliveryCheck(career)!.canDeliver).toBe(true)

    const delivered = deliver(career, NOW)
    if (!delivered.ok) throw new Error(delivered.error)
    const { report } = delivered
    career = delivered.career
    expect(report.stars).toBeGreaterThanOrEqual(4)
    expect(report.reimbursed).toBe(cost)
    expect(report.savingsBonus).toBe(Math.round(0.15 * (850 - cost)))
    expect(career.money).toBe(STARTING_MONEY - cost + report.total)
    expect(career.money).toBeGreaterThan(STARTING_MONEY)
    expect(career.xp).toBe(report.xpGained)
    expect(career.reputation).toBeGreaterThan(10)
    expect(career.history).toHaveLength(1)
    expect(career.active).toBeNull()
    expect(career.board).toHaveLength(4)
    expect(career.day).toBe(2)
  })

  it('un changement de pièce après le test invalide la livraison', () => {
    let career = buildReference(ok(acceptContract(newCareer(7, NOW), TUTORIAL_CONTRACT.id, NOW)))
    career = ok(runTest(career, 'stability', NOW))
    career = ok(buyAndInstall(career, 'cooler', 'cool-glacier-box', NOW))
    expect(deliveryCheck(career)!.canDeliver).toBe(false)
    expect(career.inventory['cool-glacier-t120']).toBe(1)
  })

  it('bloque la livraison hors budget ou sous les performances demandées', () => {
    let career = buildReference(ok(acceptContract({ ...newCareer(7, NOW), money: 5000, xp: 300 }, TUTORIAL_CONTRACT.id, NOW)))
    career = ok(buyAndInstall(career, 'gpu', 'gpu-vektor-gt-1630', NOW))
    career = ok(runTest(career, 'stability', NOW))
    const check = deliveryCheck(career)!
    expect(check.canDeliver).toBe(false)
    expect(check.requirements.find((item) => item.requirement.kind === 'fps')!.met).toBe(false)
    expect(deliver(career, NOW)).toEqual({ ok: false, error: 'cannot-deliver' })

    career = ok(buyAndInstall(career, 'case', 'case-atrium-a', NOW))
    career = ok(buyAndInstall(career, 'gpu', 'gpu-vektor-rtx-3060', NOW))
    career = ok(buyAndInstall(career, 'cpu', 'cpu-axion-a5-5600', NOW))
    career = ok(buyAndInstall(career, 'psu', 'psu-voltis-650g', NOW))
    career = ok(buyAndInstall(career, 'storage', 'sto-datalith-nvme-1tb', NOW))
    career = ok(buyAndInstall(career, 'ram', 'ram-kinetik-32-ddr4', NOW))
    career = ok(buyAndInstall(career, 'cooler', 'cool-glacier-t120', NOW))
    career = ok(buyAndInstall(career, 'motherboard', 'mb-strata-b550', NOW))
    career = ok(runTest(career, 'stability', NOW))
    // 3060 + B550 + boîtier ATX + 32 Go : 79 + 119 + 69 + 259 + 139 + 89 + 65 + 35 = 854 € > 850 €
    expect(deliveryCheck(career)!.blockers.some((blocker) => blocker.fr.includes('Budget dépassé'))).toBe(true)
  })

  it('l’abandon rend les pièces au stock et coûte de la réputation', () => {
    let career = buildReference(ok(acceptContract(newCareer(7, NOW), TUTORIAL_CONTRACT.id, NOW)))
    career = ok(abandonContract(career, NOW))
    expect(career.active).toBeNull()
    expect(career.reputation).toBe(4)
    expect(Object.values(career.inventory).reduce((a, b) => a + b, 0)).toBe(8)
    expect(career.history[0]!.outcome).toBe('abandoned')
    expect(career.board).toHaveLength(4)
  })

  it('retirer une pièce la rend au stock, et elle peut être réinstallée', () => {
    let career = buildReference(ok(acceptContract(newCareer(7, NOW), TUTORIAL_CONTRACT.id, NOW)))
    career = ok(removePart(career, 'gpu', NOW))
    expect(career.active!.build.gpu).toBeNull()
    expect(career.inventory['gpu-nebula-rx-6600']).toBe(1)
    career = ok(installPart(career, 'gpu', 'gpu-nebula-rx-6600', NOW))
    expect(career.inventory['gpu-nebula-rx-6600']).toBeUndefined()
    expect(installPart(career, 'cpu', 'gpu-nebula-rx-6600', NOW)).toEqual({ ok: false, error: 'wrong-slot' })
  })
})

describe('missions de réparation', () => {
  const context = { seed: 3, counter: 11, xp: 3000, reputation: 60, tools: [] }

  function repairCareer(category: 'thermal' | 'stability') {
    for (let counter = 1; counter < 60; counter++) {
      const contract = generateContract({ ...context, counter }, category)
      if (contract?.machine) {
        const career: Career = { ...newCareer(3, NOW), xp: 3000, money: 3000, board: [contract] }
        return ok(acceptContract(career, contract.id, NOW))
      }
    }
    throw new Error('aucun contrat')
  }

  function fix(career: Career): Career {
    let state = career
    for (const fault of state.active!.faultsRemaining) {
      if (fault === 'dust') state = ok(performService(state, 'cleaning', NOW))
      else if (fault === 'dried-paste') state = ok(performService(state, 'repaste', NOW))
      else {
        const slot = ({ 'undersized-cooler': 'cooler', 'degraded-psu': 'psu', 'undersized-psu': 'psu', 'faulty-ram': 'ram', 'failing-storage': 'storage' } as Record<string, Slot>)[fault]!
        state = ok(buyAndInstall(state, slot, state.active!.contract.reference[slot]!, NOW))
      }
    }
    return state
  }

  it('une réparation correcte est payée et notée', () => {
    for (const category of ['thermal', 'stability'] as const) {
      let career = fix(repairCareer(category))
      expect(career.active!.faultsRemaining).toEqual([])
      career = ok(runTest(career, 'stability', NOW))
      const result = deliver(career, NOW)
      if (!result.ok) throw new Error(`${category}: ${result.error} ${JSON.stringify(deliveryCheck(career)!.blockers)}`)
      expect(result.report.faultsMissed).toBe(0)
      expect(result.report.labour).toBeGreaterThan(0)
      expect(result.report.stars).toBeGreaterThanOrEqual(3)
    }
  })

  it('une panne non résolue est découverte par le client', () => {
    let career = repairCareer('thermal')
    const faults = career.active!.faultsRemaining
    // Remplacer une pièce sans rapport : la panne reste (ou la machine plante).
    career = ok(buyAndInstall(career, 'storage', 'sto-datalith-nvme-2tb', NOW))
    career = ok(runTest(career, 'stability', NOW))
    const result = deliver(career, NOW)
    if (result.ok) {
      expect(result.report.faultsMissed).toBe(faults.length)
      expect(result.report.labour).toBe(0)
      expect(result.report.reputationDelta).toBeLessThan(0)
      expect(result.report.reimbursed).toBe(0)
    } else {
      expect(result.error).toBe('cannot-deliver')
    }
  })

  it('les interventions inutiles sont facturées à l’atelier', () => {
    let career = repairCareer('stability')
    const money = career.money
    career = ok(performService(career, 'cleaning', NOW))
    expect(career.money).toBe(money - 10)
    expect(career.active!.services[0]!.productive).toBe(false)
    expect(career.active!.hoursUsed).toBe(1)
  })

  it('les tests consomment du temps, les outils manquants les bloquent', () => {
    const career = repairCareer('stability')
    expect(runTest(career, 'psu-tester', NOW)).toEqual({ ok: false, error: 'tool-missing' })
    const tested = ok(runTest(career, 'memtest', NOW))
    expect(tested.active!.hoursUsed).toBe(3)
    expect(tested.extra.result.findings.length).toBeGreaterThan(0)
  })

  it('les pièces du client retirées peuvent être réinstallées', () => {
    let career = repairCareer('stability')
    const original = career.active!.build.ram!
    career = ok(removePart(career, 'ram', NOW))
    expect(career.active!.clientSpares).toContain(original)
    career = ok(installPart(career, 'ram', original, NOW))
    expect(career.active!.origins.ram).toBe('client')
    expect(getComponent(original)).toBeDefined()
  })
})
