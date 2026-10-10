import type { Settings } from './settings'

// Fichier volontairement sans dépendance à zod : il est importé par l'interface.
export const SETTINGS_SCHEMA_VERSION = 1

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  display: { mode: 'windowed', rememberWindowBounds: true },
  intro: { enabled: true },
  accessibility: { reducedMotion: 'system' },
  language: 'fr'
}
