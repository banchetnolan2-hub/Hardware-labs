import { create } from 'zustand'
import type { AppInfo } from '@shared/ipc'
import type { Settings } from '@shared/settings'
import { DEFAULT_SETTINGS } from '@shared/settings-defaults'
import type { UpdateStatus } from '@shared/updater'

export type Route = 'menu' | 'settings' | 'release-notes'
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type AppState = {
  ready: boolean
  route: Route
  settings: Settings
  appInfo: AppInfo | null
  saveStatus: SaveStatus
  updateStatus: UpdateStatus
  init: () => Promise<void>
  navigate: (route: Route) => void
  updateSettings: (update: (draft: Settings) => Settings) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  route: 'menu',
  settings: DEFAULT_SETTINGS,
  appInfo: null,
  saveStatus: 'idle',
  updateStatus: { state: 'idle' },

  init: async () => {
    window.hardwareLab.onUpdateStatus((updateStatus) => set({ updateStatus }))
    const [settings, appInfo, updateStatus] = await Promise.all([
      window.hardwareLab.getSettings(),
      window.hardwareLab.getAppInfo(),
      window.hardwareLab.getUpdateStatus()
    ])
    set({ settings, appInfo, updateStatus, ready: true })
  },

  navigate: (route) => set({ route }),

  updateSettings: async (update) => {
    const previous = get().settings
    const next = update(structuredClone(previous))
    set({ settings: next, saveStatus: 'saving' })
    const result = await window.hardwareLab.saveSettings(next)
    if (result.ok) {
      set({ settings: result.settings, saveStatus: 'saved' })
    } else {
      console.error('Paramètres refusés :', result.error)
      set({ settings: previous, saveStatus: 'error' })
    }
  }
}))
