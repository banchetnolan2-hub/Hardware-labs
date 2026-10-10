// Écrit en Markdown les notes de la version de package.json (description de la GitHub Release).
// Usage : node scripts/release-notes.mjs > notes.md
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const notes = JSON.parse(readFileSync(resolve(root, 'src/shared/release-notes.json'), 'utf8'))
const note = notes.find((entry) => entry.version === version)
if (!note) {
  console.error(`Aucune note de version pour ${version} dans src/shared/release-notes.json`)
  process.exit(1)
}

console.log(`## ${note.title.fr}\n`)
for (const change of note.changes) console.log(`- ${change.fr}`)
console.log(`
### Installation

Téléchargez **HARDWARE_LAB_Setup.exe** ci-dessous et lancez-le (Windows 10/11 64 bits).
Les versions suivantes s'installeront automatiquement depuis le jeu (Paramètres → Mises à jour).

> L'installateur n'est pas signé numériquement : Windows SmartScreen peut afficher
> « Windows a protégé votre ordinateur ». Cliquez sur **Informations complémentaires** puis **Exécuter quand même**.`)
