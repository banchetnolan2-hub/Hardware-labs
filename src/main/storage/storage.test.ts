import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/settings'
import { readJsonFile, writeJsonFileAtomic } from './json-file'
import { SETTINGS_FILE, SettingsStore } from './settings-store'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'hardware-lab-test-'))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('fichiers JSON', () => {
  it('signale un fichier absent', async () => {
    expect(await readJsonFile(join(dir, 'absent.json'))).toEqual({ status: 'missing' })
  })

  it('écrit puis relit le même contenu, sans laisser de fichier temporaire', async () => {
    const path = join(dir, 'sub', 'data.json')
    await writeJsonFileAtomic(path, { a: 1, b: ['x'] })
    expect(await readJsonFile(path)).toEqual({ status: 'ok', data: { a: 1, b: ['x'] } })
    expect(await readdir(join(dir, 'sub'))).toEqual(['data.json'])
  })

  it('met de côté un fichier corrompu au lieu de l’écraser', async () => {
    const path = join(dir, 'data.json')
    await writeFile(path, '{ tronqué', 'utf8')
    const result = await readJsonFile(path)
    expect(result.status).toBe('corrupt')
    const files = await readdir(dir)
    expect(files.some((name) => name.startsWith('data.json.corrupt-'))).toBe(true)
    expect(files).not.toContain('data.json')
  })
})

describe('SettingsStore', () => {
  it('utilise les valeurs par défaut au premier lancement sans créer de fichier', async () => {
    const store = new SettingsStore(dir)
    expect(await store.load()).toEqual(DEFAULT_SETTINGS)
    expect(await readdir(dir)).toEqual([])
  })

  it('conserve les paramètres entre deux sessions (redémarrage simulé)', async () => {
    const first = new SettingsStore(dir)
    await first.load()
    await first.save({ ...DEFAULT_SETTINGS, language: 'en', display: { mode: 'fullscreen', rememberWindowBounds: false } })

    const second = new SettingsStore(dir)
    const loaded = await second.load()
    expect(loaded.language).toBe('en')
    expect(loaded.display).toEqual({ mode: 'fullscreen', rememberWindowBounds: false })
  })

  it('refuse un enregistrement invalide et garde la valeur précédente', async () => {
    const store = new SettingsStore(dir)
    await store.load()
    await expect(store.save({ ...DEFAULT_SETTINGS, language: 'xx' })).rejects.toThrow()
    expect(store.value).toEqual(DEFAULT_SETTINGS)
  })

  it('récupère après un fichier corrompu et réécrit un fichier valide', async () => {
    await writeFile(join(dir, SETTINGS_FILE), 'pas du json', 'utf8')
    const logs: string[] = []
    const store = new SettingsStore(dir, (message) => logs.push(message))
    expect(await store.load()).toEqual(DEFAULT_SETTINGS)
    expect(JSON.parse(await readFile(join(dir, SETTINGS_FILE), 'utf8'))).toEqual(DEFAULT_SETTINGS)
    expect(logs[0]).toMatch(/illisible/)
  })

  it('réécrit un fichier migré ou corrigé', async () => {
    await writeFile(join(dir, SETTINGS_FILE), JSON.stringify({ language: 'en' }), 'utf8')
    const store = new SettingsStore(dir)
    await store.load()
    const onDisk = JSON.parse(await readFile(join(dir, SETTINGS_FILE), 'utf8'))
    expect(onDisk).toEqual({ ...DEFAULT_SETTINGS, language: 'en' })
  })

  it('sérialise les écritures concurrentes : la dernière demande gagne', async () => {
    const store = new SettingsStore(dir)
    await store.load()
    await Promise.all([
      store.save({ ...DEFAULT_SETTINGS, language: 'en' }),
      store.save({ ...DEFAULT_SETTINGS, language: 'fr', intro: { enabled: false } })
    ])
    const onDisk = JSON.parse(await readFile(join(dir, SETTINGS_FILE), 'utf8'))
    expect(onDisk.intro.enabled).toBe(false)
    expect(onDisk.language).toBe('fr')
  })
})
