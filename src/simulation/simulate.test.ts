import { describe, expect, it } from 'vitest'
import { runBenchTest } from './bench'
import { isSimulable, performance, resolveBuild, simulate, type CompleteBuild } from './simulate'
import { GAMING_BUILD, HIGH_END_BUILD } from './test-builds'
import { HEALTHY, type BuildIds } from './types'

function complete(ids: BuildIds): CompleteBuild {
  const build = resolveBuild(ids)
  if (!isSimulable(build)) throw new Error('configuration incomplète')
  return build
}

describe('puissance électrique', () => {
  it('augmente avec la charge', () => {
    const build = complete(GAMING_BUILD)
    const loads = (['idle', 'office', 'gaming', 'full'] as const).map((load) => simulate(build, load).systemPower)
    for (let i = 1; i < loads.length; i++) expect(loads[i]).toBeGreaterThan(loads[i - 1]!)
  })

  it('reste dans les ordres de grandeur réels', () => {
    expect(simulate(complete(GAMING_BUILD), 'full').systemPower).toBeGreaterThan(200)
    expect(simulate(complete(GAMING_BUILD), 'full').systemPower).toBeLessThan(320)
    expect(simulate(complete(HIGH_END_BUILD), 'full').systemPower).toBeGreaterThan(650)
    expect(simulate(complete(GAMING_BUILD), 'idle').systemPower).toBeLessThan(90)
  })

  it('consomme plus à la prise qu’en sortie d’alimentation (rendement)', () => {
    const snapshot = simulate(complete(GAMING_BUILD), 'gaming')
    expect(snapshot.wallPower).toBeCloseTo(snapshot.systemPower / 0.85, 5)
  })

  it('une alimentation dégradée perd de la capacité et coupe la machine', () => {
    const build = complete({ ...HIGH_END_BUILD, gpu: 'gpu-nebula-rx-7900' })
    expect(simulate(build, 'full').psuTrip).toBe(false)
    expect(simulate(build, 'full', { ...HEALTHY, degradedPsu: true }).psuTrip).toBe(true)
  })
})

describe('températures', () => {
  it('un meilleur refroidisseur abaisse la température processeur', () => {
    const box = simulate(complete({ ...GAMING_BUILD, cooler: 'cool-glacier-box' }), 'cpu').cpuTemp
    const tower = simulate(complete(GAMING_BUILD), 'cpu').cpuTemp
    expect(tower).toBeLessThan(box)
  })

  it('un boîtier mieux ventilé abaisse les températures', () => {
    const base = { ...GAMING_BUILD, motherboard: 'mb-strata-b550' }
    const small = simulate(complete({ ...base, case: 'case-atrium-a' }), 'full')
    const mesh = simulate(complete({ ...base, case: 'case-monolith-mesh' }), 'full')
    expect(mesh.caseTemp).toBeLessThan(small.caseTemp)
    expect(mesh.gpuTemp!).toBeLessThan(small.gpuTemp!)
  })

  it('la poussière et la pâte sèche font chauffer jusqu’à la réduction de fréquence', () => {
    const build = complete({ ...GAMING_BUILD, cpu: 'cpu-axion-a7-7700', motherboard: 'mb-strata-b650', ram: 'ram-kinetik-32-ddr5', case: 'case-atrium-a' })
    const healthy = simulate(build, 'full')
    const dusty = simulate(build, 'full', { ...HEALTHY, airflowFactor: 0.35 })
    const paste = simulate(build, 'full', { ...HEALTHY, driedPaste: true })
    expect(dusty.caseTemp).toBeGreaterThan(healthy.caseTemp + 10)
    expect(paste.cpuThrottled).toBe(true)
    expect(paste.cpuScale).toBeLessThan(1)
    expect(paste.cpuTemp).toBeLessThanOrEqual(95.01)
  })

  it('la réduction de fréquence diminue les performances', () => {
    const ids = { ...GAMING_BUILD, cpu: 'cpu-axion-a7-7700', motherboard: 'mb-strata-b650', ram: 'ram-kinetik-32-ddr5', case: 'case-atrium-a' }
    const good = performance(complete(ids))
    const bad = performance(complete(ids), { ...HEALTHY, driedPaste: true })
    expect(bad.creationScore).toBeLessThan(good.creationScore)
  })
})

