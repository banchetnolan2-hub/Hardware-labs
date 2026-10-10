/**
 * Minutage de l'introduction (millisecondes depuis le début).
 * Les mêmes valeurs alimentent le CSS (variables --t-*) et la logique de fin de séquence.
 */
export const INTRO_TIMELINE = {
  full: {
    grid: 0,
    hud: 150,
    traces: 350,
    checks: 500,
    ring: 900,
    logo: 1650,
    signature: 2600,
    exit: 3900,
    exitDuration: 650
  },
  reduced: {
    grid: 0,
    hud: 0,
    traces: 0,
    checks: 0,
    ring: 0,
    logo: 0,
    signature: 500,
    exit: 1500,
    exitDuration: 300
  }
} as const

/** Durée de sortie quand le joueur passe l'introduction. */
export const INTRO_SKIP_DURATION = 380

/** Afficher la signature sous le logo (texte défini dans i18n/fr.ts et i18n/en.ts). */
export const INTRO_SIGNATURE_ENABLED = true
