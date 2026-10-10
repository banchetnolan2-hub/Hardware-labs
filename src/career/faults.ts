import type { LocalizedText } from '@shared/localized'
import { HEALTHY, type MachineCondition, type Slot } from '@simulation/types'
import type { Fault, Service } from './schema'

const t = (fr: string, en: string): LocalizedText => ({ fr, en })

/** Encrassement simulé d'une machine poussiéreuse. */
export const DUSTY_AIRFLOW = 0.35

/** État physique d'une machine selon ses pannes non résolues. */
export function conditionFromFaults(faults: readonly Fault[]): MachineCondition {
  return {
    ...HEALTHY,
    airflowFactor: faults.includes('dust') ? DUSTY_AIRFLOW : 1,
    driedPaste: faults.includes('dried-paste'),
    degradedPsu: faults.includes('degraded-psu'),
    faultyRam: faults.includes('faulty-ram'),
    failingStorage: faults.includes('failing-storage')
  }
}

/** Emplacement dont le remplacement corrige la panne (null : intervention nécessaire). */
export const FAULT_SLOT: Record<Fault, Slot | null> = {
  dust: null,
  'dried-paste': 'cooler',
  'undersized-cooler': 'cooler',
  'degraded-psu': 'psu',
  'undersized-psu': 'psu',
  'faulty-ram': 'ram',
  'failing-storage': 'storage'
}

/** Intervention qui corrige la panne sans changer de pièce. */
export const FAULT_SERVICE: Partial<Record<Fault, Service>> = {
  dust: 'cleaning',
  'dried-paste': 'repaste'
}

/** Ce que le client a remarqué : des symptômes, jamais la cause. */
export const FAULT_SYMPTOM: Record<Fault, LocalizedText> = {
  dust: t('il est devenu très bruyant et tout chauffe, surtout en jeu', 'it has become very loud and everything runs hot, especially in games'),
  'dried-paste': t('il ralentit après quelques minutes d’utilisation intensive, alors qu’il était parfait il y a trois ans', 'it slows down after a few minutes of heavy use, though it was perfect three years ago'),
  'undersized-cooler': t('le ventilateur du processeur hurle et les rendus sont bien plus lents qu’annoncé', 'the CPU fan screams and renders are much slower than advertised'),
  'degraded-psu': t('il s’éteint d’un coup en pleine partie depuis quelques semaines', 'for a few weeks it suddenly powers off mid-game'),
  'undersized-psu': t('il s’éteint net dès que je lance un jeu, depuis que j’ai changé la carte graphique', 'it powers off as soon as I launch a game, ever since I swapped the graphics card'),
  'faulty-ram': t('j’ai des écrans bleus au hasard et certains fichiers sont corrompus', 'I get random blue screens and some files are corrupted'),
  'failing-storage': t('le démarrage prend une éternité et des fichiers disparaissent', 'booting takes forever and files go missing')
}
