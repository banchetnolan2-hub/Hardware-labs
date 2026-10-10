import { join } from 'node:path'
import { loadSettings, SettingsSchema, type Settings, DEFAULT_SETTINGS } from '@shared/settings'
import { readJsonFile, writeJsonFileAtomic } from './json-file'

export const SETTINGS_FILE = 'settings.json'

/** Paramètres persistés dans le dossier de données utilisateur. */
export class SettingsStore {
  private current: Settings = structuredClone(DEFAULT_SETTINGS)
  private writeQueue: Promise<void> = Promise.resolve()

  constructor(
    private readonly directory: string,
    private readonly log: (message: string) => void = () => {}
  ) {}

  get path(): string {
    return join(this.directory, SETTINGS_FILE)
  }

  get value(): Settings {
    return structuredClone(this.current)
  }

  async load(): Promise<Settings> {
    const result = await readJsonFile(this.path)
    if (result.status === 'missing') {
      this.current = structuredClone(DEFAULT_SETTINGS)
      return this.value
    }
    if (result.status === 'corrupt') {
      this.log(`settings.json illisible (${result.error}), sauvegardé sous ${result.backupPath ?? '—'}`)
      this.current = structuredClone(DEFAULT_SETTINGS)
      await this.persist()
      return this.value
    }
    const loaded = loadSettings(result.data)
    this.current = loaded.settings
    if (loaded.issues.length > 0) this.log(`settings.json : ${loaded.issues.join(', ')}`)
    if (loaded.changed) await this.persist()
    return this.value
  }

  /** Valide strictement puis enregistre. Rejette toute donnée non conforme. */
  async save(candidate: unknown): Promise<Settings> {
    const settings = SettingsSchema.parse(candidate)
    this.current = settings
    await this.persist()
    return this.value
  }

  private persist(): Promise<void> {
    const snapshot = this.value
    this.writeQueue = this.writeQueue.then(() => writeJsonFileAtomic(this.path, snapshot))
    return this.writeQueue
  }
}
