import { z } from 'zod'

/*
 * Format de la sauvegarde de carrière. Source de vérité des types de la carrière :
 * l'interface n'importe que les types (`import type`), la validation zod s'exécute dans le
 * processus principal à chaque lecture et écriture.
 */

export const CAREER_SCHEMA_VERSION = 1

const Localized = z.object({ fr: z.string(), en: z.string() })
const Slot = z.enum(['cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'cooler', 'case'])
const ComponentId = z.string().min(1).max(64)
const BuildIds = z.object({
  cpu: ComponentId.nullable(),
  motherboard: ComponentId.nullable(),
  ram: ComponentId.nullable(),
  gpu: ComponentId.nullable(),
  storage: ComponentId.nullable(),
  psu: ComponentId.nullable(),
  cooler: ComponentId.nullable(),
  case: ComponentId.nullable()
})
const Money = z.number().int().min(-1_000_000).max(100_000_000)

export const CategorySchema = z.enum(['office', 'gaming', 'high-end', 'upgrade', 'thermal', 'stability', 'diagnosis'])
export const FaultSchema = z.enum(['dust', 'dried-paste', 'undersized-cooler', 'degraded-psu', 'undersized-psu', 'faulty-ram', 'failing-storage'])
export const ToolSchema = z.enum(['psu-tester', 'storage-suite', 'pro-bench', 'workshop-extension'])
export const BenchTestSchema = z.enum(['inspection', 'stress-cpu', 'stress-gpu', 'stability', 'memtest', 'psu-tester', 'smart'])
export const ServiceSchema = z.enum(['cleaning', 'repaste'])

export const RequirementSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('fps'), resolution: z.enum(['1080p', '1440p', '4k']), min: z.number().positive() }),
  z.object({ kind: z.literal('office'), min: z.number().positive() }),
  z.object({ kind: z.literal('creation'), min: z.number().positive() }),
  z.object({ kind: z.literal('ram'), minGb: z.number().positive() }),
  z.object({ kind: z.literal('storage'), minGb: z.number().positive() }),
  z.object({ kind: z.literal('ssd') }),
  z.object({ kind: z.literal('noise'), maxDb: z.number().positive(), load: z.enum(['office', 'gaming']) }),
  z.object({ kind: z.literal('power'), maxW: z.number().positive(), load: z.enum(['office', 'gaming']) })
])

export const ContractSchema = z.object({
  id: z.string().min(1).max(64),
  category: CategorySchema,
  difficulty: z.number().int().min(1).max(5),
  client: z.object({ name: z.string().max(80), company: z.string().max(80).optional() }),
  title: Localized,
  message: Localized,
  requirements: z.array(RequirementSchema).max(10),
  /** Montant maximal des pièces que le client accepte de payer. */
  budget: Money.nonnegative(),
  /** Main-d'œuvre convenue, payée à la livraison selon la satisfaction. */
  labourFee: Money.nonnegative(),
  hoursAllowed: z.number().positive().max(100),
  /** Machine apportée par le client (amélioration, diagnostic). */
  machine: z.object({ build: BuildIds, faults: z.array(FaultSchema).max(4) }).optional(),
  /** Solution de référence prouvant que le contrat est réalisable (non affichée). */
  reference: BuildIds
})

const PartOrigin = z.enum(['client', 'workshop']).nullable()

export const BenchRecordSchema = z.object({
  test: BenchTestSchema,
  buildKey: z.string().max(400),
  outcome: z.enum(['pass', 'warning', 'fail']),
  hours: z.number().nonnegative(),
  findings: z.array(Localized).max(10)
})

export const JobSchema = z.object({
  contract: ContractSchema,
  build: BuildIds,
  origins: z.object({
    cpu: PartOrigin,
    motherboard: PartOrigin,
    ram: PartOrigin,
    gpu: PartOrigin,
    storage: PartOrigin,
    psu: PartOrigin,
    cooler: PartOrigin,
    case: PartOrigin
  }),
  /** Pièces du client retirées de sa machine (rendues à la livraison). */
  clientSpares: z.array(ComponentId).max(16),
  /** Emplacements dont la pièce d'origine a été remplacée. */
  replacedSlots: z.array(Slot).max(8),
  faultsRemaining: z.array(FaultSchema).max(4),
  services: z.array(z.object({ service: ServiceSchema, productive: z.boolean() })).max(20),
  hoursUsed: z.number().nonnegative().max(1000),
  bench: z.array(BenchRecordSchema).max(200)
})

export const HistorySchema = z.object({
  contractId: z.string(),
  category: CategorySchema,
  difficulty: z.number().int().min(1).max(5),
  title: Localized,
  clientName: z.string(),
  day: z.number().int().nonnegative(),
  outcome: z.enum(['delivered', 'abandoned']),
  stars: z.number().int().min(0).max(5),
  score: z.number().min(0).max(100),
  payout: Money,
  partsCost: Money,
  reputationDelta: z.number(),
  xpGained: z.number().int().nonnegative(),
  faultsMissed: z.number().int().nonnegative()
})

export const LedgerSchema = z.object({
  day: z.number().int().nonnegative(),
  kind: z.enum(['purchase', 'sale', 'payout', 'tool', 'service']),
  amount: Money,
  label: Localized
})

export const CareerSchema = z.object({
  schemaVersion: z.literal(CAREER_SCHEMA_VERSION),
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40),
  seed: z.number().int().nonnegative(),
  contractCounter: z.number().int().nonnegative(),
  day: z.number().int().nonnegative(),
  money: Money,
  reputation: z.number().min(0).max(100),
  xp: z.number().int().nonnegative(),
  tools: z.array(ToolSchema).max(10),
  inventory: z.record(ComponentId, z.number().int().min(0).max(999)),
  board: z.array(ContractSchema).max(10),
  active: JobSchema.nullable(),
  history: z.array(HistorySchema).max(1000),
  ledger: z.array(LedgerSchema).max(500),
  stats: z.object({
    delivered: z.number().int().nonnegative(),
    abandoned: z.number().int().nonnegative(),
    earned: Money.nonnegative(),
    spent: Money.nonnegative()
  })
})

export type Career = z.infer<typeof CareerSchema>
export type Contract = z.infer<typeof ContractSchema>
export type ContractCategory = z.infer<typeof CategorySchema>
export type Requirement = z.infer<typeof RequirementSchema>
export type Fault = z.infer<typeof FaultSchema>
export type Job = z.infer<typeof JobSchema>
export type BenchRecord = z.infer<typeof BenchRecordSchema>
export type HistoryEntry = z.infer<typeof HistorySchema>
export type LedgerEntry = z.infer<typeof LedgerSchema>
export type Service = z.infer<typeof ServiceSchema>
