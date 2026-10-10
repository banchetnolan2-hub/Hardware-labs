import { getComponentOfSlot } from './catalog'
import { HEALTHY, SLOTS, type Build, type BuildIds, type MachineCondition } from './types'

/*
 * Moteur de simulation de HARDWARE LAB.
 *
 * Toutes les grandeurs sont calculées à partir des caractéristiques des composants et de
 * l'état de la machine. Aucune valeur aléatoire : une même configuration donne toujours
 * les mêmes résultats. Les constantes ci-dessous sont les seuls paramètres d'équilibrage.
 */

/** Température de la pièce (°C). */
export const AMBIENT_C = 24
/** Température maximale du processeur avant réduction de fréquence (°C). */
export const CPU_TJMAX = 95
/** Température à laquelle la carte graphique réduit sa fréquence (°C). */
export const GPU_TEMP_LIMIT = 88
/** Élévation de température de l'air du boîtier par watt dissipé, pour un flux d'air de 1. */
const CASE_RISE_PER_W = 0.022
/** Élévation du processeur au-dessus de l'air du boîtier quand il dissipe toute la capacité du refroidisseur. */
const COOLER_RATED_RISE = 60
/** Élévation de la carte graphique au-dessus de l'air du boîtier à sa puissance nominale (son refroidisseur est dimensionné pour elle). */
const GPU_RATED_RISE = 46
/** Pic transitoire de consommation des cartes graphiques (fraction de leur puissance). */
const GPU_TRANSIENT = 0.35
/** Fraction de puissance encore délivrée par une alimentation vieillissante. */
const DEGRADED_PSU_FACTOR = 0.6
/** Efficacité du refroidisseur avec une pâte thermique sèche. */
const DRIED_PASTE_FACTOR = 0.45
/** Charge d'alimentation au-delà de laquelle la marge est jugée insuffisante. */
export const PSU_COMFORT_LOAD = 0.8

export type LoadProfile = 'idle' | 'office' | 'gaming' | 'cpu' | 'gpu' | 'full'

/** Taux d'utilisation du processeur et de la carte graphique pour chaque charge. */
export const LOAD_UTILISATION: Record<LoadProfile, { cpu: number; gpu: number }> = {
  idle: { cpu: 0.05, gpu: 0.03 },
  office: { cpu: 0.2, gpu: 0.06 },
  gaming: { cpu: 0.6, gpu: 1 },
  cpu: { cpu: 1, gpu: 0.03 },
  gpu: { cpu: 0.12, gpu: 1 },
  full: { cpu: 1, gpu: 1 }
}

export function resolveBuild(ids: BuildIds): Build {
  const build = {} as Record<string, unknown>
  for (const slot of SLOTS) build[slot] = getComponentOfSlot(slot, ids[slot])
  return build as Build
}

export type CompleteBuild = { [K in keyof Build]: NonNullable<Build[K]> } | (Omit<{ [K in keyof Build]: NonNullable<Build[K]> }, 'gpu'> & { gpu: null })

/** Une configuration est simulable si tous les emplacements obligatoires sont remplis. */
export function isSimulable(build: Build): build is CompleteBuild {
  return !!(build.cpu && build.motherboard && build.ram && build.storage && build.psu && build.cooler && build.case)
}

export type Snapshot = {
  load: LoadProfile
  cpuPower: number
  gpuPower: number
  basePower: number
  /** Puissance continue demandée à l'alimentation (W). */
  systemPower: number
  /** Pic transitoire (W). */
  peakPower: number
  /** Consommation à la prise (W). */
  wallPower: number
  /** Puissance réellement disponible (W). */
  psuCapacity: number
  /** systemPower / psuCapacity. */
  psuLoad: number
  caseTemp: number
  cpuTemp: number
  gpuTemp: number | null
  /** Facteur de performance processeur (1 = pleine vitesse) après limites thermiques et électriques. */
  cpuScale: number
  /** Facteur de performance graphique (1 = pleine vitesse). */
  gpuScale: number
  cpuThrottled: boolean
  vrmLimited: boolean
  gpuThrottled: boolean
  noiseDb: number
  /** L'alimentation coupe la machine (charge continue ou pic transitoire trop élevé). */
  psuTrip: boolean
}

