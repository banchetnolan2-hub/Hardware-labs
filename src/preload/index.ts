import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type HardwareLabApi } from '@shared/ipc'

// Seules ces fonctions sont accessibles au renderer : aucun accès générique à ipcRenderer.
const api: HardwareLabApi = {
  getAppInfo: () => ipcRenderer.invoke(IPC.getAppInfo),
  quit: () => ipcRenderer.invoke(IPC.quit),
  openDataFolder: () => ipcRenderer.invoke(IPC.openDataFolder),
  getSettings: () => ipcRenderer.invoke(IPC.getSettings),
  saveSettings: (settings) => ipcRenderer.invoke(IPC.saveSettings, settings)
}

contextBridge.exposeInMainWorld('hardwareLab', api)
