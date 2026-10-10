import type { BuildIds } from './types'

/** Configurations de référence partagées par les tests. */
export const GAMING_BUILD: BuildIds = {
  cpu: 'cpu-axion-a5-5600',
  motherboard: 'mb-strata-a420m',
  ram: 'ram-kinetik-16-ddr4',
  gpu: 'gpu-nebula-rx-6600',
  storage: 'sto-datalith-nvme-1tb',
  psu: 'psu-voltis-550b',
  cooler: 'cool-glacier-t120',
  case: 'case-atrium-m'
}

export const HIGH_END_BUILD: BuildIds = {
  cpu: 'cpu-axion-a9-7950',
  motherboard: 'mb-strata-x670e',
  ram: 'ram-kinetik-64-ddr5',
  gpu: 'gpu-vektor-rtx-4090',
  storage: 'sto-datalith-nvme-2tb',
  psu: 'psu-voltis-1000p',
  cooler: 'cool-frostline-aio360',
  case: 'case-monolith-mesh'
}
