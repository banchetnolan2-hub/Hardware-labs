# HARDWARE LAB — État du projet

_Dernière mise à jour : 10/10/2026 — version 0.2.0 — **Gameplay jouable : carrière, configurateur, banc de test**_

## Résumé

| Phase | Contenu | État |
| --- | --- | --- |
| 1 | Identité et fondations (Electron/React/TS, intro Motion Design, menu, paramètres) | ✅ Terminée |
| 2 | Composants, configurateur, compatibilité, simulation | ✅ Terminée |
| 3 | Carrière, contrats, économie, diagnostic, réparation, progression | ✅ Terminée |
| 4 | Bac à sable, configurations enregistrées, comparaisons | 🟡 Sauvegardes faites ; bac à sable à faire |
| 5 | Installateur, publication, mises à jour automatiques | ✅ En place (mise à jour réelle testée en CI à chaque publication) |
| 6 | Finition | Prévue |

## La boucle de jeu (0.2.0)

1. **Contrats** : tableau de 4 commandes (6 avec l'agrandissement de l'atelier). La première est toujours
   la mission d'introduction « Premier PC de jeu » (budget 850 €, 60 FPS en 1080p, 16 Go, SSD 500 Go).
2. **Accepter** : un seul contrat à la fois ; abandon possible (−6 de réputation, pièces rendues au stock).
3. **Configurateur** : 8 emplacements ; chaque pièce est achetée (argent réellement débité) ou prise dans le stock.
   Chaque candidat affiche sa compatibilité et son effet sur l'exigence principale **avant** l'achat.
   Analyse en direct : coût / budget, compatibilité expliquée, FPS 1080p/1440p/4K, indices bureautique et création,
   composant limitant, charge et marge d'alimentation, températures en jeu et à pleine charge, bruit, exigences du client.
4. **Banc de test** : 7 tests qui consomment du temps d'atelier (et des outils pour 2 d'entre eux), courbes
   température / fréquence / puissance issues de la simulation, observations, journal (résultats obsolètes signalés
   si la machine a changé).
5. **Corriger** : remplacer des pièces, nettoyer, changer la pâte thermique.
6. **Livrer** : bloqué tant que la machine est incomplète, incompatible, hors budget, sous les exigences,
   ou sans test de stabilité réussi **sur la configuration finale**.
7. **Résultats** : écran animé (étoiles, satisfaction, détail du paiement, XP, réputation, niveau, déblocages).
8. **Progression** : 5 niveaux (XP 0 / 200 / 550 / 1100 / 1900) qui débloquent composants, catégories de
   contrats et équipements ; la réputation fixe la difficulté maximale des contrats proposés (1 + réputation/20).

### Catégories de contrats

| Catégorie | Niveau | Principe |
| --- | --- | --- |
| Gaming | 1 | FPS minimum en 1080p ou 1440p, 16 Go, SSD ; parfois un plafond de bruit |
| Bureautique | 1 | Indice bureautique, bruit, consommation (dès difficulté 2), sans carte graphique nécessaire |
| Amélioration | 2 | Machine du client à faire évoluer (carte graphique, mémoire, alimentation si nécessaire) |
| Thermique | 2 | Poussière, pâte sèche ou refroidisseur sous-dimensionné |
| Stabilité | 3 | Alimentation vieillissante ou trop faible, barrette mémoire défectueuse |
| Diagnostic | 3 | Une ou deux pannes de toute nature (dont stockage en fin de vie) |
| Haut de gamme | 4 | FPS 1440p/4K + indice de création, 32 Go, 1 To |

**Contrats toujours réalisables** : chaque contrat généré embarque une solution de référence construite avec les
composants débloqués ; elle respecte le budget, toutes les exigences et passe le test de stabilité
(vérifié par test automatisé sur plus de 250 contrats). Les seuils sont dérivés de cette référence, ce qui évite
les objectifs impossibles ou contradictoires.

### Économie et barème de livraison (`src/career/career.ts`)

