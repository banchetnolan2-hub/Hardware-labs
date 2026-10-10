import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { CAREER_SCHEMA_VERSION, CareerSchema, type Career } from '@career/schema'
import { readJsonFile, writeJsonFileAtomic } from './json-file'

export type CareerLoadResult = { status: 'none' } | { status: 'ok' | 'recovered'; career: Career }

type Migration = (input: Record<string, unknown>) => Record<string, unknown>
/** Index = version de départ ; aucune migration pour l'instant (format v1). */
const CAREER_MIGRATIONS: Migration[] = []

/** Applique les migrations puis valide. Renvoie null si la sauvegarde est inutilisable. */
export function parseCareer(raw: unknown): Career | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  let data = raw as Record<string, unknown>
  let version = typeof data.schemaVersion === 'number' ? data.schemaVersion : -1
  while (version >= 1 && version < CAREER_SCHEMA_VERSION) {
    const migrate = CAREER_MIGRATIONS[version]
    if (!migrate) return null
    data = migrate(data)
    version += 1
  }
  const parsed = CareerSchema.safeParse(data)
  return parsed.success ? parsed.data : null
}

/**
 * Sauvegarde de carrière : `saves/career.json`, avec une copie de la version précédente
 * (`career.backup.json`) utilisée si le fichier principal est illisible. Une nouvelle carrière
 * archive l'ancienne au lieu de la supprimer.
 */
export class CareerStore {
  private queue: Promise<unknown> = Promise.resolve()

  constructor(
    private readonly directory: string,
    private readonly log: (message: string) => void = () => {}
  ) {}

  get path(): string {
    return join(this.directory, 'saves', 'career.json')
  }

  get backupPath(): string {
    return join(this.directory, 'saves', 'career.backup.json')
  }

  async load(): Promise<CareerLoadResult> {
    const main = await readJsonFile(this.path)
    if (main.status === 'ok') {
      const career = parseCareer(main.data)
      if (career) return { status: 'ok', career }
      this.log('career.json invalide, tentative de restauration de la copie de secours')
      await fs.rename(this.path, `${this.path}.invalid-${Date.now()}.json`).catch(() => {})
    } else if (main.status === 'corrupt') {
      this.log(`career.json illisible (${main.error})`)
    }
    const backup = await readJsonFile(this.backupPath)
    if (backup.status === 'ok') {
      const career = parseCareer(backup.data)
      if (career) {
        await writeJsonFileAtomic(this.path, career)
        return { status: main.status === 'missing' ? 'ok' : 'recovered', career }
      }
    }
    return { status: 'none' }
  }

  /** Valide strictement puis écrit ; la sauvegarde précédente devient la copie de secours. */
  save(candidate: unknown): Promise<Career> {
    const career = CareerSchema.parse(candidate)
    const task = this.queue.then(async () => {
      await fs.copyFile(this.path, this.backupPath).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error
      })
      await writeJsonFileAtomic(this.path, career)
      return career
    })
    this.queue = task.catch(() => {})
    return task
  }

  /** Archive la carrière en cours (nouvelle partie). */
  archive(): Promise<void> {
    const task = this.queue.then(async () => {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      await fs.rename(this.path, join(this.directory, 'saves', `career.archive-${stamp}.json`)).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error
      })
      await fs.rm(this.backupPath, { force: true })
    })
    this.queue = task.catch(() => {})
    return task
  }
}
