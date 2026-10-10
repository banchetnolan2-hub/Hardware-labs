/** Phases de développement (cahier des charges §19). Mis à jour à chaque livraison. */
export const ROADMAP_PHASE_COUNT = 6
export const LAST_COMPLETED_PHASE = 1

export type PhaseStatus = 'done' | 'next' | 'planned'

export function phaseStatus(phase: number): PhaseStatus {
  if (phase <= LAST_COMPLETED_PHASE) return 'done'
  if (phase === LAST_COMPLETED_PHASE + 1) return 'next'
  return 'planned'
}
