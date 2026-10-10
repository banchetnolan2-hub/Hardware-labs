import type { LocalizedText } from '@shared/localized'
import { performance, simulate, type CompleteBuild } from '@simulation/simulate'
import type { MachineCondition } from '@simulation/types'
import type { Requirement } from './schema'

export type RequirementCheck = {
  requirement: Requirement
  label: LocalizedText
  /** Valeur mesurée, mise en forme. */
  value: string
  target: string
  met: boolean
  /** Marge relative (positive si l'objectif est dépassé). */
  margin: number
}

const t = (fr: string, en: string): LocalizedText => ({ fr, en })

/** Libellé et objectif d'une exigence, sans configuration. */
export function describeRequirement(requirement: Requirement): { label: LocalizedText; target: string } {
  switch (requirement.kind) {
    case 'fps':
      return { label: t(`Jeu en ${requirement.resolution}`, `Gaming at ${requirement.resolution}`), target: `≥ ${requirement.min} FPS` }
    case 'office':
      return { label: t('Indice bureautique', 'Office score'), target: `≥ ${requirement.min}` }
    case 'creation':
      return { label: t('Indice de création', 'Creation score'), target: `≥ ${requirement.min}` }
    case 'ram':
      return { label: t('Mémoire vive', 'Memory'), target: `≥ ${requirement.minGb} Go` }
    case 'storage':
      return { label: t('Capacité de stockage', 'Storage capacity'), target: `≥ ${requirement.minGb} Go` }
    case 'ssd':
      return { label: t('Stockage SSD', 'SSD storage'), target: 'SSD' }
    case 'noise':
      return {
        label: requirement.load === 'office' ? t('Bruit en bureautique', 'Noise in office use') : t('Bruit en jeu', 'Noise while gaming'),
        target: `≤ ${requirement.maxDb} dB`
      }
    case 'power':
      return {
        label: requirement.load === 'office' ? t('Consommation en bureautique', 'Office power draw') : t('Consommation en jeu', 'Gaming power draw'),
        target: `≤ ${requirement.maxW} W`
      }
  }
}

function measure(build: CompleteBuild, condition: MachineCondition, requirement: Requirement): { value: string; met: boolean; margin: number } {
  switch (requirement.kind) {
    case 'fps': {
      const value = performance(build, condition).fps[requirement.resolution]
      return { value: `${value} FPS`, met: value >= requirement.min, margin: value / requirement.min - 1 }
    }
    case 'office': {
      const value = performance(build, condition).officeScore
      return { value: String(value), met: value >= requirement.min, margin: value / requirement.min - 1 }
    }
    case 'creation': {
      const value = performance(build, condition).creationScore
      return { value: String(value), met: value >= requirement.min, margin: value / requirement.min - 1 }
    }
    case 'ram':
      return { value: `${build.ram.capacityGb} Go`, met: build.ram.capacityGb >= requirement.minGb, margin: build.ram.capacityGb / requirement.minGb - 1 }
    case 'storage':
      return { value: `${build.storage.capacityGb} Go`, met: build.storage.capacityGb >= requirement.minGb, margin: build.storage.capacityGb / requirement.minGb - 1 }
    case 'ssd': {
      const ssd = build.storage.kind !== 'hdd'
      return { value: ssd ? 'SSD' : 'HDD', met: ssd, margin: 0 }
    }
    case 'noise': {
      const noise = simulate(build, requirement.load, condition).noiseDb
      return { value: `${noise.toFixed(1)} dB`, met: noise <= requirement.maxDb, margin: requirement.maxDb / noise - 1 }
    }
    case 'power': {
      const watts = simulate(build, requirement.load, condition).wallPower
      return { value: `${Math.round(watts)} W`, met: watts <= requirement.maxW, margin: requirement.maxW / watts - 1 }
    }
  }
}

/** Évalue les exigences d'un client sur une configuration complète. */
export function checkRequirements(build: CompleteBuild, condition: MachineCondition, requirements: Requirement[]): RequirementCheck[] {
  return requirements.map((requirement) => ({ requirement, ...describeRequirement(requirement), ...measure(build, condition, requirement) }))
}
