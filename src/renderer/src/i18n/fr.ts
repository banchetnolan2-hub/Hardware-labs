export const fr = {
  intro: {
    skip: 'Passer',
    skipKey: 'Échap',
    signature: 'SYSTEM INITIALIZED',
    bootLabel: 'SÉQUENCE DE DÉMARRAGE',
    checks: ['CPU', 'MÉMOIRE', 'GPU', 'ALIMENTATION', 'STOCKAGE']
  },
  menu: {
    title: 'Menu principal',
    items: {
      continue: { label: 'Continuer', hint: 'Reprendre la dernière carrière' },
      newCareer: { label: 'Nouvelle carrière', hint: 'Ouvrir votre propre laboratoire' },
      sandbox: { label: 'Mode bac à sable', hint: 'Expérimenter sans contrainte' },
      configurations: { label: 'Mes configurations', hint: 'Configurations enregistrées' },
      library: { label: 'Bibliothèque de composants', hint: 'Catalogue du matériel' },
      settings: { label: 'Paramètres', hint: 'Affichage, animations, langue' },
      releaseNotes: { label: 'Notes de mise à jour', hint: 'Nouveautés de cette version' },
      quit: { label: 'Quitter', hint: 'Fermer HARDWARE LAB' }
    },
    upcoming: 'À venir',
    upcomingIn: (phase: number) => `Disponible à la phase ${phase} du développement`,
    lab: {
      title: 'Laboratoire',
      empty: 'Aucune carrière en cours',
      emptyHint:
        'Le mode carrière arrive à la phase 3. Votre atelier, votre budget et vos contrats apparaîtront ici.'
    },
    roadmap: {
      title: 'Feuille de route',
      done: 'Terminé',
      next: 'Prochaine étape',
      planned: 'Prévu',
      phases: [
        'Identité et fondations',
        'Configurateur et compatibilité',
        'Carrière, diagnostic et réparation',
        'Bac à sable et sauvegardes',
        'Installateur et mises à jour',
        'Finition'
      ]
    },
    system: {
      title: 'Système',
      version: 'Version installée',
      build: 'Type de build',
      packaged: 'Application installée',
      development: 'Développement',
      engine: 'Moteur'
    },
    keyboard: '↑ ↓ pour naviguer · Entrée pour valider'
  },
  common: {
    back: 'Retour',
    saved: 'Enregistré',
    saveError: 'Échec de l’enregistrement'
  },
  settings: {
    title: 'Paramètres',
    display: {
      title: 'Affichage',
      mode: 'Mode d’affichage',
      windowed: 'Fenêtré',
      fullscreen: 'Plein écran',
      remember: 'Mémoriser la taille et la position de la fenêtre',
      rememberHint: 'Appliqué au prochain démarrage.'
    },
    motion: {
      title: 'Animations',
      intro: 'Introduction au lancement',
      introHint: 'Séquence animée affichée au démarrage du jeu.',
      reduced: 'Réduction des animations',
      reducedHint: 'Le mode « Système » suit le réglage d’accessibilité de Windows.',
      system: 'Système',
      reduce: 'Réduites',
      full: 'Complètes'
    },
    language: { title: 'Langue', label: 'Langue de l’interface' },
    about: {
      title: 'À propos',
      version: 'Version installée',
      dataFolder: 'Dossier des données',
      openFolder: 'Ouvrir le dossier'
    },
    on: 'Activé',
    off: 'Désactivé'
  },
  releaseNotes: { title: 'Notes de mise à jour', installed: 'Installée' }
}

export type Messages = typeof fr
