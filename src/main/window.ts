import { join } from 'node:path'
import { BrowserWindow, screen, shell } from 'electron'
import type { Settings } from '@shared/settings'
import type { WindowState } from './window-state'
import icon from '../../resources/icon.png?asset'

export const BACKGROUND_COLOR = '#0b0f14'

/** Vérifie qu'une fenêtre enregistrée est encore visible sur un écran connecté. */
function isVisibleOnSomeDisplay(state: WindowState): boolean {
  if (state.x === undefined || state.y === undefined) return false
  return screen.getAllDisplays().some(({ workArea }) => {
    return (
      state.x! + 80 > workArea.x &&
      state.y! + 40 > workArea.y &&
      state.x! < workArea.x + workArea.width - 80 &&
      state.y! < workArea.y + workArea.height - 40
    )
  })
}

export function createMainWindow(settings: Settings, state: WindowState): BrowserWindow {
  const restore = settings.display.rememberWindowBounds
  const position = restore && isVisibleOnSomeDisplay(state) ? { x: state.x, y: state.y } : {}

  const window = new BrowserWindow({
    width: restore ? state.width : 1440,
    height: restore ? state.height : 900,
    ...position,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: BACKGROUND_COLOR,
    title: 'HARDWARE LAB',
    icon,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: BACKGROUND_COLOR, symbolColor: '#c9d4e0', height: 36 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false
    }
  })

  window.setMenu(null)
  if (restore && state.maximized) window.maximize()
  if (settings.display.mode === 'fullscreen') window.setFullScreen(true)

  window.once('ready-to-show', () => window.show())

  // Aucune nouvelle fenêtre ni navigation hors de l'application.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) event.preventDefault()
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return window
}

export function captureWindowState(window: BrowserWindow): WindowState {
  const bounds = window.getNormalBounds()
  return {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    maximized: window.isMaximized()
  }
}
