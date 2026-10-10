import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type HardwareLabApi } from '@shared/ipc'
import type { UpdateStatus } from '@shared/updater'

// Seules ces fonctions sont accessibles au renderer : aucun accès générique à ipcRenderer.
const api: HardwareLabApi = {
  getAppInfo: () => ipcRenderer.invoke(IPC.getAppInfo),
  quit: () => ipcRenderer.invoke(IPC.quit),
  openDataFolder: () => ipcRenderer.invoke(IPC.openDataFolder),
  getSettings: () => ipcRenderer.invoke(IPC.getSettings),
  saveSettings: (settings) => ipcRenderer.invoke(IPC.saveSettings, settings),
  getUpdateStatus: () => ipcRenderer.invoke(IPC.updaterGetStatus),
  checkForUpdates: () => ipcRenderer.invoke(IPC.updaterCheck),
  downloadUpdate: () => ipcRenderer.invoke(IPC.updaterDownload),
  installUpdate: () => ipcRenderer.invoke(IPC.updaterInstall),
  onUpdateStatus: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, status: UpdateStatus) => listener(status)
    ipcRenderer.on(IPC.updaterStatus, handler)
    return () => ipcRenderer.removeListener(IPC.updaterStatus, handler)
  }
}

contextBridge.exposeInMainWorld('hardwareLab', api)
