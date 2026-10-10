import type { HardwareLabApi } from '../shared/ipc'

declare global {
  interface Window {
    hardwareLab: HardwareLabApi
  }
}

export {}
