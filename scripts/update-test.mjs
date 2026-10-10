// Test de mise à jour réelle : lance la version installée (ancienne), recherche la mise à jour
// publiée sur GitHub Releases, la télécharge puis demande l'installation. Le processus se termine
// quand l'application se ferme pour laisser l'installateur travailler ; la vérification de la
// nouvelle version et des données conservées est faite ensuite par le workflow.
// Usage : HARDWARE_LAB_EXE=<exécutable installé> EXPECTED_VERSION=0.2.0 node scripts/update-test.mjs
import { _electron as electron } from 'playwright-core'

const exe = process.env.HARDWARE_LAB_EXE
const expected = process.env.EXPECTED_VERSION
if (!exe || !expected) throw new Error('HARDWARE_LAB_EXE et EXPECTED_VERSION sont requis')

const app = await electron.launch({ executablePath: exe, args: [] })
const page = await app.firstWindow()
await page.waitForSelector('[data-testid="intro"], .main-menu', { timeout: 20000 })
if (await page.$('[data-testid="intro"]')) await page.keyboard.press('Escape')
await page.waitForSelector('.main-menu')
const installed = (await page.textContent('.main-menu__footer'))?.trim()
console.log(`Version lancée : ${installed}`)

await page.click('text=Paramètres')
await page.waitForSelector('.update-controls')
// Modifie un paramètre : il doit survivre à la mise à jour (et être migré par la nouvelle version).
await page.click('button[role="switch"][aria-label="Mémoriser la taille et la position de la fenêtre"]')
await page.waitForTimeout(800)
const status = () => page.textContent('.update-controls__status').then((text) => text?.trim() ?? '')

// La recherche automatique au démarrage peut déjà être en cours.
const check = page.locator('button:has-text("Rechercher des mises à jour")')
if (await check.isVisible() && (await check.isEnabled())) await check.click()
await page.waitForFunction(
  (version) => new RegExp(`Version ${version.replace(/\./g, '\\.')} (disponible|prête)`).test(document.querySelector('.update-controls__status')?.textContent ?? ''),
  expected,
  { timeout: 60000 }
)
console.log(`Mise à jour trouvée : ${await status()}`)

const download = page.locator('button:has-text("Télécharger")')
if (await download.isVisible()) await download.click()
await page.waitForFunction(() => /prête à être installée/.test(document.querySelector('.update-controls__status')?.textContent ?? ''), null, { timeout: 300000 })
console.log(`Téléchargement terminé : ${await status()}`)

const closed = app.waitForEvent('close', { timeout: 60000 })
await page.click('button:has-text("Redémarrer et installer")')
await closed
console.log('Application fermée pour installation.')
process.exit(0)
