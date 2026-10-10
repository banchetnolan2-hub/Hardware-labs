import type { LocalizedText } from '@shared/localized'

export const SLOTS = ['cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'cooler', 'case'] as const
export type Slot = (typeof SLOTS)[number]

/** La carte graphique est facultative si le processeur possède une partie graphique intégrée. */
export const REQUIRED_SLOTS: readonly Slot[] = ['cpu', 'motherboard', 'ram', 'storage', 'psu', 'cooler', 'case']

export type Socket = 'AX4' | 'AX5' | 'CV17'
export type MemoryType = 'DDR4' | 'DDR5'
export type FormFactor = 'ITX' | 'mATX' | 'ATX'
export type PsuFormFactor = 'ATX' | 'SFX'

type ComponentBase = {
  /** Identifiant stable : ne jamais le modifier, il est référencé par les sauvegardes. */
  id: string
  brand: string
  model: string
  /** Prix d'achat neuf, en euros. */
  price: number
  /** Gamme de 1 (entrée) à 5 (extrême). */
  tier: 1 | 2 | 3 | 4 | 5
  /** Niveau d'atelier requis pour l'acheter. */
  unlockLevel: number
  summary: LocalizedText
}

export type Cpu = ComponentBase & {
  slot: 'cpu'
  socket: Socket
  /** Types de mémoire gérés par le contrôleur (la carte mère fixe le type réellement utilisé). */
  memoryTypes: MemoryType[]
  cores: number
  threads: number
  boostGhz: number
  /** Indice de performance mono-cœur (référence : 100 = processeur de jeu haut de gamme). */
  singleScore: number
  /** Indice de performance multi-cœur. */
  multiScore: number
  /** Puissance consommée à pleine charge, en watts. */
  loadPower: number
  /** Indice graphique de la partie graphique intégrée, 0 si absente. */
  igpuScore: number
}

export type Motherboard = ComponentBase & {
  slot: 'motherboard'
  socket: Socket
  formFactor: FormFactor
  memoryType: MemoryType
  memorySlots: number
  maxMemorySpeed: number
  m2Slots: number
  /** Puissance processeur que les étages d'alimentation peuvent soutenir durablement. */
  vrmLimit: number
}

export type Ram = ComponentBase & {
  slot: 'ram'
  memoryType: MemoryType
  modules: number
  capacityGb: number
  speed: number
}

export type Gpu = ComponentBase & {
  slot: 'gpu'
  /** Images par seconde en 1080p, détails élevés, dans le jeu de référence. */
  perfScore: number
  vramGb: number
  boardPower: number
  lengthMm: number
  /** Nombre de connecteurs PCIe 8 broches requis. */
  pcieConnectors: number
}

export type Storage = ComponentBase & {
  slot: 'storage'
  kind: 'hdd' | 'sata-ssd' | 'nvme'
  capacityGb: number
  readMbs: number
}

export type Psu = ComponentBase & {
  slot: 'psu'
  watts: number
  efficiency: number
  rating: '80+ Bronze' | '80+ Gold' | '80+ Platinum'
  pcieConnectors: number
  formFactor: PsuFormFactor
}

export type Cooler = ComponentBase & {
  slot: 'cooler'
  kind: 'air' | 'aio'
  sockets: Socket[]
  /** Puissance processeur dissipée pour une élévation de 60 °C au-dessus de l'air du boîtier. */
  capacityW: number
  /** Hauteur (ventirad) en mm ; 0 pour un watercooling. */
  heightMm: number
  /** Taille du radiateur (watercooling) en mm ; 0 pour un ventirad. */
  radiatorMm: number
  noiseDb: number
}

export type Case = ComponentBase & {
  slot: 'case'
  formFactors: FormFactor[]
  psuFormFactors: PsuFormFactor[]
  maxGpuLengthMm: number
  maxCoolerHeightMm: number
  radiatorSizes: number[]
  /** Qualité du flux d'air (1 = référence). */
  airflow: number
  fans: number
}

export type Component = Cpu | Motherboard | Ram | Gpu | Storage | Psu | Cooler | Case

export type ComponentOfSlot<S extends Slot> = Extract<Component, { slot: S }>

/** Une configuration : un identifiant de composant par emplacement. */
export type BuildIds = Record<Slot, string | null>

/** Configuration résolue en composants. */
export type Build = { [S in Slot]: ComponentOfSlot<S> | null }

/**
 * État physique d'une machine (pannes et usure). Tout est à `false`/1 pour une machine neuve.
 * Ces valeurs ne sont jamais tirées au hasard pendant une simulation.
 */
export type MachineCondition = {
  /** Encrassement : 1 = propre, 0,35 = filtres et radiateurs obstrués. */
  airflowFactor: number
  /** Pâte thermique sèche : efficacité du refroidissement processeur réduite. */
  driedPaste: boolean
  /** Alimentation vieillissante : ne délivre plus qu'une partie de sa puissance. */
  degradedPsu: boolean
  /** Barrette mémoire défectueuse. */
  faultyRam: boolean
  /** Stockage en fin de vie (secteurs réalloués). */
  failingStorage: boolean
}

export const HEALTHY: MachineCondition = {
  airflowFactor: 1,
  driedPaste: false,
  degradedPsu: false,
  faultyRam: false,
  failingStorage: false
}

export const EMPTY_BUILD: BuildIds = {
  cpu: null,
  motherboard: null,
  ram: null,
  gpu: null,
  storage: null,
  psu: null,
  cooler: null,
  case: null
}