- Départ : 1 000 €, réputation 10. Revente d'une pièce inutilisée : 60 % du prix.
- Le client rembourse les pièces installées (contrats de montage) — ou seulement celles qui ont réparé une panne
  (contrats de réparation) — et paie la main-d'œuvre selon la satisfaction : `main-d'œuvre × (0,5 + 0,5 × note/100)`.
- Bonus d'économie (montage) : 15 % du budget non dépensé.
- Note sur 100 : −6 par réserve de compatibilité (max −24), −10 si la stabilité n'est obtenue qu'avec des limitations,
  −8 par heure de retard, −10 par pièce remplacée inutilement, −5 par intervention inutile, +5/+10 si les
  performances dépassent l'objectif de 10 %/20 %.
- Panne non résolue à la livraison : note plafonnée à 20, main-d'œuvre non payée, réputation −(4 + 2 × difficulté).
- Étoiles : ≥ 90 → 5, ≥ 75 → 4, ≥ 55 → 3, ≥ 35 → 2, sinon 1. XP : 20 + 25 × difficulté + 8 × étoiles.
- Réputation : (étoiles − 2) × (1 + difficulté) si ≥ 3 étoiles, sinon −(3 − étoiles) × (1 + difficulté).

### Simulation (`src/simulation/`)

Toutes les grandeurs viennent des fiches des composants et de l'état de la machine, sans hasard
(le hasard ne sert qu'à générer les contrats, avec une graine sauvegardée). Constantes documentées dans `simulate.ts` :
puissance par charge (repos, bureautique, jeu, CPU, GPU, pleine charge), limite VRM, température de l'air du boîtier
selon le flux d'air, température processeur selon la capacité du refroidisseur, réduction de fréquence à 95 °C (CPU)
et 88 °C (GPU) avec perte de performance, pics transitoires de la carte graphique, rendement de l'alimentation,
bruit combiné, FPS limités par le CPU ou le GPU, effet de la mémoire (capacité, double canal, fréquence).
Les pannes modifient ces paramètres (flux d'air, efficacité du refroidisseur, capacité de l'alimentation…)
et produisent leurs symptômes au banc de test à des instants déterminés par la configuration.
**L'analyse en direct du configurateur ne voit que les fiches techniques** : les pannes cachées ne se révèlent qu'aux tests.

### Écrans

Atelier, Contrats, Configurateur, Banc de test, Bibliothèque (48 composants, achat), Finances (solde, encaissé,
dépensé, résultat net, valeur du stock, courbe du solde, mouvements), Progression (niveau, réputation, déblocages,
historique), écran de résultats. Menu principal : Continuer, Nouvelle carrière (l'ancienne est archivée, jamais
supprimée), Bibliothèque. Textes en français et en anglais.

### Sauvegardes

`%APPDATA%\HARDWARE LAB\saves\career.json`, enregistrée après chaque action, validée par zod dans le processus
principal (format versionné, migrations prévues), copie de secours `career.backup.json` utilisée automatiquement si
le fichier principal est illisible, archive lors d'une nouvelle carrière. Les paramètres sont passés au format v2
(option de mise à jour) avec migration depuis la 0.1.0.

## Tests réellement exécutés (10/10/2026)

- `npm run typecheck` : OK.
- `npm test` (Vitest) : **88/88** — catalogue, compatibilité (15 règles), puissance, températures, réduction de
  fréquence, performances, banc de test et pannes, faisabilité des contrats générés (> 250), symptômes observables
  des pannes, économie (achats, solde insuffisant, verrouillage, revente, outils), mission d'introduction de bout en
  bout, blocages de livraison, abandon, réparations correctes / ratées / inutiles, sauvegarde de carrière
  (redémarrage, données invalides refusées, restauration de la copie de secours, archive), paramètres et migrations.
- `xvfb-run -a npm run test:smoke` (Electron réel, Linux) : 17/17.
- `xvfb-run -a npm run test:e2e` (Electron réel, Linux) : **22/22** — nouvelle carrière, mission d'introduction jouée à
  l'écran (achats débités, pièce incompatible signalée, livraison bloquée avant le test), test de stabilité, livraison,
  écran de résultats, solde crédité, second contrat accepté, **redémarrage** : solde, contrat en cours et historique
  restaurés.
- Contrôle visuel : captures de toutes les pages à 1920×1080 et d'une mission de réparation.
- CI Windows (`.github/workflows/release.yml`) : les mêmes tests sur l'application **installée**, désinstallation,
  puis publication et **mise à jour réelle depuis la version précédente** (voir ci-dessous).

## Installateur et mises à jour

- `electron-builder.yml` : NSIS `HARDWARE_LAB_Setup.exe` (x64, par utilisateur, raccourcis, lancement après installation,
  données conservées à la désinstallation). Construction locale sous Linux avec Wine :
  `npm run build && npx electron-builder --win nsis --x64 --publish never` → `release/`.
- Workflow GitHub Actions (Windows) : tests, installateur, installation silencieuse, smoke test et partie complète
  sur l'application installée, désinstallation, publication GitHub Releases, puis job **update-from-previous** :
  installe la version publiée précédente, modifie un paramètre, recherche / télécharge / installe la mise à jour depuis
  le jeu, vérifie la nouvelle version, la relance, la conservation des données et la migration des paramètres.
- Publier : incrémenter `version` (package.json), ajouter les notes dans `src/shared/release-notes.json`,
  puis tag `vX.Y.Z` (ou lancement manuel du workflow avec « publish »).

## Problèmes et limites connus

- **Bac à sable et « Mes configurations »** : non développés (désactivés dans le menu, marqués « À venir · P4 »).
- **Équilibrage** : les formules sont cohérentes et testées, mais l'économie mérite des sessions de jeu prolongées
  (rythme de progression au-delà du niveau 3, rentabilité des contrats de réparation).
- **Audio** : aucun son pour l'instant (pas d'option audio affichée).
- **Installateur non signé** : avertissement SmartScreen à l'installation.
- La barre de titre utilise les boutons natifs Windows (`titleBarOverlay`) ; vérifiée en CI mais pas à l'œil sous Windows.

## Prochaines étapes

1. Bac à sable : budget libre, tous les composants, duplication et comparaison de configurations, pannes à la demande.
2. Configurations enregistrées (« Mes configurations »).
3. Équilibrage après sessions de jeu, événements d'atelier (clients pressés, pièces en promotion).
4. Finition : sons, tutoriel contextuel, accessibilité clavier du configurateur.

## Reprise du travail

```bash
npm install           # si le binaire Electron manque : node node_modules/electron/install.js
npm run dev           # application en développement
npm test              # tests unitaires
npm run build && xvfb-run -a npm run test:smoke && xvfb-run -a npm run test:e2e   # tests de bout en bout (Linux)
```

Arborescence du jeu : `src/simulation/` (catalogue, compatibilité, simulation, banc de test),
`src/career/` (contrats, économie, progression, format de sauvegarde), `src/renderer/src/game/` (écrans).
