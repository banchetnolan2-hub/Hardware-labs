import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, SETTINGS_SCHEMA_VERSION, SettingsSchema, loadSettings } from './settings'

describe('loadSettings', () => {
  it('accepte des paramètres valides sans les modifier', () => {
    const input = { ...DEFAULT_SETTINGS, language: 'en', intro: { enabled: false } }
    const result = loadSettings(input)
    expect(result.settings).toEqual(input)
    expect(result.changed).toBe(false)
    expect(result.issues).toEqual([])
  })

  it('remplace un contenu non objet par les valeurs par défaut', () => {
    for (const raw of [null, 42, 'texte', [1, 2]]) {
      const result = loadSettings(raw)
      expect(result.settings).toEqual(DEFAULT_SETTINGS)
      expect(result.changed).toBe(true)
    }
  })

  it('corrige uniquement le champ invalide et conserve les autres', () => {
    const result = loadSettings({
      ...DEFAULT_SETTINGS,
      language: 'klingon',
      intro: { enabled: false },
      display: { mode: 'fullscreen', rememberWindowBounds: 'oui' }
    })
    expect(result.settings.language).toBe('fr')
    expect(result.settings.intro.enabled).toBe(false)
    expect(result.settings.display).toEqual({ mode: 'fullscreen', rememberWindowBounds: true })
    expect(result.changed).toBe(true)
  })

  it('complète les sections manquantes', () => {
    const result = loadSettings({ schemaVersion: SETTINGS_SCHEMA_VERSION, language: 'en' })
    expect(result.settings).toEqual({ ...DEFAULT_SETTINGS, language: 'en' })
    expect(result.changed).toBe(true)
  })

  it('migre un fichier sans numéro de version en conservant les valeurs reconnues', () => {
    const result = loadSettings({ language: 'en', intro: { enabled: false } })
    expect(result.settings.schemaVersion).toBe(SETTINGS_SCHEMA_VERSION)
    expect(result.settings.language).toBe('en')
    expect(result.settings.intro.enabled).toBe(false)
    expect(result.issues).toContain('migration v0 → v1')
    expect(result.issues).toContain('migration v1 → v2')
  })

  it('migre les paramètres de la version 0.1.0 (schéma v1) sans perte', () => {
    const v1 = {
      schemaVersion: 1,
      display: { mode: 'fullscreen', rememberWindowBounds: false },
      intro: { enabled: false },
      accessibility: { reducedMotion: 'reduce' },
      language: 'en'
    }
    const result = loadSettings(v1)
    expect(result.settings).toEqual({ ...v1, schemaVersion: 2, updates: { autoCheck: true } })
    expect(result.changed).toBe(true)
  })

  it('récupère ce qui est compatible depuis une version plus récente du jeu', () => {
    const result = loadSettings({ ...DEFAULT_SETTINGS, schemaVersion: 99, language: 'en', futureOption: 1 })
    expect(result.settings.language).toBe('en')
    expect(result.settings.schemaVersion).toBe(SETTINGS_SCHEMA_VERSION)
    expect(SettingsSchema.safeParse(result.settings).success).toBe(true)
  })

  it('supprime les champs inconnus', () => {
    const result = loadSettings({ ...DEFAULT_SETTINGS, injected: '<script>' })
    expect(result.settings).toEqual(DEFAULT_SETTINGS)
    expect(result.changed).toBe(true)
  })
})

describe('SettingsSchema (validation stricte des enregistrements)', () => {
  it('refuse une valeur hors liste', () => {
    expect(SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, display: { mode: 'kiosk', rememberWindowBounds: true } }).success).toBe(false)
  })
  it('refuse les champs supplémentaires', () => {
    expect(SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, extra: true }).success).toBe(false)
  })
  it('refuse une autre version de schéma', () => {
    expect(SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, schemaVersion: 0 }).success).toBe(false)
  })
})
