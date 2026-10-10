import type { LocalizedText } from '@shared/localized'
import type { ToolId } from '@simulation/bench'
import type { ContractCategory, Service } from './schema'

const t = (fr: string, en: string): LocalizedText => ({ fr, en })

/** Expérience totale requise pour atteindre chaque niveau (index 0 = niveau 1). */
export const LEVEL_XP = [0, 200, 550, 1100, 1900] as const
export const MAX_LEVEL = LEVEL_XP.length

export function levelFromXp(xp: number): number {
  let level = 1
  for (let index = 0; index < LEVEL_XP.length; index++) if (xp >= LEVEL_XP[index]!) level = index + 1
  return level
}

/** Progression vers le niveau suivant (0 à 1) ; 1 au niveau maximal. */
export function levelProgress(xp: number): { level: number; current: number; next: number | null; ratio: number } {
  const level = levelFromXp(xp)
  const current = LEVEL_XP[level - 1]!
  const next = level < MAX_LEVEL ? LEVEL_XP[level]! : null
  return { level, current, next, ratio: next === null ? 1 : (xp - current) / (next - current) }
}

export const STARTING_MONEY = 1000
export const STARTING_REPUTATION = 10

/** Catégories de contrats et niveau d'atelier requis. */
export const CATEGORIES: { id: ContractCategory; unlockLevel: number; name: LocalizedText; description: LocalizedText }[] = [
  { id: 'gaming', unlockLevel: 1, name: t('PC gaming', 'Gaming PC'), description: t('Assembler une machine de jeu.', 'Build a gaming machine.') },
  { id: 'office', unlockLevel: 1, name: t('PC bureautique', 'Office PC'), description: t('Machines sobres, fiables et silencieuses.', 'Frugal, reliable, quiet machines.') },
  { id: 'upgrade', unlockLevel: 2, name: t('Amélioration', 'Upgrade'), description: t('Faire évoluer la machine d’un client.', 'Upgrade a customer’s machine.') },
  { id: 'thermal', unlockLevel: 2, name: t('Problème thermique', 'Thermal issue'), description: t('Machine qui chauffe ou ralentit.', 'Machine that overheats or slows down.') },
  { id: 'stability', unlockLevel: 3, name: t('Instabilité', 'Instability'), description: t('Plantages, arrêts, écrans bleus.', 'Crashes, shutdowns, blue screens.') },
  { id: 'diagnosis', unlockLevel: 3, name: t('Diagnostic de panne', 'Fault diagnosis'), description: t('Une ou plusieurs pannes à identifier.', 'One or more faults to track down.') },
  { id: 'high-end', unlockLevel: 4, name: t('Haut de gamme', 'High-end'), description: t('Stations de jeu et de création exigeantes.', 'Demanding gaming and creator rigs.') }
]

export function categoryInfo(id: ContractCategory) {
  return CATEGORIES.find((category) => category.id === id)!
}

/** Difficulté maximale proposée selon la réputation. */
export function maxDifficulty(reputation: number): number {
  return Math.min(5, 1 + Math.floor(reputation / 20))
}

export type ToolInfo = { id: ToolId; price: number; unlockLevel: number; name: LocalizedText; description: LocalizedText }

export const TOOLS: ToolInfo[] = [
  { id: 'psu-tester', price: 120, unlockLevel: 2, name: t('Testeur d’alimentation', 'PSU tester'), description: t('Mesure les tensions sous charge : identifie une alimentation défaillante.', 'Measures voltages under load: spots a failing PSU.') },
  { id: 'storage-suite', price: 90, unlockLevel: 2, name: t('Suite de diagnostic stockage', 'Storage diagnostic suite'), description: t('Lit les compteurs S.M.A.R.T. des disques.', 'Reads drives’ S.M.A.R.T. counters.') },
  { id: 'pro-bench', price: 350, unlockLevel: 3, name: t('Banc de test professionnel', 'Professional test bench'), description: t('Tous les tests prennent 40 % de temps en moins.', 'All tests take 40% less time.') },
  { id: 'workshop-extension', price: 800, unlockLevel: 3, name: t('Agrandissement de l’atelier', 'Workshop extension'), description: t('Six contrats proposés au lieu de quatre, main-d’œuvre +10 %.', 'Six contracts offered instead of four, labour +10%.') }
]

export function toolInfo(id: ToolId): ToolInfo {
  return TOOLS.find((tool) => tool.id === id)!
}

export const PRO_BENCH_TIME_FACTOR = 0.6

export type ServiceInfo = { id: Service; hours: number; cost: number; name: LocalizedText; description: LocalizedText }

export const SERVICES: ServiceInfo[] = [
  { id: 'cleaning', hours: 1, cost: 10, name: t('Nettoyage complet', 'Full cleaning'), description: t('Dépoussiérage des filtres, ventilateurs et radiateurs.', 'Dust off filters, fans and heatsinks.') },
  { id: 'repaste', hours: 1, cost: 8, name: t('Remplacement de la pâte thermique', 'Thermal paste replacement'), description: t('Démonter le refroidisseur et appliquer une pâte neuve.', 'Remove the cooler and apply fresh paste.') }
]

export function serviceInfo(id: Service): ServiceInfo {
  return SERVICES.find((service) => service.id === id)!
}

/** Prix de reprise d'une pièce neuve inutilisée. */
export const RESALE_RATE = 0.6

export function boardSize(tools: readonly ToolId[]): number {
  return tools.includes('workshop-extension') ? 6 : 4
}
