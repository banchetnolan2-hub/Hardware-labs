import { describe, expect, it } from 'vitest'
import { runBenchTest } from '@simulation/bench'
import { checkCompatibility } from '@simulation/compatibility'
import { buildCost, isSimulable, resolveBuild, simulate } from '@simulation/simulate'
import { HEALTHY, SLOTS } from '@simulation/types'
import { generateContract, refillBoard, TUTORIAL_CONTRACT } from './contracts'
import { conditionFromFaults, FAULT_SERVICE, FAULT_SLOT } from './faults'
import { CATEGORIES, LEVEL_XP, STARTING_MONEY, levelFromXp } from './progression'
import { checkRequirements } from './requirements'
import type { Contract } from './schema'

/** Vérifie qu'un contrat est réalisable avec sa solution de référence. */
function assertFeasible(contract: Contract, level: number) {
  const reference = resolveBuild(contract.reference)
  expect(isSimulable(reference), contract.id).toBe(true)
  if (!isSimulable(reference)) return
  for (const slot of SLOTS) {
    const part = reference[slot]
    if (part) expect(part.unlockLevel, `${contract.id} ${part.id}`).toBeLessThanOrEqual(level)
  }
  expect(checkCompatibility(reference).status, contract.id).not.toBe('incompatible')
  const checks = checkRequirements(reference, HEALTHY, contract.requirements)
  for (const check of checks) expect(check.met, `${contract.id} ${check.label.fr} ${check.value} ${check.target}`).toBe(true)
  expect(runBenchTest('stability', reference, HEALTHY).outcome, contract.id).not.toBe('fail')

  // Coût des pièces neuves de la solution de référence ≤ budget.
  const machine = contract.machine?.build
  const newParts = SLOTS.reduce((total, slot) => {
    if (machine && machine[slot] === contract.reference[slot]) return total
    return total + (reference[slot]?.price ?? 0)
  }, 0)
  expect(newParts, contract.id).toBeLessThanOrEqual(contract.budget)
  expect(contract.labourFee).toBeGreaterThan(0)
  expect(contract.message.fr.length).toBeGreaterThan(40)
  expect(contract.message.en.length).toBeGreaterThan(40)
}

describe('mission d’introduction', () => {
  it('est réalisable avec les composants de départ et l’argent de départ', () => {
    assertFeasible(TUTORIAL_CONTRACT, 1)
    expect(buildCost(resolveBuild(TUTORIAL_CONTRACT.reference))).toBeLessThanOrEqual(STARTING_MONEY)
  })
})

describe('générateur de contrats', () => {
  const xpByLevel = LEVEL_XP.map((xp) => xp)

  it('produit des contrats réalisables dans toutes les catégories débloquées (300 tirages)', () => {
    let generated = 0
    for (let seed = 1; seed <= 15; seed++) {
      for (const xp of xpByLevel) {
        const level = levelFromXp(xp)
        for (const category of CATEGORIES.filter((item) => item.unlockLevel <= level)) {
          const reputation = (seed * 13) % 100
          const contract = generateContract({ seed, counter: seed * 31 + xp, xp, reputation, tools: [] }, category.id)
          if (!contract) continue
          generated += 1
          expect(contract.category).toBe(category.id)
          assertFeasible(contract, level)
        }
      }
    }
    expect(generated).toBeGreaterThan(250)
  })

  it('les pannes produisent des symptômes observables et se corrigent', () => {
    let checked = 0
    for (let seed = 1; seed <= 40; seed++) {
      for (const category of ['thermal', 'stability', 'diagnosis'] as const) {
        const contract = generateContract({ seed, counter: seed, xp: 3000, reputation: 90, tools: [] }, category)
        if (!contract?.machine) continue
        checked += 1
        const faulty = resolveBuild(contract.machine.build)
        if (!isSimulable(faulty)) throw new Error('machine incomplète')
        const condition = conditionFromFaults(contract.machine.faults)
        const results = (['stability', 'stress-cpu', 'memtest', 'inspection', 'psu-tester', 'smart'] as const).map((test) =>
          runBenchTest(test, faulty, condition)
        )
        expect(results.some((result) => result.outcome !== 'pass'), `${contract.id} ${contract.machine.faults.join(',')}`).toBe(true)
        for (const fault of contract.machine.faults) {
          expect(FAULT_SLOT[fault] !== null || FAULT_SERVICE[fault] !== undefined).toBe(true)
        }
        // La machine réparée (référence) n'a plus de problème de stabilité.
        const fixed = resolveBuild(contract.reference)
        if (isSimulable(fixed)) expect(simulate(fixed, 'full').psuTrip).toBe(false)
      }
    }
    expect(checked).toBeGreaterThan(80)
  })

  it('est déterministe pour une même graine', () => {
    const context = { seed: 42, counter: 7, xp: 600, reputation: 30, tools: [] }
    expect(generateContract(context, 'gaming')).toEqual(generateContract(context, 'gaming'))
  })

  it('remplit le tableau avec des catégories débloquées et variées', () => {
    const { board, counter } = refillBoard([], { seed: 5, counter: 1, xp: 0, reputation: 10, tools: [] })
    expect(board).toHaveLength(4)
    expect(counter).toBeGreaterThan(1)
    expect(new Set(board.map((contract) => contract.id)).size).toBe(4)
    for (const contract of board) expect(['gaming', 'office']).toContain(contract.category)
    const extended = refillBoard([], { seed: 5, counter: 1, xp: 3000, reputation: 80, tools: ['workshop-extension'] })
    expect(extended.board).toHaveLength(6)
    expect(new Set(extended.board.map((contract) => contract.category)).size).toBeGreaterThanOrEqual(5)
  })
})
