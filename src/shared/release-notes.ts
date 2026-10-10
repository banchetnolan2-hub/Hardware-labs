export type ReleaseNote = {
  version: string
  date: string
  title: { fr: string; en: string }
  changes: { fr: string; en: string }[]
}

/** Notes de version affichées dans le jeu, de la plus récente à la plus ancienne. */
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '0.1.0',
    date: '2026-10-10',
    title: { fr: 'Fondations et identité', en: 'Foundations & identity' },
    changes: [
      {
        fr: 'Introduction animée au lancement, avec possibilité de la passer ou de la désactiver.',
        en: 'Animated launch sequence, skippable and can be turned off.'
      },
      { fr: 'Menu principal et navigation.', en: 'Main menu and navigation.' },
      {
        fr: 'Paramètres : affichage fenêtré ou plein écran, mémorisation de la fenêtre, réduction des animations, langue.',
        en: 'Settings: windowed or fullscreen display, window memory, reduced motion, language.'
      },
      {
        fr: 'Paramètres enregistrés dans le dossier utilisateur, validés et migrés automatiquement.',
        en: 'Settings stored in the user folder, validated and migrated automatically.'
      }
    ]
  }
]
