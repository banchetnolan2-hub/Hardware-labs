import { app, type BrowserWindow } from 'electron'
import electronUpdater, { type ProgressInfo, type UpdateInfo } from 'electron-updater'
import { IPC } from '@shared/ipc'
import { classifyUpdateError, type UpdateStatus } from '@shared/updater'

const { autoUpdater } = electronUpdater

/**
 * Mises à jour via GitHub Releases (configuration « publish » d'electron-builder, copiée dans
 * app-update.yml à l'empaquetage). Le dépôt est public : aucun jeton n'est embarqué.
 * Le téléchargement ne démarre qu'à la demande du joueur ; une mise à jour téléchargée est
 * installée au redémarrage demandé ou, à défaut, à la fermeture du jeu.
 */
export class Updater {
  private status: UpdateStatus = app.isPackaged ? { state: 'idle' } : { state: 'unsupported', reason: 'development' }

  constructor(
    private readonly getWindow: () => BrowserWindow | null,
    private readonly log: (message: string) => void
  ) {
    if (!app.isPackaged) return
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.allowPrerelease = false
    autoUpdater.logger = { info: log, warn: log, error: log, debug: () => {} }

    autoUpdater.on('checking-for-update', () => this.set({ state: 'checking' }))
    autoUpdater.on('update-not-available', () => this.set({ state: 'not-available', checkedAt: Date.now() }))
    autoUpdater.on('update-available', (info: UpdateInfo) =>
      this.set({ state: 'available', version: info.version, releaseDate: info.releaseDate })
    )
    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      const version = 'version' in this.status ? this.status.version : ''
      this.set({
        state: 'downloading',
        version,
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond
      })
    })
    autoUpdater.on('update-downloaded', (info: UpdateInfo) => this.set({ state: 'downloaded', version: info.version }))
    autoUpdater.on('error', (error) => this.set(classifyUpdateError(error)))
  }

  get current(): UpdateStatus {
    return this.status
  }

  async check(): Promise<UpdateStatus> {
    if (this.status.state === 'unsupported') return this.status
    if (this.status.state === 'checking' || this.status.state === 'downloading' || this.status.state === 'downloaded') {
      return this.status
    }
    try {
      await autoUpdater.checkForUpdates()
    } catch (error) {
      this.set(classifyUpdateError(error))
    }
    return this.status
  }

  async download(): Promise<UpdateStatus> {
    if (this.status.state !== 'available') return this.status
    try {
      this.set({ state: 'downloading', version: this.status.version, percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 })
      await autoUpdater.downloadUpdate()
    } catch (error) {
      this.set(classifyUpdateError(error))
    }
    return this.status
  }

  /** Ferme le jeu, installe la mise à jour et relance l'application. */
  install(): void {
    if (this.status.state !== 'downloaded') return
    // Installation silencieuse (aucun assistant à revalider), puis relance du jeu.
    setImmediate(() => autoUpdater.quitAndInstall(true, true))
  }

  private set(status: UpdateStatus): void {
    this.status = status
    if (status.state === 'error') this.log(`mise à jour : ${status.kind} — ${status.message}`)
    const window = this.getWindow()
    if (window && !window.isDestroyed()) window.webContents.send(IPC.updaterStatus, status)
  }
}
