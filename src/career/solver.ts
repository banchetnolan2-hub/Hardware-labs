import { componentsOfSlot } from '@simulation/catalog'
import { checkCompatibility } from '@simulation/compatibility'
import { PSU_COMFORT_LOAD, buildCost, isSimulable, resolveBuild, simulate } from '@simulation/simulate'
import type { BuildIds, ComponentOfSlot, Cpu, Gpu, Psu, Slot } from '@simulation/types'

/*
 * Construction automatique de configurations valides. Utilisé par le générateur de contrats
 * pour produire une solution de référence : un contrat n'est proposé que si cette solution
 * existe avec les composants débloqués, respecte le budget et passe le test de stabilité.
 */

export function availableComponents<S extends Slot>(slot: S, level: number): ComponentOfSlot<S>[] {
  return componentsOfSlot(slot)
    .filter((component) => component.unlockLevel <= level)
    .sort((a, b) => a.price - b.price)
}

export type CompleteOptions = { level: number; minRamGb?: number; minStorageGb?: number; ssd?: boolean }

/** Alimentation la moins chère qui alimente la configuration avec une marge confortable. */
export function cheapestPsu(ids: BuildIds, level: number): Psu | null {
  for (const psu of availableComponents('psu', level)) {
    const build = resolveBuild({ ...ids, psu: psu.id })
    if (!isSimulable(build)) return null
    if (checkCompatibility(build).status !== 'compatible') continue
    const full = simulate(build, 'full')
    if (!full.psuTrip && full.psuLoad <= PSU_COMFORT_LOAD) return psu
  }
  return null
}

/** Configuration complète la moins chère autour d'un processeur et d'une carte graphique. */
export function completeBuild(cpu: Cpu, gpu: Gpu | null, options: CompleteOptions): BuildIds | null {
  const { level } = options
  const minRam = options.minRamGb ?? 8
  const minStorage = options.minStorageGb ?? 250
  let best: { ids: BuildIds; cost: number } | null = null

  for (const motherboard of availableComponents('motherboard', level)) {
    if (motherboard.socket !== cpu.socket || !cpu.memoryTypes.includes(motherboard.memoryType)) continue
    const ram = availableComponents('ram', level).find(
      (candidate) =>
        candidate.memoryType === motherboard.memoryType &&
        candidate.modules <= motherboard.memorySlots &&
        candidate.capacityGb >= minRam &&
        candidate.speed <= motherboard.maxMemorySpeed
    )
    const storage = availableComponents('storage', level).find(
      (candidate) => candidate.capacityGb >= minStorage && (!options.ssd || candidate.kind !== 'hdd') && (candidate.kind !== 'nvme' || motherboard.m2Slots > 0)
    )
    if (!ram || !storage) continue
    for (const cooler of availableComponents('cooler', level)) {
      if (!cooler.sockets.includes(cpu.socket) || cooler.capacityW < cpu.loadPower * 0.9) continue
      for (const pcCase of availableComponents('case', level)) {
        const partial: BuildIds = {
          cpu: cpu.id,
          motherboard: motherboard.id,
          ram: ram.id,
          gpu: gpu?.id ?? null,
          storage: storage.id,
          psu: null,
          cooler: cooler.id,
          case: pcCase.id
        }
        const cost = buildCost(resolveBuild(partial))
        if (best && cost >= best.cost) continue
        const psu = cheapestPsu(partial, level)
        if (!psu) continue
        const ids = { ...partial, psu: psu.id }
        const total = cost + psu.price
        if (!best || total < best.cost) best = { ids, cost: total }
      }
    }
  }
  return best?.ids ?? null
}
