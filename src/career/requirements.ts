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

/** Évalue les exigences d'un client sur une configuration complète. */
export function checkRequirements(build: CompleteBuild, condition: MachineCondition, requirements: Requirement[]): RequirementCheck[] {
  const perf = performance(build, condition)
  return requirements.map((requirement): RequirementCheck => {
    switch (requirement.kind) {
      case 'fps': {
        const value = perf.fps[requirement.resolution]
        return { requirement, label: t(`Jeu en ${requirement.resolution}`, `Gaming at ${requirement.resolution}`), value: `${value} FPS`, target: `≥ ${requirement.min} FPS`, met: value >= requirement.min, margin: value / requirement.min - 1 }
      }
      case 'office':
        return { requirement, label: t('Indice bureautique', 'Office score'), value: String(perf.officeScore), target: `≥ ${requirement.min}`, met: perf.officeScore >= requirement.min, margin: perf.officeScore / requirement.min - 1 }
      case 'creation':
        return { requirement, label: t('Indice de création', 'Creation score'), value: String(perf.creationScore), target: `≥ ${requirement.min}`, met: perf.creationScore >= requirement.min, margin: perf.creationScore / requirement.min - 1 }
      case 'ram':
        return { requirement, label: t('Mémoire vive', 'Memory'), value: `${build.ram.capacityGb} Go`, target: `≥ ${requirement.minGb} Go`, met: build.ram.capacityGb >= requirement.minGb, margin: build.ram.capacityGb / requirement.minGb - 1 }
      case 'storage':
        return { requirement, label: t('Capacité de stockage', 'Storage capacity'), value: `${build.storage.capacityGb} Go`, target: `≥ ${requirement.minGb} Go`, met: build.storage.capacityGb >= requirement.minGb, margin: build.storage.capacityGb / requirement.minGb - 1 }
      case 'ssd': {
        const ssd = build.storage.kind !== 'hdd'
        return { requirement, label: t('Stockage SSD', 'SSD storage'), value: ssd ? 'SSD' : 'HDD', target: 'SSD', met: ssd, margin: 0 }
      }
      case 'noise': {
        const noise = simulate(build, requirement.load, condition).noiseDb
        const label = requirement.load === 'office' ? t('Bruit en bureautique', 'Noise in office use') : t('Bruit en jeu', 'Noise while gaming')
        return { requirement, label, value: `${noise.toFixed(1)} dB`, target: `≤ ${requirement.maxDb} dB`, met: noise <= requirement.maxDb, margin: requirement.maxDb / noise - 1 }
      }
      case 'power': {
        const watts = simulate(build, requirement.load, condition).wallPower
        const label = requirement.load === 'office' ? t('Consommation en bureautique', 'Office power draw') : t('Consommation en jeu', 'Gaming power draw')
        return { requirement, label, value: `${Math.round(watts)} W`, target: `≤ ${requirement.maxW} W`, met: watts <= requirement.maxW, margin: requirement.maxW / watts - 1 }
      }
    }
  })
}