export function basePower(build: CompleteBuild): number {
  const ram = (build.ram.memoryType === 'DDR5' ? 4 : 3) * build.ram.modules
  const storage = build.storage.kind === 'hdd' ? 7 : build.storage.kind === 'nvme' ? 5 : 3
  const pump = build.cooler.kind === 'aio' ? 5 : 0
  return 30 + ram + storage + 2.5 * build.case.fans + pump
}

function combineDb(levels: number[]): number {
  const sum = levels.reduce((total, level) => total + 10 ** (level / 10), 0)
  return 10 * Math.log10(sum)
}

/** État stable d'une configuration sous une charge donnée. */
export function simulate(build: CompleteBuild, load: LoadProfile, condition: MachineCondition = HEALTHY): Snapshot {
  const util = LOAD_UTILISATION[load]
  const base = basePower(build)
  const cpuDemand = 12 + (build.cpu.loadPower - 12) * util.cpu
  const vrmCap = Math.min(cpuDemand, build.motherboard.vrmLimit)
  const gpuDemand = build.gpu ? 14 + (build.gpu.boardPower - 14) * util.gpu : 0
  const coolerCapacity = build.cooler.capacityW * (condition.driedPaste ? DRIED_PASTE_FACTOR : 1)
  const airflow = build.case.airflow * condition.airflowFactor

  // Point fixe : la réduction de fréquence diminue la chaleur, donc la température du boîtier.
  let cpuPower = vrmCap
  let gpuPower = gpuDemand
  let caseTemp = AMBIENT_C
  for (let i = 0; i < 6; i++) {
    caseTemp = AMBIENT_C + ((cpuPower + gpuPower + base) * CASE_RISE_PER_W) / airflow
    const cpuSustainable = Math.max(5, ((CPU_TJMAX - caseTemp) * coolerCapacity) / COOLER_RATED_RISE)
    cpuPower = Math.min(vrmCap, cpuSustainable)
    if (build.gpu) {
      const gpuSustainable = Math.max(10, ((GPU_TEMP_LIMIT - caseTemp) / GPU_RATED_RISE) * build.gpu.boardPower)
      gpuPower = Math.min(gpuDemand, gpuSustainable)
    }
  }

  const cpuTemp = caseTemp + (cpuPower / coolerCapacity) * COOLER_RATED_RISE
  const gpuTemp = build.gpu ? caseTemp + (gpuPower / build.gpu.boardPower) * GPU_RATED_RISE : null
  // La performance varie moins vite que la puissance (tension et fréquence diminuent ensemble).
  const cpuScale = cpuDemand > 0 ? Math.min(1, (cpuPower / cpuDemand) ** 0.45) : 1
  const gpuScale = gpuDemand > 0 ? Math.min(1, (gpuPower / gpuDemand) ** 0.45) : 1

  const systemPower = cpuPower + gpuPower + base
  const peakPower = systemPower + gpuPower * GPU_TRANSIENT
  const psuCapacity = build.psu.watts * (condition.degradedPsu ? DEGRADED_PSU_FACTOR : 1)
  const psuLoad = systemPower / psuCapacity

  const noiseSources = [
    build.cooler.noiseDb - 8 + 14 * Math.min(1, cpuPower / coolerCapacity),
    20 + 15 * Math.min(1, psuLoad),
    ...Array.from({ length: build.case.fans }, () => 22 + 4 * Math.min(1, (caseTemp - AMBIENT_C) / 15))
  ]
  if (build.gpu) noiseSources.push(24 + 16 * Math.min(1.3, gpuPower / 300))
  if (build.storage.kind === 'hdd') noiseSources.push(26)

  return {
    load,
    cpuPower,
    gpuPower,
    basePower: base,
    systemPower,
    peakPower,
    wallPower: systemPower / build.psu.efficiency,
    psuCapacity,
    psuLoad,
    caseTemp,
    cpuTemp,
    gpuTemp,
    cpuScale,
    gpuScale,
    cpuThrottled: cpuPower < vrmCap - 0.5,
    vrmLimited: vrmCap < cpuDemand - 0.5,
    gpuThrottled: !!build.gpu && gpuPower < gpuDemand - 0.5,
    noiseDb: combineDb(noiseSources),
    psuTrip: peakPower > psuCapacity
  }
}

