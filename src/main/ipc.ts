import { app, ipcMain, shell, type BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import { IPC, type AppInfo, type SaveSettingsResult } from '@shared/ipc'
import type { SettingsStore } from './storage/settings-store'
import type { Updater } from './updater'

type IpcContext = {
  getWindow: () => BrowserWindow | null
  settings: SettingsStore
  updater: Updater
  onSettingsSaved: () => void
}

/** N'accepte que les messages provenant de la fenêtre principale et de l'application elle-même. */
function isTrustedSender(event: IpcMainInvokeEvent, window: BrowserWindow | null): boolean {
  if (!window || event.sender !== window.webContents) return false
  const url = event.senderFrame?.url ?? ''
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  return url.startsWith('file://') || (!!devUrl && url.startsWith(devUrl))
}

export function registerIpc({ getWindow, settings, updater, onSettingsSaved }: IpcContext): void {
  const handle = <T>(channel: string, handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => T) => {
    ipcMain.handle(channel, (event, ...args) => {
      if (!isTrustedSender(event, getWindow())) throw new Error('Expéditeur IPC non autorisé')
      return handler(event, ...args)
    })
  }

  handle(IPC.getAppInfo, (): AppInfo => ({
    name: app.getName(),
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    platform: process.platform,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    dataPath: app.getPath('userData')
  }))

  handle(IPC.quit, () => app.quit())

  handle(IPC.openDataFolder, async () => {
    await shell.openPath(app.getPath('userData'))
  })

  handle(IPC.getSettings, () => settings.value)

  handle(IPC.saveSettings, async (_event, candidate): Promise<SaveSettingsResult> => {
    try {
      const saved = await settings.save(candidate)
      onSettingsSaved()
      return { ok: true, settings: saved }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  handle(IPC.updaterGetStatus, () => updater.current)
  handle(IPC.updaterCheck, () => updater.check())
  handle(IPC.updaterDownload, () => updater.download())
  handle(IPC.updaterInstall, () => updater.install())
}
