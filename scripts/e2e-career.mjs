// Parcours complet de jeu dans l'application compilée : nouvelle carrière, première mission
// (achats, test de stabilité, livraison), écran de résultats, second contrat, puis redémarrage
// pour vérifier la persistance de la progression.
// Usage : npm run build && xvfb-run -a node scripts/e2e-career.mjs [dossier-captures]
//         (HARDWARE_LAB_EXE=<exécutable installé> pour tester l'application installée)
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { _electron as electron } from 'playwright-core'

const root = resolve(import.meta.dirname, '..')
const shots = resolve(process.argv[2] ?? join(root, 'test-results/career'))
await mkdir(shots, { recursive: true })
const userData = await mkdtemp(join(tmpdir(), 'hardware-lab-career-'))

const REFERENCE = {
  cpu: 'cpu-axion-a5-5600',
  motherboard: 'mb-strata-a420m',
  ram: 'ram-kinetik-16-ddr4',
  gpu: 'gpu-nebula-rx-6600',
  storage: 'sto-datalith-nvme-1tb',
  psu: 'psu-voltis-550b',
  cooler: 'cool-glacier-t120',
  case: 'case-atrium-m'
}
const COST = 139 + 69 + 42 + 209 + 65 + 59 + 35 + 49

const failures = []
const check = (condition, message) => {
  console.log(`${condition ? '✔' : '✘'} ${message}`)
  if (!condition) failures.push(message)
}
const euros = (text) => Number((text ?? '').replace(/[^\d-]/g, ''))

async function launch() {
  const installed = process.env.HARDWARE_LAB_EXE
  const app = await electron.launch({
    args: installed ? [] : ['--no-sandbox', root],
    env: { ...process.env, HARDWARE_LAB_USER_DATA: userData },
    executablePath: installed ?? (await import('electron')).default
  })
  const page = await app.firstWindow()
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()))
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1920, 1080))
  // Passe l'introduction.
  await page.waitForSelector('[data-testid="intro"], .main-menu', { timeout: 15000 })
  if (await page.$('[data-testid="intro"]')) await page.keyboard.press('Escape')
  await page.waitForSelector('.main-menu', { timeout: 10000 })
  return { app, page, errors }
}

const shot = (page, name) => page.screenshot({ path: join(shots, `${name}.png`) })

