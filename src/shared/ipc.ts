import type { Settings } from './settings'

/** Liste exhaustive des canaux IPC autorisés. */
export const IPC = {
  getAppInfo: 'app:get-info',
  quit: 'app:quit',
  openDataFolder: 'app:open-data-folder',
  getSettings: 'settings:get',
  saveSettings: 'settings:save'
} as const

export type AppInfo = {
  name: string
  version: string
  isPackaged: boolean
  platform: string
  electron: string
  chrome: string
  dataPath: string
}

export type SaveSettingsResult = { ok: true; settings: Settings } | { ok: false; error: string }

/** API exposée au renderer via le preload (`window.hardwareLab`). */
export type HardwareLabApi = {
  getAppInfo: () => Promise<AppInfo>
  quit: () => Promise<void>
  openDataFolder: () => Promise<void>
  getSettings: () => Promise<Settings>
  saveSettings: (settings: Settings) => Promise<SaveSettingsResult>
}
