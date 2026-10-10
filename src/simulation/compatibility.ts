import type { LocalizedText } from '@shared/localized'
import { PSU_COMFORT_LOAD, isSimulable, simulate } from './simulate'
import { HEALTHY, type Build, type MachineCondition, type Slot } from './types'

export type IssueSeverity = 'error' | 'warning'

export type CompatibilityIssue = {
  code: string
  severity: IssueSeverity
  slots: Slot[]
  message: LocalizedText
  fix?: LocalizedText
}

export type CompatibilityStatus = 'compatible' | 'conditional' | 'incompatible'

export type CompatibilityReport = {
  status: CompatibilityStatus
  issues: CompatibilityIssue[]
}

const t = (fr: string, en: string): LocalizedText => ({ fr, en })

/**
 * Vérifie une configuration. Les erreurs empêchent la machine de fonctionner ou d'être montée ;
 * les avertissements signalent un fonctionnement possible mais dégradé (« compatible sous conditions »).
 */
export function checkCompatibility(build: Build, condition: MachineCondition = HEALTHY): CompatibilityReport {
  const issues: CompatibilityIssue[] = []
  const error = (code: string, slots: Slot[], message: LocalizedText, fix?: LocalizedText) =>
    issues.push({ code, severity: 'error', slots, message, fix })
  const warning = (code: string, slots: Slot[], message: LocalizedText, fix?: LocalizedText) =>
    issues.push({ code, severity: 'warning', slots, message, fix })

  const { cpu, motherboard, ram, gpu, storage, psu, cooler, case: pcCase } = build

  const missing: [Slot, LocalizedText][] = [
    ['cpu', t('Processeur', 'Processor')],
    ['motherboard', t('Carte mère', 'Motherboard')],
    ['ram', t('Mémoire', 'Memory')],
    ['storage', t('Stockage', 'Storage')],
    ['psu', t('Alimentation', 'Power supply')],
    ['cooler', t('Refroidissement', 'Cooler')],
    ['case', t('Boîtier', 'Case')]
  ]
  for (const [slot, label] of missing) {
    if (!build[slot]) error('missing', [slot], t(`Composant manquant : ${label.fr}.`, `Missing component: ${label.en}.`))
  }

  if (cpu && !gpu && cpu.igpuScore === 0) {
    error(
      'no-display',
      ['cpu', 'gpu'],
      t('Aucune sortie vidéo : ce processeur n’a pas de partie graphique intégrée.', 'No video output: this processor has no integrated graphics.'),
      t('Ajoutez une carte graphique ou choisissez un processeur avec graphique intégré.', 'Add a graphics card or pick a CPU with integrated graphics.')
    )
  }

  if (cpu && motherboard && cpu.socket !== motherboard.socket) {
    error(
      'socket',
      ['cpu', 'motherboard'],
      t(`Socket incompatible : processeur ${cpu.socket}, carte mère ${motherboard.socket}.`, `Socket mismatch: ${cpu.socket} processor on a ${motherboard.socket} motherboard.`),
      t(`Choisissez une carte mère ${cpu.socket}.`, `Pick a ${cpu.socket} motherboard.`)
    )
  }
  if (cpu && motherboard && cpu.socket === motherboard.socket && !cpu.memoryTypes.includes(motherboard.memoryType)) {
    error('cpu-memory', ['cpu', 'motherboard'], t(`Ce processeur ne gère pas la ${motherboard.memoryType}.`, `This processor does not support ${motherboard.memoryType}.`))
  }

  if (ram && motherboard) {
    if (ram.memoryType !== motherboard.memoryType) {
      error(
        'memory-type',
        ['ram', 'motherboard'],
        t(`Mémoire ${ram.memoryType} sur une carte mère ${motherboard.memoryType} : les barrettes n’entrent pas.`, `${ram.memoryType} memory on a ${motherboard.memoryType} motherboard: the sticks do not fit.`),
        t(`Choisissez un kit ${motherboard.memoryType}.`, `Pick a ${motherboard.memoryType} kit.`)
      )
    } else {
      if (ram.modules > motherboard.memorySlots) {
        error('memory-slots', ['ram', 'motherboard'], t(`${ram.modules} barrettes pour ${motherboard.memorySlots} emplacements.`, `${ram.modules} sticks for ${motherboard.memorySlots} slots.`))
      }
      if (ram.speed > motherboard.maxMemorySpeed) {
        warning(
          'memory-speed',
          ['ram', 'motherboard'],
          t(`La mémoire fonctionnera à ${motherboard.maxMemorySpeed} MHz au lieu de ${ram.speed} MHz.`, `Memory will run at ${motherboard.maxMemorySpeed} MHz instead of ${ram.speed} MHz.`),
          t('Sans danger, mais vous payez une vitesse inutilisée.', 'Harmless, but you pay for unused speed.')
        )
      }
    }
  }

  if (storage && motherboard && storage.kind === 'nvme' && motherboard.m2Slots < 1) {
    error('m2', ['storage', 'motherboard'], t('Pas d’emplacement M.2 pour ce SSD NVMe.', 'No M.2 slot for this NVMe drive.'))
  }

  if (pcCase && motherboard && !pcCase.formFactors.includes(motherboard.formFactor)) {
    error(
      'form-factor',
      ['case', 'motherboard'],
      t(`Carte mère ${motherboard.formFactor} trop grande pour ce boîtier (${pcCase.formFactors.join(', ')}).`, `${motherboard.formFactor} motherboard does not fit this case (${pcCase.formFactors.join(', ')}).`)
    )
  }
  if (pcCase && gpu && gpu.lengthMm > pcCase.maxGpuLengthMm) {
    error(
      'gpu-length',
      ['case', 'gpu'],
      t(`Carte graphique de ${gpu.lengthMm} mm pour ${pcCase.maxGpuLengthMm} mm disponibles.`, `${gpu.lengthMm} mm graphics card, ${pcCase.maxGpuLengthMm} mm available.`),
      t('Choisissez un boîtier plus grand ou une carte plus courte.', 'Use a bigger case or a shorter card.')
    )
  }
  if (pcCase && psu && !pcCase.psuFormFactors.includes(psu.formFactor)) {
    error('psu-form-factor', ['case', 'psu'], t(`Ce boîtier n’accepte que les alimentations ${pcCase.psuFormFactors.join('/')}.`, `This case only takes ${pcCase.psuFormFactors.join('/')} power supplies.`))
  }

  if (cooler && cpu && !cooler.sockets.includes(cpu.socket)) {
    error('cooler-socket', ['cooler', 'cpu'], t(`Refroidisseur sans fixation ${cpu.socket}.`, `Cooler has no ${cpu.socket} mounting kit.`))
  }
  if (cooler && pcCase) {
    if (cooler.kind === 'air' && cooler.heightMm > pcCase.maxCoolerHeightMm) {
      error(
        'cooler-height',
        ['cooler', 'case'],
        t(`Ventirad de ${cooler.heightMm} mm, ${pcCase.maxCoolerHeightMm} mm disponibles : le panneau ne ferme pas.`, `${cooler.heightMm} mm cooler, ${pcCase.maxCoolerHeightMm} mm available: the side panel won’t close.`)
      )
    }
    if (cooler.kind === 'aio' && !pcCase.radiatorSizes.includes(cooler.radiatorMm)) {
      error('radiator', ['cooler', 'case'], t(`Pas d’emplacement pour un radiateur de ${cooler.radiatorMm} mm.`, `No room for a ${cooler.radiatorMm} mm radiator.`))
    }
  }
  if (cooler && cpu && cooler.capacityW < cpu.loadPower * 0.9) {
    warning(
      'cooler-capacity',
      ['cooler', 'cpu'],
      t(`Refroidissement sous-dimensionné (${cooler.capacityW} W pour un processeur de ${cpu.loadPower} W) : baisse de fréquence probable.`, `Undersized cooling (${cooler.capacityW} W for a ${cpu.loadPower} W processor): throttling likely.`),
      t('Prenez un refroidisseur plus performant.', 'Use a stronger cooler.')
    )
  }
  if (cpu && motherboard && cpu.loadPower > motherboard.vrmLimit) {
    warning(
      'vrm',
      ['cpu', 'motherboard'],
      t(`Étages d’alimentation limités à ${motherboard.vrmLimit} W pour un processeur de ${cpu.loadPower} W.`, `VRMs limited to ${motherboard.vrmLimit} W for a ${cpu.loadPower} W processor.`),
      t('Une carte mère plus robuste libérera tout le potentiel du processeur.', 'A sturdier motherboard unlocks the full processor.')
    )
  }

  if (psu && gpu && gpu.pcieConnectors > psu.pcieConnectors) {
    error(
      'pcie-power',
      ['psu', 'gpu'],
      t(`La carte graphique demande ${gpu.pcieConnectors} connecteurs PCIe, l’alimentation en a ${psu.pcieConnectors}.`, `The graphics card needs ${gpu.pcieConnectors} PCIe connectors, the PSU has ${psu.pcieConnectors}.`),
      t('Choisissez une alimentation mieux équipée.', 'Pick a better-equipped power supply.')
    )
  }

  if (isSimulable(build)) {
    const full = simulate(build, 'full', condition)
    if (full.systemPower > full.psuCapacity) {
      error(
        'psu-capacity',
        ['psu'],
        t(`L’alimentation (${Math.round(full.psuCapacity)} W) ne peut pas fournir ${Math.round(full.systemPower)} W à pleine charge.`, `The power supply (${Math.round(full.psuCapacity)} W) cannot deliver ${Math.round(full.systemPower)} W at full load.`),
        t('Choisissez une alimentation plus puissante.', 'Use a more powerful supply.')
      )
    } else if (full.psuTrip) {
      warning(
        'psu-transient',
        ['psu', 'gpu'],
        t(`Les pics de la carte graphique (${Math.round(full.peakPower)} W) dépassent la capacité de l’alimentation : arrêts brutaux en jeu.`, `Graphics card spikes (${Math.round(full.peakPower)} W) exceed PSU capacity: random shutdowns while gaming.`),
        t('Prévoyez au moins 25 % de marge sur l’alimentation.', 'Leave at least 25% PSU headroom.')
      )
    } else if (full.psuLoad > PSU_COMFORT_LOAD) {
      warning(
        'psu-margin',
        ['psu'],
        t(`Marge d’alimentation faible : ${Math.round(full.psuLoad * 100)} % de charge au maximum.`, `Low PSU headroom: ${Math.round(full.psuLoad * 100)}% load at peak.`),
        t('Une alimentation plus puissante sera plus fiable et plus silencieuse.', 'A bigger supply will be more reliable and quieter.')
      )
    }
  }

  const status: CompatibilityStatus = issues.some((issue) => issue.severity === 'error')
    ? 'incompatible'
    : issues.length > 0
      ? 'conditional'
      : 'compatible'
  return { status, issues }
}
