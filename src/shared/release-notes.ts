import notes from './release-notes.json'

export type ReleaseNote = {
  version: string
  date: string
  title: { fr: string; en: string }
  changes: { fr: string; en: string }[]
}

/**
 * Notes de version affichées dans le jeu, de la plus récente à la plus ancienne.
 * Le même fichier JSON sert de description aux publications GitHub (scripts/release-notes.mjs).
 */
export const RELEASE_NOTES: ReleaseNote[] = notes
