// Test de fumée : lance l'application compilée (out/), capture l'introduction et le menu,
// modifie un paramètre puis relance l'application pour vérifier sa persistance.
// Usage : npm run build && xvfb-run -a node scripts/smoke-test.mjs [dossier-captures]
// Avec HARDWARE_LAB_EXE=<chemin de l'exécutable installé>, teste l'application installée.
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { _electron as electron } from 'playwright-core'

const root = resolve(import.meta.dirname, '..')
const shots = resolve(process.argv[2] ?? join(root, 'test-results/smoke'))
await mkdir(shots, { recursive: true })
const userData = await mkdtemp(join(tmpdir(), 'hardware-lab-smoke-'))

const failures = []
const check = (condition, message) => {
  console.log(`${condition ? '✔' : '✘'} ${message}`)
  if (!condition) failures.push(message)
}

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
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1600, 900))
  return { app, page, errors }
}

try {
  // ---- Premier lancement : introduction complète ----
  let { app, page, errors } = await launch()
  await page.waitForSelector('[data-testid="intro"]', { timeout: 10000 })
  check(true, 'introduction affichée au démarrage')

  const security = await page.evaluate(() => ({
    require: typeof window.require,
    process: typeof window.process,
    api: Object.keys(window.hardwareLab ?? {}).sort().join(',')
  }))
  check(security.require === 'undefined' && security.process === 'undefined', 'aucun accès Node dans le renderer')
  check(security.api === 'checkForUpdates,downloadUpdate,getAppInfo,getSettings,getUpdateStatus,installUpdate,onUpdateStatus,openDataFolder,quit,saveSettings', `API preload limitée (${security.api})`)

  // Durée réelle mesurée dans la page (indépendante de la lenteur des captures).
  const introMs = await page.evaluate(
    () =>
      new Promise((done) => {
        const t0 = performance.now()
        const timer = setInterval(() => {
          if (!document.querySelector('[data-testid="intro"]')) {
            clearInterval(timer)
            done(Math.round(performance.now() - t0))
          }
        }, 20)
      })
  )
  check(introMs > 3000 && introMs < 5200, `introduction terminée en ${introMs} ms (cible 3 à 5 s)`)
  await page.waitForSelector('.main-menu')

  // Captures image par image : les minuteries de fin sont retenues et chaque animation CSS
  // est positionnée à un instant précis via l'API Web Animations.
  await page.addInitScript(() => {
    const original = window.setTimeout.bind(window)
    window.__held = []
    window.setTimeout = (fn, ms, ...args) => {
      if (ms >= 1000) {
        window.__held.push(() => fn(...args))
        return -1
      }
      return original(fn, ms, ...args)
    }
  })
  await page.reload()
  await page.waitForSelector('[data-testid="intro"]', { timeout: 10000 })
  await page.waitForTimeout(500)
  for (const at of [250, 700, 1100, 1500, 1900, 2300, 2800, 3500]) {
    await page.evaluate((time) => {
      document.getAnimations().forEach((animation) => {
        animation.pause()
        animation.currentTime = time
      })
    }, at)
    await page.waitForTimeout(150)
    await page.screenshot({ path: join(shots, `intro-${String(at).padStart(4, '0')}ms.png`) })
  }
  await page.evaluate(() => {
    document.getAnimations().forEach((animation) => animation.play())
    window.__held.forEach((fn) => fn())
  })
  await page.waitForSelector('[data-testid="intro"]', { state: 'detached', timeout: 5000 })
  check(true, 'sortie de l’introduction vers le menu')
  await page.waitForTimeout(900)
  await page.screenshot({ path: join(shots, 'menu.png') })

  const version = await page.textContent('.main-menu__footer')
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  check(version?.includes(pkg.version), `version affichée (${version?.trim()})`)
  const disabled = await page.$$eval('.menu-item:disabled', (els) => els.length)
  check(disabled === 5, `entrées non encore développées désactivées (${disabled})`)

  // ---- Paramètres : désactiver l'introduction, passer en anglais ----
  await page.click('text=Paramètres')
  await page.waitForSelector('.subpage')
  await page.click('button[role="radio"]:has-text("Plein écran")')
  await page.waitForTimeout(800)
  const fullscreen = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen())
  check(fullscreen, 'mode plein écran appliqué à la fenêtre')
  await page.click('button[role="radio"]:has-text("Fenêtré")')
  await page.waitForTimeout(800)
  const windowed = await app.evaluate(({ BrowserWindow }) => !BrowserWindow.getAllWindows()[0].isFullScreen())
  check(windowed, 'retour au mode fenêtré')
  // Mises à jour : en développement le bouton est désactivé ; installé, une vraie recherche a lieu.
  const checkButton = page.locator('button:has-text("Rechercher des mises à jour")')
  if (process.env.HARDWARE_LAB_EXE) {
    await checkButton.click()
    await page.waitForFunction(
      () => !/Recherche en cours|Aucune recherche/.test(document.querySelector('.update-controls__status')?.textContent ?? ''),
      null,
      { timeout: 30000 }
    )
    const updateText = await page.textContent('.update-controls__status')
    check(!/Indisponible/.test(updateText ?? ''), `recherche de mise à jour effectuée : ${updateText?.trim()}`)
  } else {
    check(await checkButton.isDisabled(), 'mises à jour désactivées en développement')
  }
  await page.click('button[role="switch"][aria-label="Introduction au lancement"]')
  await page.click('button[role="radio"]:has-text("English")')
  await page.waitForSelector('text=Saved')
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(shots, 'settings.png') })
  const saved = JSON.parse(await readFile(join(userData, 'settings.json'), 'utf8'))
  check(saved.intro.enabled === false && saved.language === 'en', 'paramètres écrits sur disque')

  await page.keyboard.press('Escape')
  await page.waitForSelector('.main-menu')
  await page.click('text=Release notes')
  await page.waitForSelector('.release')
  await page.waitForTimeout(500)
  await page.screenshot({ path: join(shots, 'release-notes.png') })
  check(errors.length === 0, `aucune erreur console (${errors.join(' | ')})`)
  await app.close()

  // ---- Second lancement : persistance ----
  ;({ app, page, errors } = await launch())
  await page.waitForSelector('.main-menu', { timeout: 10000 })
  const introShown = await page.$('[data-testid="intro"]')
  check(introShown === null, 'introduction désactivée conservée après redémarrage')
  const label = await page.textContent('.menu-item >> nth=5')
  check(label?.includes('Settings'), 'langue conservée après redémarrage')

  // ---- Réduction des animations ----
  await page.click('text=Settings')
  await page.click('button[role="radio"]:has-text("Reduced")')
  await page.waitForTimeout(300)
  const motion = await page.evaluate(() => document.documentElement.dataset.motion)
  check(motion === 'reduced', 'réduction des animations appliquée')
  // Restaure l'intro (en mode réduit) pour le lancement suivant.
  await page.click('button[role="switch"][aria-label="Launch sequence"]')
  await page.waitForTimeout(300)
  await app.close()

  ;({ app, page, errors } = await launch())
  await page.waitForSelector('[data-testid="intro"]', { timeout: 10000 })
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(shots, 'intro-reduced.png') })
  await page.keyboard.press('Escape')
  await page.waitForSelector('[data-testid="intro"]', { state: 'detached', timeout: 3000 })
  check(true, 'introduction réduite affichée puis passée avec Échap')
  check(errors.length === 0, `aucune erreur console (${errors.join(' | ')})`)
  await app.close()
} finally {
  await rm(userData, { recursive: true, force: true })
}

console.log(failures.length === 0 ? '\nSmoke test OK' : `\n${failures.length} échec(s)`)
process.exit(failures.length === 0 ? 0 : 1)
