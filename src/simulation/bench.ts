import type { LocalizedText } from '@shared/localized'
import { CPU_TJMAX, GPU_TEMP_LIMIT, simulate, type CompleteBuild, type LoadProfile } from './simulate'
import type { MachineCondition } from './types'

/*
 * Tests du banc d'essai. Chaque test rejoue la simulation dans le temps : les températures
 * montent vers leur valeur d'équilibre (constante de temps), les limites se déclenchent quand
 * elles sont atteintes, et les pannes de la machine produisent leurs symptômes à des instants
 * déterminés par la configuration — jamais par un tirage aléatoire.
 */

export type BenchTestId = 'inspection' | 'stress-cpu' | 'stress-gpu' | 'stability' | 'memtest' | 'psu-tester' | 'smart'
export type ToolId = 'psu-tester' | 'storage-suite' | 'pro-bench' | 'workshop-extension'

export type BenchTestInfo = {
  id: BenchTestId
  /** Heures d'atelier consommées. */
  hours: number
  /** Outil à posséder pour lancer le test. */
  tool?: ToolId
  /** Charge simulée (tests de charge uniquement). */
  load?: LoadProfile
  durationMin: number
  name: LocalizedText
  description: LocalizedText
}

const t = (fr: string, en: string): LocalizedText => ({ fr, en })

export const BENCH_TESTS: BenchTestInfo[] = [
  { id: 'inspection', hours: 0.5, durationMin: 0, name: t('Inspection visuelle', 'Visual inspection'), description: t('Ouvrir la machine et examiner l’intérieur.', 'Open the machine and look inside.') },
  { id: 'stress-cpu', hours: 1, load: 'cpu', durationMin: 20, name: t('Charge processeur', 'CPU stress'), description: t('Processeur à 100 % pendant 20 minutes : températures, fréquence.', 'CPU at 100% for 20 minutes: temperatures, clocks.') },
  { id: 'stress-gpu', hours: 1, load: 'gpu', durationMin: 20, name: t('Charge graphique', 'GPU stress'), description: t('Carte graphique à 100 % pendant 20 minutes.', 'Graphics card at 100% for 20 minutes.') },
  { id: 'stability', hours: 2, load: 'full', durationMin: 30, name: t('Test de stabilité', 'Stability test'), description: t('Charge combinée maximale pendant 30 minutes. Obligatoire avant livraison.', 'Combined maximum load for 30 minutes. Required before delivery.') },
  { id: 'memtest', hours: 3, durationMin: 0, name: t('Test mémoire', 'Memory test'), description: t('Quatre passes complètes sur toute la mémoire.', 'Four full passes over all memory.') },
  { id: 'psu-tester', hours: 0.5, tool: 'psu-tester', durationMin: 0, name: t('Mesure de l’alimentation', 'PSU measurement'), description: t('Tensions des rails sous charge contrôlée.', 'Rail voltages under controlled load.') },
  { id: 'smart', hours: 0.5, tool: 'storage-suite', durationMin: 0, name: t('Diagnostic du stockage', 'Storage diagnostics'), description: t('Lecture des compteurs S.M.A.R.T. et test de surface.', 'S.M.A.R.T. counters and surface scan.') }
]

export function benchTest(id: BenchTestId): BenchTestInfo {
  return BENCH_TESTS.find((test) => test.id === id)!
}

export type Sample = { t: number; cpuTemp: number; gpuTemp: number | null; power: number; cpuClock: number; gpuClock: number }

export type BenchEventCode = 'shutdown' | 'bsod-memory' | 'cpu-throttle' | 'gpu-throttle' | 'vrm-limit' | 'io-errors'
export type BenchEvent = { t: number; code: BenchEventCode }

export type BenchOutcome = 'pass' | 'warning' | 'fail'

export type BenchResult = {
  test: BenchTestId
  outcome: BenchOutcome
  /** Durée réellement écoulée (inférieure à la durée prévue en cas d'arrêt). */
  elapsedMin: number
  samples: Sample[]
  events: BenchEvent[]
  findings: LocalizedText[]
  metrics: { maxCpuTemp: number | null; maxGpuTemp: number | null; maxPower: number | null; minCpuClock: number | null; minGpuClock: number | null }
}

const STEP_MIN = 0.5
const CPU_TAU_MIN = 2.5
const GPU_TAU_MIN = 4
const POWER_TAU_MIN = 0.4

