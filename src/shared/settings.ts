import { z } from 'zod'

/**
 * Paramètres du joueur.
 *
 * Le format est versionné (`schemaVersion`). Toute évolution de structure doit :
 *  1. incrémenter SETTINGS_SCHEMA_VERSION ;
 *  2. ajouter une étape dans `SETTINGS_MIGRATIONS` qui transforme la version N en N+1.
 */
import { DEFAULT_SETTINGS, SETTINGS_SCHEMA_VERSION } from './settings-defaults'

export { DEFAULT_SETTINGS, SETTINGS_SCHEMA_VERSION }

export const DisplayModeSchema = z.enum(['windowed', 'fullscreen'])
export const ReducedMotionSchema = z.enum(['system', 'reduce', 'full'])
export const LanguageSchema = z.enum(['fr', 'en'])

export type DisplayMode = z.infer<typeof DisplayModeSchema>
export type ReducedMotionPreference = z.infer<typeof ReducedMotionSchema>
export type Language = z.infer<typeof LanguageSchema>

/** Schéma strict : utilisé pour valider ce que le renderer demande d'enregistrer. */
export const SettingsSchema = z
  .object({
    schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
    display: z
      .object({
        mode: DisplayModeSchema,
        rememberWindowBounds: z.boolean()
      })
      .strict(),
    intro: z.object({ enabled: z.boolean() }).strict(),
    accessibility: z.object({ reducedMotion: ReducedMotionSchema }).strict(),
    updates: z.object({ autoCheck: z.boolean() }).strict(),
    language: LanguageSchema
  })
  .strict()

export type Settings = z.infer<typeof SettingsSchema>

/**
 * Schéma tolérant pour le chargement : un champ invalide est remplacé par sa valeur
 * par défaut au lieu de faire perdre l'ensemble des paramètres.
 */
const LenientSettingsSchema = z.object({
  schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
  display: z
    .object({
      mode: DisplayModeSchema.catch(DEFAULT_SETTINGS.display.mode),
      rememberWindowBounds: z.boolean().catch(DEFAULT_SETTINGS.display.rememberWindowBounds)
    })
    .catch(DEFAULT_SETTINGS.display),
  intro: z.object({ enabled: z.boolean().catch(DEFAULT_SETTINGS.intro.enabled) }).catch(DEFAULT_SETTINGS.intro),
  accessibility: z
    .object({ reducedMotion: ReducedMotionSchema.catch(DEFAULT_SETTINGS.accessibility.reducedMotion) })
    .catch(DEFAULT_SETTINGS.accessibility),
  updates: z
    .object({ autoCheck: z.boolean().catch(DEFAULT_SETTINGS.updates.autoCheck) })
    .catch(DEFAULT_SETTINGS.updates),
  language: LanguageSchema.catch(DEFAULT_SETTINGS.language)
})

type Migration = (input: Record<string, unknown>) => Record<string, unknown>

/** Index = version de départ. SETTINGS_MIGRATIONS[0] transforme v0 en v1. */
const SETTINGS_MIGRATIONS: Migration[] = [
  // v0 : fichiers sans `schemaVersion` (aucune version publique ne l'a produit, mais
  // on les accepte en conservant les champs reconnus).
  (input) => ({ ...input, schemaVersion: 1 }),
  // v1 → v2 (0.1.0 → 0.2.0) : ajout des options de mise à jour.
  (input) => ({ ...input, schemaVersion: 2, updates: { autoCheck: true } })
]

export type SettingsLoadResult = {
  settings: Settings
  /** Le contenu a été modifié (migration ou correction) et doit être réécrit. */
  changed: boolean
  /** Description des corrections appliquées, pour les journaux. */
  issues: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Migre puis valide des paramètres lus sur disque. Ne lève jamais d'exception. */
export function loadSettings(raw: unknown): SettingsLoadResult {
  if (!isRecord(raw)) {
    return { settings: structuredClone(DEFAULT_SETTINGS), changed: true, issues: ['format racine invalide'] }
  }

  const issues: string[] = []
  let data: Record<string, unknown> = raw
  let version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0

  if (!Number.isInteger(version) || version < 0) {
    issues.push(`schemaVersion invalide (${String(raw.schemaVersion)})`)
    version = 0
  }
  if (version > SETTINGS_SCHEMA_VERSION) {
    // Fichier écrit par une version plus récente du jeu : on récupère ce qui est compatible.
    issues.push(`version ${version} plus récente que ${SETTINGS_SCHEMA_VERSION}`)
    data = { ...data, schemaVersion: SETTINGS_SCHEMA_VERSION }
    version = SETTINGS_SCHEMA_VERSION
  }
  while (version < SETTINGS_SCHEMA_VERSION) {
    const migrate = SETTINGS_MIGRATIONS[version]
    if (!migrate) {
      issues.push(`migration manquante depuis v${version}`)
      return { settings: structuredClone(DEFAULT_SETTINGS), changed: true, issues }
    }
    data = migrate(data)
    issues.push(`migration v${version} → v${version + 1}`)
    version += 1
  }

  const parsed = LenientSettingsSchema.parse({ ...data, schemaVersion: SETTINGS_SCHEMA_VERSION })
  const settings: Settings = SettingsSchema.parse(parsed)
  const strict = SettingsSchema.safeParse(raw)
  if (!strict.success && issues.length === 0) issues.push('valeurs invalides corrigées')
  return { settings, changed: !strict.success, issues }
}
