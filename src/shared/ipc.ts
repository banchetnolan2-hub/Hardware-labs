import type { Settings } from './settings'
import type { UpdateStatus } from './updater'
import type { Career } from '../career/schema'

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
  careerLoad: 'career:load',
  careerSave: 'career:save',
  careerArchive: 'career:archive',
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

export type CareerLoadResult = { status: 'none' } | { status: 'ok' | 'recovered'; career: Career }
export type SaveCareerResult = { ok: true } | { ok: false; error: string }

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
  loadCareer: () => Promise<CareerLoadResult>
  saveCareer: (career: Career) => Promise<SaveCareerResult>
  archiveCareer: () => Promise<void>
  /** Abonnement aux changements d'état ; renvoie la fonction de désabonnement. */
  onUpdateStatus: (listener: (status: UpdateStatus) => void) => () => void
}