const formatTime = (minutes: number) => {
  const m = Math.floor(minutes)
  const s = Math.round((minutes - m) * 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function runLoadTest(info: BenchTestInfo, build: CompleteBuild, condition: MachineCondition): BenchResult {
  const load = info.load!
  const idle = simulate(build, 'idle', condition)
  const steady = simulate(build, load, condition)
  const samples: Sample[] = []
  const events: BenchEvent[] = []
  const findings: LocalizedText[] = []

  // Instant de la panne, s'il y en a une, imposé par la configuration.
  let crashAt: { t: number; code: BenchEventCode } | null = null
  const gpuHeavy = load === 'gpu' || load === 'full'
  if (steady.systemPower > steady.psuCapacity) crashAt = { t: 0.5, code: 'shutdown' }
  else if (steady.psuTrip && gpuHeavy) {
    // Plus le dépassement est faible, plus il faut de temps pour qu'un pic coïncide.
    const overshoot = steady.peakPower / steady.psuCapacity - 1
    crashAt = { t: Math.max(1, Math.min(info.durationMin - 2, Math.round((6 - overshoot * 40) * 2) / 2)), code: 'shutdown' }
  } else if (condition.faultyRam && (load === 'full' || load === 'cpu')) {
    crashAt = { t: load === 'full' ? 14 : 17.5, code: 'bsod-memory' }
  }

  let cpuThrottleAt: number | null = null
  let gpuThrottleAt: number | null = null
  for (let time = 0; time <= info.durationMin + 1e-9; time += STEP_MIN) {
    if (crashAt && time > crashAt.t) break
    const cpuTemp = steady.cpuTemp + (idle.cpuTemp - steady.cpuTemp) * Math.exp(-time / CPU_TAU_MIN)
    const gpuTemp =
      steady.gpuTemp !== null && idle.gpuTemp !== null ? steady.gpuTemp + (idle.gpuTemp - steady.gpuTemp) * Math.exp(-time / GPU_TAU_MIN) : null
    const power = steady.systemPower + (idle.systemPower - steady.systemPower) * Math.exp(-time / POWER_TAU_MIN)
    const cpuHot = steady.cpuThrottled && cpuTemp >= CPU_TJMAX - 1
    const gpuHot = steady.gpuThrottled && gpuTemp !== null && gpuTemp >= GPU_TEMP_LIMIT - 1
    if (cpuHot && cpuThrottleAt === null) cpuThrottleAt = time
    if (gpuHot && gpuThrottleAt === null) gpuThrottleAt = time
    const vrm = steady.vrmLimited ? steady.cpuScale : 1
    samples.push({
      t: time,
      cpuTemp: Math.round(cpuTemp * 10) / 10,
      gpuTemp: gpuTemp === null ? null : Math.round(gpuTemp * 10) / 10,
      power: Math.round(power),
      cpuClock: Math.round((cpuHot ? steady.cpuScale : vrm) * 1000) / 10,
      gpuClock: Math.round((gpuHot ? steady.gpuScale : 1) * 1000) / 10
    })
  }

  if (steady.vrmLimited) {
    events.push({ t: 0, code: 'vrm-limit' })
    findings.push(t(`Puissance processeur plafonnée à ${build.motherboard.vrmLimit} W par la carte mère, dès le début du test.`, `CPU power capped at ${build.motherboard.vrmLimit} W by the motherboard from the start.`))
  }
  if (cpuThrottleAt !== null) {
    events.push({ t: cpuThrottleAt, code: 'cpu-throttle' })
    findings.push(
      t(
        `Le processeur atteint ${CPU_TJMAX} °C à ${formatTime(cpuThrottleAt)} et réduit sa fréquence de ${Math.round((1 - steady.cpuScale) * 100)} %.`,
        `The CPU hits ${CPU_TJMAX} °C at ${formatTime(cpuThrottleAt)} and lowers its clock by ${Math.round((1 - steady.cpuScale) * 100)}%.`
      )
    )
  }
  if (gpuThrottleAt !== null) {
    events.push({ t: gpuThrottleAt, code: 'gpu-throttle' })
    findings.push(
      t(
        `La carte graphique atteint ${GPU_TEMP_LIMIT} °C à ${formatTime(gpuThrottleAt)} et ralentit de ${Math.round((1 - steady.gpuScale) * 100)} %.`,
        `The graphics card reaches ${GPU_TEMP_LIMIT} °C at ${formatTime(gpuThrottleAt)} and slows down by ${Math.round((1 - steady.gpuScale) * 100)}%.`
      )
    )
  }
  if (crashAt) {
    events.push(crashAt)
    findings.push(
      crashAt.code === 'shutdown'
        ? t(`Arrêt brutal à ${formatTime(crashAt.t)} : écran noir, la machine s’éteint net, sans message d’erreur.`, `Hard shutdown at ${formatTime(crashAt.t)}: black screen, the machine powers off instantly, no error message.`)
        : t(`Écran bleu « MEMORY_MANAGEMENT » à ${formatTime(crashAt.t)}.`, `“MEMORY_MANAGEMENT” blue screen at ${formatTime(crashAt.t)}.`)
    )
  }
  if (load === 'full' && condition.failingStorage && !crashAt) {
    events.push({ t: info.durationMin * 0.6, code: 'io-errors' })
    findings.push(t('Le journal système signale des erreurs de lecture disque pendant le test.', 'The system log reports disk read errors during the test.'))
  }

  const temps = samples.map((sample) => sample.cpuTemp)
  const gpuTemps = samples.map((sample) => sample.gpuTemp).filter((value): value is number => value !== null)
  if (findings.length === 0) {
    findings.push(
      t(
        `Aucune anomalie. Processeur ${Math.round(Math.max(...temps))} °C${gpuTemps.length ? `, carte graphique ${Math.round(Math.max(...gpuTemps))} °C` : ''}, ${Math.round(steady.systemPower)} W.`,
        `No anomaly. CPU ${Math.round(Math.max(...temps))} °C${gpuTemps.length ? `, GPU ${Math.round(Math.max(...gpuTemps))} °C` : ''}, ${Math.round(steady.systemPower)} W.`
      )
    )
  }

  const outcome: BenchOutcome = crashAt ? 'fail' : events.length > 0 ? 'warning' : 'pass'
  return {
    test: info.id,
    outcome,
    elapsedMin: crashAt ? crashAt.t : info.durationMin,
    samples,
    events,
    findings,
    metrics: {
      maxCpuTemp: Math.max(...temps),
      maxGpuTemp: gpuTemps.length ? Math.max(...gpuTemps) : null,
      maxPower: Math.max(...samples.map((sample) => sample.power)),
      minCpuClock: Math.min(...samples.map((sample) => sample.cpuClock)),
      minGpuClock: build.gpu ? Math.min(...samples.map((sample) => sample.gpuClock)) : null
    }
  }
}

function instantResult(test: BenchTestId, outcome: BenchOutcome, findings: LocalizedText[]): BenchResult {
  return {
    test,
    outcome,
    elapsedMin: 0,
    samples: [],
    events: [],
    findings,
    metrics: { maxCpuTemp: null, maxGpuTemp: null, maxPower: null, minCpuClock: null, minGpuClock: null }
  }
}

/** Exécute un test sur une machine complète. */
export function runBenchTest(id: BenchTestId, build: CompleteBuild, condition: MachineCondition): BenchResult {
  const info = benchTest(id)
  switch (id) {
    case 'stress-cpu':
    case 'stress-gpu':
    case 'stability':
      if (id === 'stress-gpu' && !build.gpu) {
        return instantResult(id, 'pass', [t('Pas de carte graphique dédiée : test sans objet.', 'No dedicated graphics card: test not applicable.')])
      }
      return runLoadTest(info, build, condition)
    case 'memtest':
      return condition.faultyRam
        ? instantResult(id, 'fail', [
            t(`1 284 erreurs détectées dès la première passe, toutes sur la barrette n° ${build.ram.modules}.`, `1,284 errors in the first pass, all on stick #${build.ram.modules}.`)
          ])
        : instantResult(id, 'pass', [t(`4 passes sur ${build.ram.capacityGb} Go : aucune erreur.`, `4 passes over ${build.ram.capacityGb} GB: no errors.`)])
    case 'inspection': {
      const findings: LocalizedText[] = []
      if (condition.airflowFactor < 0.7) {
        findings.push(t('Filtres, ventilateurs et radiateurs fortement encrassés par la poussière.', 'Filters, fans and heatsinks heavily clogged with dust.'))
      } else findings.push(t('Intérieur propre, câblage correct.', 'Clean interior, tidy cabling.'))
      findings.push(
        build.cooler.kind === 'aio'
          ? t('Watercooling : pompe audible, aucune fuite.', 'Liquid cooler: pump audible, no leak.')
          : t(`Ventirad ${build.cooler.brand} ${build.cooler.model} en place. La pâte thermique n’est pas visible sans démontage.`, `${build.cooler.brand} ${build.cooler.model} cooler fitted. Thermal paste is not visible without removing it.`)
      )
      return instantResult(id, condition.airflowFactor < 0.7 ? 'warning' : 'pass', findings)
    }
    case 'psu-tester':
      return condition.degradedPsu
        ? instantResult(id, 'fail', [
            t('Rail +12 V : 11,1 V à 60 % de charge (tolérance 11,4 V). Ondulation excessive.', '+12 V rail: 11.1 V at 60% load (tolerance 11.4 V). Excessive ripple.')
          ])
        : instantResult(id, 'pass', [t('Tensions stables et dans les tolérances sur tous les rails.', 'All rails stable and within tolerance.')])
    case 'smart':
      return condition.failingStorage
        ? instantResult(id, 'fail', [
            t('312 secteurs réalloués, 18 en attente. Santé estimée : 23 %.', '312 reallocated sectors, 18 pending. Estimated health: 23%.')
          ])
        : instantResult(id, 'pass', [t('Aucun secteur réalloué. Santé estimée : 97 %.', 'No reallocated sectors. Estimated health: 97%.')])
  }
}
