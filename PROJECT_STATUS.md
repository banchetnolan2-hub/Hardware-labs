# HARDWARE LAB — État du projet

_Dernière mise à jour : 10/10/2026 — version 0.1.0 — **Phase 1 terminée, installateur et mises à jour mis en place (phase 5 avancée)**_

## Résumé

| Phase | Contenu | État |
| --- | --- | --- |
| 1 | Identité et fondations (Electron/React/TS, intro Motion Design, menu, paramètres) | ✅ Terminée |
| 2 | Configurateur, données composants, moteur de compatibilité | ⏭ Prochaine |
| 3 | Carrière, contrats, inventaire, diagnostic, réparation | Prévue |
| 4 | Bac à sable, comparaisons, sauvegardes de partie | Prévue |
| 5 | Installateur `HARDWARE_LAB_Setup.exe`, publication, mises à jour automatiques | 🟡 Installateur et publication en place ; mise à jour réelle d'une version à l'autre à tester |
| 6 | Finition | Prévue |

## Fonctionnalités terminées et vérifiées (Phase 1)

- **Introduction Motion Design** (`src/renderer/src/intro/`) — ≈ 4,4 s mesurées :
  - A : grille, repères d'angle, libellés techniques, ligne de balayage, auto-test CPU/MÉMOIRE/GPU/ALIMENTATION/STOCKAGE ;
  - B : pistes de circuit tracées depuis les bords, impulsions lumineuses, anneau dessiné ;
    les tracés aboutissent **exactement** sur les nœuds et l'anneau du logo officiel (`geometry.ts`) ;
  - C : révélation circulaire du logo officiel depuis le centre de l'anneau ;
  - D : signature `SYSTEM INITIALIZED` (modifiable dans `i18n/*.ts`, désactivable dans `timeline.ts`) ;
  - E : fondu enchaîné vers le menu (le menu est monté sous l'intro, aucun écran blanc).
  - Passer : bouton, Échap, Entrée, Espace ou clic. Désactivable dans les paramètres.
  - Réduction des animations : composition statique (réglage du jeu ou du système).
- **Menu principal** : 8 entrées ; Paramètres, Notes de mise à jour et Quitter fonctionnent.
  Les 5 entrées dépendant des phases suivantes sont **désactivées** et marquées « À venir · Pn ».
  Panneaux Laboratoire (état vide honnête), Feuille de route, Système (version installée).
  Navigation clavier ↑/↓/Entrée.
- **Paramètres** (persistés) : fenêtré / plein écran, mémorisation taille et position de la fenêtre,
  introduction on/off, réduction des animations (Système / Réduites / Complètes), langue FR/EN,
  version installée, ouverture du dossier de données.
- **Stockage** : `settings.json` et `window-state.json` dans le dossier utilisateur
  (`%APPDATA%\HARDWARE LAB` sous Windows). Écriture atomique, fichier corrompu mis de côté,
  validation zod, champs invalides corrigés individuellement, migrations versionnées.
- **Sécurité Electron** : `contextIsolation`, `sandbox`, `nodeIntegration: false`, CSP stricte,
  5 canaux IPC listés, vérification de l'expéditeur IPC, validation stricte des paramètres reçus,
  navigation et nouvelles fenêtres bloquées, instance unique.
- **Identité visuelle** : design tokens (`styles/tokens.css`), polices embarquées (Michroma, Inter,
  JetBrains Mono), aucune ressource téléchargée à l'exécution.
- **Logo officiel** : intégré dans l'intro, le menu, la barre de titre, l'icône de fenêtre et l'icône
  Windows (`build/icon.ico`). Variantes générées par `npm run brand` (recadrage, aucune déformation).

## Installateur et mises à jour

- `electron-builder.yml` : installateur NSIS `HARDWARE_LAB_Setup.exe` (x64, par utilisateur, choix du dossier,
  raccourcis bureau et menu Démarrer, lancement après installation, données du joueur conservées à la désinstallation).
- Construction locale possible sous Linux avec Wine : `npm run build && npx electron-builder --win nsis --x64 --publish never`
  → `release/HARDWARE_LAB_Setup.exe` (≈ 114 Mo), `release/latest.yml`, `release/HARDWARE_LAB_Setup.exe.blockmap`.
- `.github/workflows/release.yml` (Windows réel, `windows-latest`) : tests, compilation, installateur, installation
  silencieuse, vérification des raccourcis, test de bout en bout **sur l'application installée**, désinstallation avec
  vérification de la conservation des données, puis publication sur GitHub Releases (tag `v*` ou lancement manuel
  avec « publish »). Aucun secret embarqué : le dépôt est public et la publication utilise le `GITHUB_TOKEN` du workflow.
- `src/main/updater.ts` (electron-updater) : recherche automatique au démarrage (désactivable), bouton
  « Rechercher des mises à jour », version installée / nouvelle version, téléchargement à la demande avec progression,
  « Redémarrer et installer » ou « Plus tard » (installation à la fermeture), erreurs réseau et absence de version gérées.
- Les sauvegardes sont dans `%APPDATA%\HARDWARE LAB`, hors du dossier d'installation : une mise à jour ne les touche pas.
  Les paramètres de la 0.1.0 (schéma v1) sont migrés vers le schéma v2 (test automatisé).

### Publier une nouvelle version

1. Incrémenter `version` dans `package.json` et ajouter l'entrée correspondante dans `src/shared/release-notes.json`.
2. Pousser puis créer le tag : `git tag v0.2.0 && git push origin v0.2.0`
   (ou lancer le workflow manuellement avec « publish » coché).
3. Le workflow publie l'installateur, `latest.yml` et le `.blockmap` ; les jeux installés proposent la mise à jour.

## Tests réellement exécutés (10/10/2026)

- `npm run typecheck` : OK.
- `npm test` (Vitest) : **23/23** — dont migration des paramètres 0.1.0 et classification des erreurs de mise à jour ; — validation, corrections et migrations des paramètres,
  écriture atomique, fichiers corrompus, persistance entre deux sessions, écritures concurrentes.
- `npm run build` : OK.
- `xvfb-run -a npm run test:smoke` (Linux, Electron réel) : **16/16** — intro affichée et terminée
  en 4,4 s, sécurité du renderer, menu, plein écran puis fenêtré, écriture des paramètres,
  persistance après redémarrage (intro désactivée, langue), réduction des animations,
  intro réduite passée avec Échap, aucune erreur console.
- `npm run dev` : démarre, introduction affichée, aucune erreur console.

- **Windows réel (GitHub Actions `windows-latest`, exécution 38041256868, 10/10/2026)** : tests unitaires, installateur,
  installation silencieuse, raccourcis bureau et menu Démarrer, test de bout en bout **17/17 sur l'application installée**
  (intro 4,46 s, plein écran, persistance, vraie recherche de mise à jour sur GitHub), désinstallation propre avec
  données du joueur conservées, puis publication.
- **Version publiée** : https://github.com/banchetnolan2-hub/Hardware-labs/releases/tag/v0.1.0
  (`HARDWARE_LAB_Setup.exe`, `latest.yml`, `HARDWARE_LAB_Setup.exe.blockmap`).

## Problèmes et limites connus

- **Installateur non signé** (pas de certificat de signature de code) : Windows SmartScreen affichera un avertissement.
- **Mise à jour réelle 0.1.0 → version suivante : pas encore testée** (il faut deux versions publiées).
  Le système ne doit pas être considéré comme opérationnel avant ce test.
- **Logo** : le fichier reçu est un WebP 1536×1024 avec fond sombre intégré (pas de transparence).
  Il est intégré par mélange `lighten` sur le fond anthracite, sans retouche. Pour une icône
  Windows plus nette en 16–32 px et pour l'installateur, une version PNG transparente haute
  résolution (ou SVG) du logo et de l'emblème seul serait préférable.
- La barre de titre utilise `titleBarOverlay` (boutons natifs Windows) : à valider visuellement sous Windows.

## Décisions techniques

- **electron-vite 5 + Vite 7** : seule combinaison compatible avec electron-vite 5 (Vite 8 non supporté).
- **Vitest 3.2** : Vitest 4 déclenche un bug interne de npm 10 (`edgesOut`) dans cet environnement.
- **Electron 44**, **React 19**, **TypeScript 5.9**, **Zustand 5**, **zod 4**.
- **Animations en CSS/SVG** plutôt que Framer Motion : la séquence est une timeline fixe ;
  `stroke-dashoffset`, `transform` et `opacity` suffisent, sans dépendance supplémentaire,
  et restent légers sur des PC modestes (aucun flou ni ombre animés).
- Toutes les librairies du renderer sont en `devDependencies` (intégrées au bundle par Vite) :
  seul `zod` est embarqué en dépendance d'exécution du processus principal.
- `src/shared/settings-defaults.ts` est séparé de `settings.ts` pour ne pas embarquer zod dans l'interface.

## Prochaines étapes (Phase 2)

1. `src/simulation/` : types des composants, ≥ 30 composants fictifs cohérents (données centralisées).
2. Moteur de compatibilité (socket, mémoire, format, dimensions, alimentation, connecteurs,
   refroidissement) avec trois niveaux et explications + tests.
3. Page Configurateur et Bibliothèque de composants ; premiers indicateurs de performance.

## Reprise du travail

```bash
npm install           # puis, si le binaire Electron manque : node node_modules/electron/install.js
npm run dev           # application en développement
npm test              # tests unitaires
npm run build && xvfb-run -a npm run test:smoke   # test de bout en bout (Linux)
```
