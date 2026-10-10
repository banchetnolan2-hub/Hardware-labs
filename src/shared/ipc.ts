import type { Settings } from './settings'
import type { UpdateStatus } from './updater'

/** Liste exhaustive des canaux IPC autorisés. */
export const IPC = {
  getAppInfo: 'app:get-info',
  quit: 'app:quit',
  openDataFolder: 'app:open-data-folder',
  getSettings: 'settings:get',
  saveSettings: 'settings:save',
  updaterGetStatus: 'updater:get-status',
  updaterCheck: 'updater:check',
  updaterDownload: 'updater:download',
  updaterInstall: 'updater:install',
  /** Événement main → renderer. */
  updaterStatus: 'updater:status'
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
  getUpdateStatus: () => Promise<UpdateStatus>
  checkForUpdates: () => Promise<UpdateStatus>
  downloadUpdate: () => Promise<UpdateStatus>
  installUpdate: () => Promise<void>
  /** Abonnement aux changements d'état ; renvoie la fonction de désabonnement. */
  onUpdateStatus: (listener: (status: UpdateStatus) => void) => () => void
}