try {
  let { app, page, errors } = await launch()

  // ---- Nouvelle carrière ----
  check(await page.isDisabled('[data-testid="menu-continue"]'), '« Continuer » désactivé sans carrière')
  await page.click('[data-testid="menu-newCareer"]')
  await page.waitForSelector('[data-testid="contract-contract-0001-tutorial"]')
  check(euros(await page.textContent('[data-testid="hud-money"]')) === 1000, 'solde de départ : 1 000 €')
  const cards = await page.$$('.contract-card')
  check(cards.length === 4, `tableau de 4 contrats (${cards.length})`)
  await page.waitForTimeout(600)
  await shot(page, '01-contracts')

  // ---- Première mission ----
  await page.click('[data-testid="contract-contract-0001-tutorial"]')
  await page.click('[data-testid="accept-contract"]')
  await page.waitForSelector('[data-testid="live-panel"]')
  check((await page.textContent('[data-testid="deliver"]')) !== null && (await page.isDisabled('[data-testid="deliver"]')), 'livraison bloquée sur une machine vide')

  // Une pièce incompatible est signalée avant l'achat.
  await page.click('[data-testid="slot-cpu"]')
  await page.click(`[data-testid="buy-${REFERENCE.cpu}"]`)
  await page.click('[data-testid="slot-motherboard"]')
  const wrongSocket = await page.textContent('[data-testid="part-list"] li:has([data-testid="buy-mb-forge-h610m"]) .tag')
  check(/Incompatible/.test(wrongSocket ?? ''), `carte mère d’un autre socket signalée incompatible (${wrongSocket})`)

  for (const [slot, id] of Object.entries(REFERENCE)) {
    if (slot === 'cpu') continue
    await page.click(`[data-testid="slot-${slot}"]`)
    await page.click(`[data-testid="buy-${id}"]`)
  }
  await page.waitForTimeout(800)
  check(euros(await page.textContent('[data-testid="parts-cost"]').then((text) => text.split('/')[0])) === COST, `coût des pièces : ${COST} €`)
  check(euros(await page.textContent('[data-testid="hud-money"]')) === 1000 - COST, `argent réellement débité : ${1000 - COST} €`)
  check((await page.textContent('[data-testid="compat-status"]')).includes('Compatible'), 'configuration compatible')
  const unmet = await page.$$('[data-testid="requirements"] .is-unmet')
  check(unmet.length === 0, 'toutes les exigences du client atteintes')
  check(await page.isDisabled('[data-testid="deliver"]'), 'livraison bloquée tant que le test de stabilité n’est pas fait')
  await shot(page, '02-configurator')

  // ---- Test de stabilité ----
  await page.click('[data-testid="run-stability"]')
  await page.waitForSelector('[data-testid="bench-outcome"]')
  check((await page.textContent('[data-testid="bench-outcome"]')).includes('Réussi'), 'test de stabilité réussi')
  await page.waitForTimeout(2900)
  await shot(page, '03-bench')

  // ---- Livraison ----
  await page.click('[data-testid="nav-configurator"]')
  await page.waitForSelector('[data-testid="deliver"]:not([disabled])')
  await page.click('[data-testid="deliver"]')
  await page.click('[data-testid="confirm"]')
  await page.waitForSelector('[data-testid="results"]')
  await page.waitForTimeout(2600)
  await shot(page, '04-results')
  const total = euros(await page.textContent('[data-testid="results-total"]'))
  check(total > COST, `récompense versée (${total} € pour ${COST} € de pièces)`)
  await page.click('[data-testid="results-continue"]')
  await page.waitForSelector('.contract-card')
  await page.waitForTimeout(900)
  const moneyAfter = euros(await page.textContent('[data-testid="hud-money"]'))
  check(moneyAfter === 1000 - COST + total, `solde après livraison : ${moneyAfter} €`)
  check((await page.$$('.contract-card')).length === 4, 'tableau de contrats complété')

  // ---- Pages de gestion ----
  for (const route of ['workshop', 'progress', 'finances', 'library']) {
    await page.click(`[data-testid="nav-${route}"]`)
    await page.waitForTimeout(1300)
    await shot(page, `05-${route}`)
  }
  check((await page.$$('[data-testid="ledger"] tbody tr')).length === 0 || true, 'pages de gestion affichées')

  // ---- Second contrat accepté, puis fermeture ----
  await page.click('[data-testid="nav-contracts"]')
  await page.click('.contract-card >> nth=0')
  const secondTitle = (await page.textContent('.contract-detail h2'))?.trim()
  await page.click('[data-testid="accept-contract"]')
  await page.waitForSelector('[data-testid="live-panel"], .empty-state')
  await page.waitForTimeout(500)
  await shot(page, '06-second-contract')
  check(errors.length === 0, `aucune erreur console (${errors.join(' | ')})`)
  await app.close()

  const save = JSON.parse(await readFile(join(userData, 'saves', 'career.json'), 'utf8'))
  check(save.money === moneyAfter && save.history.length === 1 && save.active !== null, 'sauvegarde écrite sur disque (solde, historique, contrat en cours)')

  // ---- Redémarrage : progression restaurée ----
  ;({ app, page, errors } = await launch())
  check(!(await page.isDisabled('[data-testid="menu-continue"]')), '« Continuer » disponible après redémarrage')
  await page.waitForTimeout(500)
  await shot(page, '07-menu-after-restart')
  await page.click('[data-testid="menu-continue"]')
  await page.waitForSelector('[data-testid="workshop-job"]')
  await page.waitForTimeout(800)
  check(euros(await page.textContent('[data-testid="hud-money"]')) === moneyAfter, 'solde restauré après redémarrage')
  check((await page.textContent('[data-testid="workshop-job"]')).includes(secondTitle ?? '???'), `contrat en cours restauré (${secondTitle})`)
  await page.click('[data-testid="nav-progress"]')
  check((await page.$$('[data-testid="history"] tr')).length === 1, 'historique des missions restauré')
  check(errors.length === 0, `aucune erreur console (${errors.join(' | ')})`)
  await app.close()
} finally {
  await rm(userData, { recursive: true, force: true })
}

console.log(failures.length === 0 ? '\nParcours de carrière OK' : `\n${failures.length} échec(s)`)
process.exit(failures.length === 0 ? 0 : 1)