export type Resolution = '1080p' | '1440p' | '4k'
const RESOLUTION_FACTOR: Record<Resolution, number> = { '1080p': 1, '1440p': 0.68, '4k': 0.38 }

export type Performance = {
  fps: Record<Resolution, number>
  /** Composant qui limite les images par seconde en 1080p. */
  gamingBottleneck: 'cpu' | 'gpu'
  /** Indice bureautique, 0 à 100. */
  officeScore: number
  /** Indice de création (rendu, montage, compilation). */
  creationScore: number
  effectiveMemorySpeed: number
}

/** Effet de la mémoire : capacité, double canal et fréquence réellement atteinte. */
function memoryFactor(build: CompleteBuild): { factor: number; speed: number } {
  const speed = Math.min(build.ram.speed, build.motherboard.maxMemorySpeed)
  const capacity = build.ram.capacityGb >= 16 ? 1 : build.ram.capacityGb >= 8 ? 0.82 : 0.6
  const channels = build.ram.modules >= 2 ? 1 : 0.88
  const frequency = 1 + ((speed - 3200) / 3200) * 0.06
  return { factor: capacity * channels * frequency, speed }
}

/** Performances simulées, en tenant compte des limites thermiques et électriques. */
export function performance(build: CompleteBuild, condition: MachineCondition = HEALTHY): Performance {
  const gaming = simulate(build, 'gaming', condition)
  const cpuLoad = simulate(build, 'cpu', condition)
  const memory = memoryFactor(build)

  const fps = {} as Record<Resolution, number>
  const cpuCap = (build.cpu.singleScore * 1.6 + Math.min(build.cpu.cores, 8) * 3) * gaming.cpuScale
  let gpu1080 = 0
  for (const resolution of Object.keys(RESOLUTION_FACTOR) as Resolution[]) {
    const raw = build.gpu ? build.gpu.perfScore * gaming.gpuScale : build.cpu.igpuScore
    const vramPenalty =
      build.gpu && resolution === '4k' && build.gpu.vramGb < 12 ? 0.82 : build.gpu && resolution === '1440p' && build.gpu.vramGb < 8 ? 0.9 : 1
    const gpuFps = raw * RESOLUTION_FACTOR[resolution] * vramPenalty
    if (resolution === '1080p') gpu1080 = gpuFps
    fps[resolution] = Math.round(Math.min(gpuFps, cpuCap) * memory.factor)
  }

  const storageFactor = build.storage.kind === 'nvme' ? 1 : build.storage.kind === 'sata-ssd' ? 0.85 : 0.35
  const officeRaw = build.cpu.singleScore * 0.5 + storageFactor * 32 + Math.min(build.ram.capacityGb, 16) * 1.1 + (build.ram.modules >= 2 ? 3 : 0)
  const creationRaw =
    build.cpu.multiScore * cpuLoad.cpuScale * 0.75 * memory.factor + (Math.min(build.ram.capacityGb, 64) / 64) * 25 + (build.gpu ? build.gpu.perfScore * 0.06 : 0)

  return {
    fps,
    gamingBottleneck: cpuCap < gpu1080 ? 'cpu' : 'gpu',
    officeScore: Math.round(Math.min(100, officeRaw)),
    creationScore: Math.round(creationRaw),
    effectiveMemorySpeed: memory.speed
  }
}

/** Coût total des composants d'une configuration. */
export function buildCost(build: Build): number {
  return SLOTS.reduce((total, slot) => total + (build[slot]?.price ?? 0), 0)
}