describe('performances', () => {
  it('une carte graphique plus puissante donne plus d’images par seconde', () => {
    const base = { ...GAMING_BUILD, case: 'case-atrium-a', psu: 'psu-voltis-650g' }
    const low = performance(complete(base)).fps['1440p']
    const high = performance(complete({ ...base, gpu: 'gpu-nebula-rx-7700' })).fps['1440p']
    expect(high).toBeGreaterThan(low * 1.3)
  })

  it('identifie le composant limitant', () => {
    expect(performance(complete(GAMING_BUILD)).gamingBottleneck).toBe('gpu')
    const cpuBound = { ...GAMING_BUILD, cpu: 'cpu-axion-a3-3400', gpu: 'gpu-vektor-rtx-4070', case: 'case-atrium-a', psu: 'psu-voltis-650g' }
    expect(performance(complete(cpuBound)).gamingBottleneck).toBe('cpu')
  })

  it('pénalise une seule barrette et peu de mémoire', () => {
    const dual = performance(complete(GAMING_BUILD)).fps['1080p']
    const single = performance(complete({ ...GAMING_BUILD, ram: 'ram-kinetik-8-ddr4' })).fps['1080p']
    expect(single).toBeLessThan(dual * 0.8)
  })

  it('les résolutions élevées réduisent les FPS', () => {
    const fps = performance(complete(HIGH_END_BUILD)).fps
    expect(fps['1080p']).toBeGreaterThan(fps['1440p'])
    expect(fps['1440p']).toBeGreaterThan(fps['4k'])
  })

  it('un SSD améliore l’indice bureautique par rapport à un disque dur', () => {
    const ssd = performance(complete(GAMING_BUILD)).officeScore
    const hdd = performance(complete({ ...GAMING_BUILD, storage: 'sto-datalith-hdd-1tb' })).officeScore
    expect(hdd).toBeLessThan(ssd)
  })

  it('est déterministe', () => {
    expect(performance(complete(HIGH_END_BUILD))).toEqual(performance(complete(HIGH_END_BUILD)))
    expect(simulate(complete(GAMING_BUILD), 'full')).toEqual(simulate(complete(GAMING_BUILD), 'full'))
  })
})

describe('banc de test', () => {
  it('une configuration saine passe le test de stabilité', () => {
    const result = runBenchTest('stability', complete(GAMING_BUILD), HEALTHY)
    expect(result.outcome).toBe('pass')
    expect(result.samples.length).toBe(61)
    // Les températures montent progressivement vers l'équilibre.
    expect(result.samples[0]!.cpuTemp).toBeLessThan(result.samples[60]!.cpuTemp)
  })

  it('une alimentation trop juste provoque un arrêt brutal', () => {
    const ids = { ...HIGH_END_BUILD, psu: 'psu-voltis-650g', gpu: 'gpu-nebula-rx-7900' }
    const result = runBenchTest('stability', complete(ids), HEALTHY)
    expect(result.outcome).toBe('fail')
    expect(result.events.some((event) => event.code === 'shutdown')).toBe(true)
    expect(result.elapsedMin).toBeLessThan(30)
  })

  it('une barrette défectueuse : écran bleu en stabilité, erreurs au test mémoire', () => {
    const build = complete(GAMING_BUILD)
    const condition = { ...HEALTHY, faultyRam: true }
    expect(runBenchTest('stability', build, condition).events.map((event) => event.code)).toContain('bsod-memory')
    expect(runBenchTest('memtest', build, condition).outcome).toBe('fail')
    expect(runBenchTest('memtest', build, HEALTHY).outcome).toBe('pass')
  })

  it('l’inspection révèle la poussière, les outils révèlent l’alimentation et le stockage', () => {
    const build = complete(GAMING_BUILD)
    expect(runBenchTest('inspection', build, { ...HEALTHY, airflowFactor: 0.35 }).outcome).toBe('warning')
    expect(runBenchTest('psu-tester', build, { ...HEALTHY, degradedPsu: true }).outcome).toBe('fail')
    expect(runBenchTest('smart', build, { ...HEALTHY, failingStorage: true }).outcome).toBe('fail')
    expect(runBenchTest('smart', build, HEALTHY).outcome).toBe('pass')
  })

  it('signale la réduction de fréquence sans planter', () => {
    const ids = { ...GAMING_BUILD, cooler: 'cool-glacier-box', cpu: 'cpu-corvex-c5-12400', motherboard: 'mb-forge-h610m' }
    const result = runBenchTest('stress-cpu', complete(ids), { ...HEALTHY, driedPaste: true })
    expect(result.outcome).toBe('warning')
    expect(result.events.map((event) => event.code)).toContain('cpu-throttle')
    expect(result.metrics.minCpuClock!).toBeLessThan(100)
  })
})
