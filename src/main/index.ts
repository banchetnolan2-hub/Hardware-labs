import { app, BrowserWindow } from 'electron'
import { registerIpc } from './ipc'
import { SettingsStore } from './storage/settings-store'
import { captureWindowState, createMainWindow } from './window'
import { loadWindowState, saveWindowState } from './window-state'

// Dossier de données isolé pour les tests automatisés (scripts/smoke-test.mjs).
if (process.env['HARDWARE_LAB_USER_DATA']) app.setPath('userData', process.env['HARDWARE_LAB_USER_DATA'])

// Identifiant utilisé par Windows pour les notifications et l'épinglage de la barre des tâches.
app.setAppUserModelId('com.hardwarelab.app')

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null
  const log = (message: string) => console.log(`[hardware-lab] ${message}`)
  const settings = new SettingsStore(app.getPath('userData'), log)

  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  const applyDisplaySettings = () => {
    if (!mainWindow) return
    const fullscreen = settings.value.display.mode === 'fullscreen'
    if (mainWindow.isFullScreen() !== fullscreen) mainWindow.setFullScreen(fullscreen)
  }

  registerIpc({ getWindow: () => mainWindow, settings, onSettingsSaved: applyDisplaySettings })

  // Le renderer ne doit jamais charger de contenu distant ni ouvrir de webview.
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (event) => event.preventDefault())
  })

  void app.whenReady().then(async () => {
    const loaded = await settings.load()
    const windowState = await loadWindowState(app.getPath('userData'))
    mainWindow = createMainWindow(loaded, windowState)

    mainWindow.on('close', () => {
      if (!mainWindow || !settings.value.display.rememberWindowBounds) return
      void saveWindowState(app.getPath('userData'), captureWindowState(mainWindow)).catch((error) =>
        log(`window-state.json non enregistré : ${String(error)}`)
      )
    })
    mainWindow.on('closed', () => {
      mainWindow = null
    })
  })

  app.on('window-all-closed', () => app.quit())
}
