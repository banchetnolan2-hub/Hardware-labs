import type { Language } from '@shared/settings'
import type { Component } from '@simulation/types'

/** Caractéristiques affichables d'un composant. */
export function componentSpecs(component: Component, language: Language): [string, string][] {
  const fr = language === 'fr'
  const gb = fr ? 'Go' : 'GB'
  switch (component.slot) {
    case 'cpu':
      return [
        ['Socket', component.socket],
        [fr ? 'Cœurs / threads' : 'Cores / threads', `${component.cores} / ${component.threads}`],
        [fr ? 'Fréquence max.' : 'Boost clock', `${component.boostGhz} GHz`],
        [fr ? 'Indice mono-cœur' : 'Single-core score', String(component.singleScore)],
        [fr ? 'Indice multi-cœur' : 'Multi-core score', String(component.multiScore)],
        [fr ? 'Puissance en charge' : 'Load power', `${component.loadPower} W`],
        [fr ? 'Mémoire gérée' : 'Memory support', component.memoryTypes.join(', ')],
        [fr ? 'Graphique intégré' : 'Integrated graphics', component.igpuScore > 0 ? (fr ? 'Oui' : 'Yes') : fr ? 'Non' : 'No']
      ]
    case 'motherboard':
      return [
        ['Socket', component.socket],
        [fr ? 'Format' : 'Form factor', component.formFactor],
        [fr ? 'Mémoire' : 'Memory', `${component.memoryType} · ${component.memorySlots} slots · ${component.maxMemorySpeed} MHz`],
        ['M.2', String(component.m2Slots)],
        [fr ? 'Limite VRM' : 'VRM limit', `${component.vrmLimit} W`]
      ]
    case 'ram':
      return [
        ['Type', component.memoryType],
        [fr ? 'Capacité' : 'Capacity', `${component.capacityGb} ${gb} (${component.modules} × ${component.capacityGb / component.modules})`],
        [fr ? 'Fréquence' : 'Speed', `${component.speed} MHz`]
      ]
    case 'gpu':
      return [
        [fr ? 'Indice graphique (FPS 1080p)' : 'Graphics score (1080p FPS)', String(component.perfScore)],
        [fr ? 'Mémoire vidéo' : 'Video memory', `${component.vramGb} ${gb}`],
        [fr ? 'Consommation' : 'Board power', `${component.boardPower} W`],
        [fr ? 'Longueur' : 'Length', `${component.lengthMm} mm`],
        [fr ? 'Connecteurs PCIe' : 'PCIe connectors', String(component.pcieConnectors)]
      ]
    case 'storage':
      return [
        ['Type', component.kind === 'hdd' ? (fr ? 'Disque dur' : 'Hard drive') : component.kind === 'nvme' ? 'SSD NVMe' : 'SSD SATA'],
        [fr ? 'Capacité' : 'Capacity', `${component.capacityGb} ${gb}`],
        [fr ? 'Lecture' : 'Read', `${component.readMbs} Mo/s`]
      ]
    case 'psu':
      return [
        [fr ? 'Puissance' : 'Wattage', `${component.watts} W`],
        [fr ? 'Certification' : 'Rating', component.rating],
        [fr ? 'Connecteurs PCIe' : 'PCIe connectors', String(component.pcieConnectors)],
        [fr ? 'Format' : 'Form factor', component.formFactor]
      ]
    case 'cooler':
      return [
        ['Type', component.kind === 'aio' ? (fr ? `Watercooling ${component.radiatorMm} mm` : `${component.radiatorMm} mm liquid`) : fr ? 'Ventirad' : 'Air cooler'],
        [fr ? 'Capacité' : 'Capacity', `${component.capacityW} W`],
        ...(component.kind === 'air' ? [[fr ? 'Hauteur' : 'Height', `${component.heightMm} mm`] as [string, string]] : []),
        [fr ? 'Bruit' : 'Noise', `${component.noiseDb} dB`],
        ['Sockets', component.sockets.join(', ')]
      ]
    case 'case':
      return [
        [fr ? 'Cartes mères' : 'Motherboards', component.formFactors.join(', ')],
        [fr ? 'Carte graphique max.' : 'Max GPU length', `${component.maxGpuLengthMm} mm`],
        [fr ? 'Ventirad max.' : 'Max cooler height', `${component.maxCoolerHeightMm} mm`],
        [fr ? 'Radiateurs' : 'Radiators', component.radiatorSizes.length ? component.radiatorSizes.map((size) => `${size}`).join(', ') + ' mm' : '—'],
        [fr ? 'Flux d’air' : 'Airflow', `${Math.round(component.airflow * 100)} %`],
        [fr ? 'Ventilateurs' : 'Fans', String(component.fans)],
        [fr ? 'Alimentation' : 'PSU', component.psuFormFactors.join(', ')]
      ]
  }
}

/** Résumé en une ligne. */
export function componentHeadline(component: Component, language: Language): string {
  const fr = language === 'fr'
  switch (component.slot) {
    case 'cpu':
      return `${component.socket} · ${component.cores}C/${component.threads}T · ${component.loadPower} W`
    case 'motherboard':
      return `${component.socket} · ${component.formFactor} · ${component.memoryType}`
    case 'ram':
      return `${component.memoryType} · ${component.capacityGb} ${fr ? 'Go' : 'GB'} · ${component.speed} MHz`
    case 'gpu':
      return `${component.vramGb} ${fr ? 'Go' : 'GB'} · ${component.boardPower} W · ${component.lengthMm} mm`
    case 'storage':
      return `${component.kind.toUpperCase()} · ${component.capacityGb >= 1000 ? `${component.capacityGb / 1000} ${fr ? 'To' : 'TB'}` : `${component.capacityGb} ${fr ? 'Go' : 'GB'}`}`
    case 'psu':
      return `${component.watts} W · ${component.rating} · ${component.formFactor}`
    case 'cooler':
      return `${component.kind === 'aio' ? `AIO ${component.radiatorMm}` : `${component.heightMm} mm`} · ${component.capacityW} W`
    case 'case':
      return `${component.formFactors.join('/')} · GPU ${component.maxGpuLengthMm} mm`
  }
}
