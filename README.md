# HARDWARE LAB

Simulateur de laboratoire informatique : assemblage de PC, diagnostic, réparation et gestion d'atelier.
Application de bureau Windows (Electron, React, TypeScript).

L'avancement détaillé est suivi dans [`PROJECT_STATUS.md`](PROJECT_STATUS.md).

## Développement

Prérequis : Node.js 22 ou plus récent.

```bash
npm install
npm run dev          # lance l'application avec rechargement à chaud
npm run typecheck    # vérification TypeScript
npm test             # tests unitaires (Vitest)
npm run build        # compilation dans out/
npm run test:smoke   # test de bout en bout sur l'application compilée (sous Linux : xvfb-run -a)
npm run test:e2e     # partie complète : mission, livraison, redémarrage (sous Linux : xvfb-run -a)
npm run brand        # régénère les variantes du logo à partir de assets/brand/logo-original.webp
```

## Structure

```
assets/brand/        logo officiel (source)
build/               ressources de packaging (icône Windows, bandeau d'installateur)
resources/           ressources embarquées dans l'application (icône de fenêtre)
scripts/             génération des variantes du logo, test de bout en bout
src/main/            processus principal Electron : fenêtre, IPC, stockage
src/preload/         API sécurisée exposée à l'interface
src/renderer/        interface React : introduction, menu, écrans de jeu (src/game/), styles, état
src/simulation/      catalogue des composants, compatibilité, simulation, banc de test
src/career/          contrats, économie, progression, format de sauvegarde
src/shared/          types, validation et données partagées
```

## Installateur et publication

Voir la section « Installateur et mises à jour » de [`PROJECT_STATUS.md`](PROJECT_STATUS.md).
Les versions publiées sont disponibles dans les [Releases GitHub](https://github.com/banchetnolan2-hub/Hardware-labs/releases).

Les données du joueur sont stockées dans le dossier utilisateur (`%APPDATA%\HARDWARE LAB` sous Windows).
