import { app, BrowserWindow } from 'electron'
import { registerIpc } from './ipc'
import { CareerStore } from './storage/career-store'
import { SettingsStore } from './storage/settings-store'
import { Updater } from './updater'
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

  const updater = new Updater(() => mainWindow, log)
  const career = new CareerStore(app.getPath('userData'), log)
  registerIpc({ getWindow: () => mainWindow, settings, updater, career, onSettingsSaved: applyDisplaySettings })

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

    // Vérification automatique, après l'introduction, si le joueur l'a activée.
    if (loaded.updates.autoCheck) setTimeout(() => void updater.check(), 8000)
  })

  app.on('window-all-closed', () => app.quit())
}
