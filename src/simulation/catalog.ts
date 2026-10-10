import type { Case, Component, ComponentOfSlot, Cooler, Cpu, Gpu, Motherboard, Psu, Ram, Slot, Storage } from './types'

/*
 * Bibliothèque centrale des composants de HARDWARE LAB.
 * Marques et modèles sont fictifs ; les caractéristiques suivent des ordres de grandeur réalistes.
 * Pour enrichir le catalogue : ajouter une entrée avec un identifiant unique et lancer `npm test`
 * (catalog.test.ts vérifie la cohérence de chaque fiche).
 */

const t = (fr: string, en: string) => ({ fr, en })

export const CPUS: Cpu[] = [
  { id: 'cpu-axion-a3-3400', slot: 'cpu', brand: 'Axion', model: 'A3 3400', price: 89, tier: 1, unlockLevel: 1, socket: 'AX4', memoryTypes: ['DDR4'], cores: 4, threads: 8, boostGhz: 3.9, singleScore: 62, multiScore: 30, loadPower: 62, igpuScore: 18, summary: t('Quadricœur économique avec partie graphique intégrée.', 'Budget quad-core with integrated graphics.') },
  { id: 'cpu-corvex-c3-13100', slot: 'cpu', brand: 'Corvex', model: 'C3-13100', price: 109, tier: 1, unlockLevel: 1, socket: 'CV17', memoryTypes: ['DDR4', 'DDR5'], cores: 4, threads: 8, boostGhz: 4.5, singleScore: 74, multiScore: 34, loadPower: 78, igpuScore: 20, summary: t('Quadricœur rapide, idéal en bureautique.', 'Fast quad-core, great for office work.') },
  { id: 'cpu-axion-a5-5600', slot: 'cpu', brand: 'Axion', model: 'A5 5600', price: 139, tier: 2, unlockLevel: 1, socket: 'AX4', memoryTypes: ['DDR4'], cores: 6, threads: 12, boostGhz: 4.4, singleScore: 78, multiScore: 52, loadPower: 76, igpuScore: 0, summary: t('Hexacœur équilibré, la référence du jeu abordable.', 'Balanced six-core, the affordable gaming staple.') },
  { id: 'cpu-corvex-c5-12400', slot: 'cpu', brand: 'Corvex', model: 'C5-12400', price: 159, tier: 2, unlockLevel: 1, socket: 'CV17', memoryTypes: ['DDR4', 'DDR5'], cores: 6, threads: 12, boostGhz: 4.4, singleScore: 80, multiScore: 55, loadPower: 98, igpuScore: 20, summary: t('Hexacœur polyvalent avec graphique intégré.', 'Versatile six-core with integrated graphics.') },
  { id: 'cpu-axion-a7-7700', slot: 'cpu', brand: 'Axion', model: 'A7 7700', price: 299, tier: 3, unlockLevel: 2, socket: 'AX5', memoryTypes: ['DDR5'], cores: 8, threads: 16, boostGhz: 5.3, singleScore: 100, multiScore: 88, loadPower: 140, igpuScore: 14, summary: t('Octocœur moderne pour le jeu exigeant.', 'Modern eight-core for demanding games.') },
  { id: 'cpu-corvex-c7-13700', slot: 'cpu', brand: 'Corvex', model: 'C7-13700', price: 379, tier: 4, unlockLevel: 3, socket: 'CV17', memoryTypes: ['DDR4', 'DDR5'], cores: 16, threads: 24, boostGhz: 5.2, singleScore: 102, multiScore: 112, loadPower: 220, igpuScore: 22, summary: t('Seize cœurs gourmands : refroidissement sérieux requis.', 'Power-hungry sixteen-core: serious cooling required.') },
  { id: 'cpu-axion-a9-7950', slot: 'cpu', brand: 'Axion', model: 'A9 7950', price: 579, tier: 5, unlockLevel: 4, socket: 'AX5', memoryTypes: ['DDR5'], cores: 16, threads: 32, boostGhz: 5.7, singleScore: 108, multiScore: 150, loadPower: 230, igpuScore: 14, summary: t('Station de création : 32 threads.', 'Creator workstation chip: 32 threads.') }
]

export const MOTHERBOARDS: Motherboard[] = [
  { id: 'mb-strata-a420m', slot: 'motherboard', brand: 'Strata', model: 'A420M', price: 69, tier: 1, unlockLevel: 1, socket: 'AX4', formFactor: 'mATX', memoryType: 'DDR4', memorySlots: 2, maxMemorySpeed: 3200, m2Slots: 1, vrmLimit: 95, summary: t('Micro-ATX d’entrée de gamme.', 'Entry-level micro-ATX.') },
  { id: 'mb-forge-h610m', slot: 'motherboard', brand: 'Forge', model: 'H610M', price: 79, tier: 1, unlockLevel: 1, socket: 'CV17', formFactor: 'mATX', memoryType: 'DDR4', memorySlots: 2, maxMemorySpeed: 3200, m2Slots: 1, vrmLimit: 90, summary: t('Micro-ATX simple, étages d’alimentation modestes.', 'Basic micro-ATX with modest VRMs.') },
  { id: 'mb-strata-b550', slot: 'motherboard', brand: 'Strata', model: 'B550 Pro', price: 119, tier: 2, unlockLevel: 1, socket: 'AX4', formFactor: 'ATX', memoryType: 'DDR4', memorySlots: 4, maxMemorySpeed: 3600, m2Slots: 2, vrmLimit: 140, summary: t('ATX solide pour plateforme AX4.', 'Solid ATX board for AX4.') },
  { id: 'mb-forge-b760', slot: 'motherboard', brand: 'Forge', model: 'B760 Gaming', price: 159, tier: 2, unlockLevel: 2, socket: 'CV17', formFactor: 'ATX', memoryType: 'DDR5', memorySlots: 4, maxMemorySpeed: 6000, m2Slots: 2, vrmLimit: 180, summary: t('ATX DDR5 orientée jeu.', 'Gaming-oriented DDR5 ATX.') },
  { id: 'mb-strata-b650', slot: 'motherboard', brand: 'Strata', model: 'B650 Pro', price: 169, tier: 3, unlockLevel: 2, socket: 'AX5', formFactor: 'ATX', memoryType: 'DDR5', memorySlots: 4, maxMemorySpeed: 6000, m2Slots: 2, vrmLimit: 170, summary: t('ATX AX5 équilibrée.', 'Balanced AX5 ATX.') },
  { id: 'mb-strata-x670i', slot: 'motherboard', brand: 'Strata', model: 'X670-I', price: 259, tier: 4, unlockLevel: 3, socket: 'AX5', formFactor: 'ITX', memoryType: 'DDR5', memorySlots: 2, maxMemorySpeed: 6400, m2Slots: 2, vrmLimit: 200, summary: t('Mini-ITX haut de gamme pour les machines compactes.', 'Premium mini-ITX for compact builds.') },
  { id: 'mb-forge-z790', slot: 'motherboard', brand: 'Forge', model: 'Z790 Apex', price: 289, tier: 4, unlockLevel: 3, socket: 'CV17', formFactor: 'ATX', memoryType: 'DDR5', memorySlots: 4, maxMemorySpeed: 7200, m2Slots: 4, vrmLimit: 300, summary: t('ATX haut de gamme, alimentation processeur renforcée.', 'High-end ATX with beefy VRMs.') },
  { id: 'mb-strata-x670e', slot: 'motherboard', brand: 'Strata', model: 'X670E Extreme', price: 329, tier: 5, unlockLevel: 4, socket: 'AX5', formFactor: 'ATX', memoryType: 'DDR5', memorySlots: 4, maxMemorySpeed: 7200, m2Slots: 4, vrmLimit: 300, summary: t('Vitrine de la plateforme AX5.', 'Flagship AX5 board.') }
]

export const RAMS: Ram[] = [
  { id: 'ram-kinetik-8-ddr4', slot: 'ram', brand: 'Kinetik', model: 'Core 8 Go DDR4', price: 22, tier: 1, unlockLevel: 1, memoryType: 'DDR4', modules: 1, capacityGb: 8, speed: 3200, summary: t('Barrette unique : pas de double canal.', 'Single stick: no dual channel.') },
  { id: 'ram-kinetik-16-ddr4', slot: 'ram', brand: 'Kinetik', model: 'Core 16 Go DDR4 (2×8)', price: 42, tier: 1, unlockLevel: 1, memoryType: 'DDR4', modules: 2, capacityGb: 16, speed: 3200, summary: t('Kit double canal standard.', 'Standard dual-channel kit.') },
  { id: 'ram-kinetik-32-ddr4', slot: 'ram', brand: 'Kinetik', model: 'Fury 32 Go DDR4 (2×16)', price: 79, tier: 2, unlockLevel: 2, memoryType: 'DDR4', modules: 2, capacityGb: 32, speed: 3600, summary: t('Kit 32 Go rapide pour DDR4.', 'Fast 32 GB DDR4 kit.') },
  { id: 'ram-kinetik-16-ddr5', slot: 'ram', brand: 'Kinetik', model: 'Core 16 Go DDR5 (2×8)', price: 59, tier: 2, unlockLevel: 2, memoryType: 'DDR5', modules: 2, capacityGb: 16, speed: 5600, summary: t('Entrée en DDR5.', 'Entry DDR5 kit.') },
  { id: 'ram-kinetik-32-ddr5', slot: 'ram', brand: 'Kinetik', model: 'Fury 32 Go DDR5 (2×16)', price: 109, tier: 3, unlockLevel: 2, memoryType: 'DDR5', modules: 2, capacityGb: 32, speed: 6000, summary: t('Le kit idéal des PC de jeu modernes.', 'The sweet spot for modern gaming rigs.') },
  { id: 'ram-kinetik-64-ddr5', slot: 'ram', brand: 'Kinetik', model: 'Fury 64 Go DDR5 (2×32)', price: 219, tier: 4, unlockLevel: 4, memoryType: 'DDR5', modules: 2, capacityGb: 64, speed: 6400, summary: t('Pour la création et la virtualisation.', 'For content creation and virtualisation.') }
]

export const GPUS: Gpu[] = [
  { id: 'gpu-vektor-gt-1630', slot: 'gpu', brand: 'Vektor', model: 'GT 1630', price: 119, tier: 1, unlockLevel: 1, perfScore: 35, vramGb: 4, boardPower: 75, lengthMm: 170, pcieConnectors: 0, summary: t('Carte d’appoint sans connecteur d’alimentation.', 'Low-power card, no power connector.') },
  { id: 'gpu-nebula-rx-6600', slot: 'gpu', brand: 'Nébula', model: 'RX 6600', price: 209, tier: 2, unlockLevel: 1, perfScore: 70, vramGb: 8, boardPower: 132, lengthMm: 240, pcieConnectors: 1, summary: t('Le 1080p fluide à petit prix.', 'Smooth 1080p on a budget.') },
  { id: 'gpu-vektor-rtx-3060', slot: 'gpu', brand: 'Vektor', model: 'RTX 3060', price: 259, tier: 2, unlockLevel: 1, perfScore: 74, vramGb: 12, boardPower: 170, lengthMm: 242, pcieConnectors: 1, summary: t('1080p polyvalente, 12 Go de mémoire.', 'Versatile 1080p card with 12 GB.') },
  { id: 'gpu-nebula-rx-7700', slot: 'gpu', brand: 'Nébula', model: 'RX 7700 XT', price: 389, tier: 3, unlockLevel: 2, perfScore: 105, vramGb: 12, boardPower: 245, lengthMm: 267, pcieConnectors: 2, summary: t('Très à l’aise en 1440p.', 'Comfortable at 1440p.') },
  { id: 'gpu-vektor-rtx-4070', slot: 'gpu', brand: 'Vektor', model: 'RTX 4070', price: 549, tier: 4, unlockLevel: 3, perfScore: 118, vramGb: 12, boardPower: 200, lengthMm: 285, pcieConnectors: 2, summary: t('Performante et sobre.', 'Fast and efficient.') },
  { id: 'gpu-nebula-rx-7900', slot: 'gpu', brand: 'Nébula', model: 'RX 7900 XT', price: 799, tier: 4, unlockLevel: 4, perfScore: 165, vramGb: 20, boardPower: 315, lengthMm: 320, pcieConnectors: 2, summary: t('Haut de gamme pour le 1440p élevé et la 4K.', 'High-end for high-refresh 1440p and 4K.') },
  { id: 'gpu-vektor-rtx-4090', slot: 'gpu', brand: 'Vektor', model: 'RTX 4090', price: 1599, tier: 5, unlockLevel: 5, perfScore: 235, vramGb: 24, boardPower: 450, lengthMm: 340, pcieConnectors: 3, summary: t('Le monstre : 450 W à dompter.', 'The beast: 450 W to tame.') }
]

export const STORAGES: Storage[] = [
  { id: 'sto-datalith-hdd-1tb', slot: 'storage', brand: 'Datalith', model: 'Archive 1 To HDD', price: 39, tier: 1, unlockLevel: 1, kind: 'hdd', capacityGb: 1000, readMbs: 180, summary: t('Disque dur mécanique : beaucoup de place, peu de vitesse.', 'Mechanical drive: lots of space, little speed.') },
  { id: 'sto-datalith-sata-500', slot: 'storage', brand: 'Datalith', model: 'Swift 500 Go SATA', price: 39, tier: 1, unlockLevel: 1, kind: 'sata-ssd', capacityGb: 500, readMbs: 550, summary: t('SSD SATA fiable.', 'Reliable SATA SSD.') },
  { id: 'sto-datalith-nvme-1tb', slot: 'storage', brand: 'Datalith', model: 'Pulse 1 To NVMe', price: 65, tier: 2, unlockLevel: 1, kind: 'nvme', capacityGb: 1000, readMbs: 3500, summary: t('NVMe rapide, le choix par défaut.', 'Fast NVMe, the default choice.') },
  { id: 'sto-datalith-nvme-2tb', slot: 'storage', brand: 'Datalith', model: 'Pulse X 2 To NVMe', price: 139, tier: 3, unlockLevel: 2, kind: 'nvme', capacityGb: 2000, readMbs: 7000, summary: t('NVMe Gen4 de 2 To.', '2 TB Gen4 NVMe.') }
]

export const PSUS: Psu[] = [
  { id: 'psu-voltis-450b', slot: 'psu', brand: 'Voltis', model: 'Core 450 B', price: 49, tier: 1, unlockLevel: 1, watts: 450, efficiency: 0.85, rating: '80+ Bronze', pcieConnectors: 1, formFactor: 'ATX', summary: t('Pour les machines sobres.', 'For low-power machines.') },
  { id: 'psu-voltis-550b', slot: 'psu', brand: 'Voltis', model: 'Core 550 B', price: 59, tier: 1, unlockLevel: 1, watts: 550, efficiency: 0.85, rating: '80+ Bronze', pcieConnectors: 2, formFactor: 'ATX', summary: t('Le minimum raisonnable pour un PC de jeu.', 'The sensible minimum for a gaming PC.') },
  { id: 'psu-voltis-650g', slot: 'psu', brand: 'Voltis', model: 'Prime 650 G', price: 89, tier: 2, unlockLevel: 1, watts: 650, efficiency: 0.9, rating: '80+ Gold', pcieConnectors: 2, formFactor: 'ATX', summary: t('650 W Gold, bonne marge.', '650 W Gold with headroom.') },
  { id: 'psu-voltis-850g', slot: 'psu', brand: 'Voltis', model: 'Prime 850 G', price: 129, tier: 3, unlockLevel: 2, watts: 850, efficiency: 0.9, rating: '80+ Gold', pcieConnectors: 3, formFactor: 'ATX', summary: t('Pour les cartes graphiques gourmandes.', 'For power-hungry graphics cards.') },
  { id: 'psu-voltis-sfx-600g', slot: 'psu', brand: 'Voltis', model: 'Nano SFX 600 G', price: 119, tier: 3, unlockLevel: 3, watts: 600, efficiency: 0.9, rating: '80+ Gold', pcieConnectors: 2, formFactor: 'SFX', summary: t('Format compact pour boîtiers mini-ITX.', 'Compact unit for mini-ITX cases.') },
  { id: 'psu-voltis-1000p', slot: 'psu', brand: 'Voltis', model: 'Titan 1000 P', price: 219, tier: 5, unlockLevel: 4, watts: 1000, efficiency: 0.92, rating: '80+ Platinum', pcieConnectors: 4, formFactor: 'ATX', summary: t('1000 W Platinum pour configurations extrêmes.', '1000 W Platinum for extreme builds.') }
]

export const COOLERS: Cooler[] = [
  { id: 'cool-glacier-box', slot: 'cooler', brand: 'Glacier', model: 'Box 65', price: 15, tier: 1, unlockLevel: 1, kind: 'air', sockets: ['AX4', 'AX5', 'CV17'], capacityW: 80, heightMm: 60, radiatorMm: 0, noiseDb: 38, summary: t('Ventirad basique, bruyant en charge.', 'Basic cooler, loud under load.') },
  { id: 'cool-glacier-lp47', slot: 'cooler', brand: 'Glacier', model: 'Slim 47', price: 45, tier: 2, unlockLevel: 3, kind: 'air', sockets: ['AX4', 'AX5', 'CV17'], capacityW: 105, heightMm: 47, radiatorMm: 0, noiseDb: 34, summary: t('Ventirad extra-plat pour boîtiers compacts.', 'Low-profile cooler for compact cases.') },
  { id: 'cool-glacier-t120', slot: 'cooler', brand: 'Glacier', model: 'Tower 120', price: 35, tier: 1, unlockLevel: 1, kind: 'air', sockets: ['AX4', 'AX5', 'CV17'], capacityW: 150, heightMm: 155, radiatorMm: 0, noiseDb: 30, summary: t('La tour à 35 € qui fait tout bien.', 'The do-it-all 35 € tower.') },
  { id: 'cool-glacier-t240', slot: 'cooler', brand: 'Glacier', model: 'Dual Tower 240', price: 79, tier: 3, unlockLevel: 2, kind: 'air', sockets: ['AX4', 'AX5', 'CV17'], capacityW: 220, heightMm: 165, radiatorMm: 0, noiseDb: 28, summary: t('Double tour silencieuse.', 'Quiet dual tower.') },
  { id: 'cool-frostline-aio240', slot: 'cooler', brand: 'Frostline', model: 'Hydro 240', price: 109, tier: 3, unlockLevel: 3, kind: 'aio', sockets: ['AX4', 'AX5', 'CV17'], capacityW: 250, heightMm: 0, radiatorMm: 240, noiseDb: 32, summary: t('Watercooling 240 mm.', '240 mm liquid cooler.') },
  { id: 'cool-frostline-aio360', slot: 'cooler', brand: 'Frostline', model: 'Hydro 360', price: 159, tier: 4, unlockLevel: 4, kind: 'aio', sockets: ['AX4', 'AX5', 'CV17'], capacityW: 330, heightMm: 0, radiatorMm: 360, noiseDb: 30, summary: t('Watercooling 360 mm pour processeurs extrêmes.', '360 mm liquid cooler for extreme CPUs.') }
]

export const CASES: Case[] = [
  { id: 'case-atrium-m', slot: 'case', brand: 'Atrium', model: 'M200', price: 49, tier: 1, unlockLevel: 1, formFactors: ['ITX', 'mATX'], psuFormFactors: ['ATX', 'SFX'], maxGpuLengthMm: 280, maxCoolerHeightMm: 160, radiatorSizes: [240], airflow: 0.9, fans: 1, summary: t('Micro-ATX compact, un seul ventilateur.', 'Compact micro-ATX, single fan.') },
  { id: 'case-atrium-a', slot: 'case', brand: 'Atrium', model: 'A300', price: 69, tier: 1, unlockLevel: 1, formFactors: ['ITX', 'mATX', 'ATX'], psuFormFactors: ['ATX', 'SFX'], maxGpuLengthMm: 330, maxCoolerHeightMm: 165, radiatorSizes: [240, 280], airflow: 1, fans: 2, summary: t('Moyen tour polyvalent.', 'Versatile mid-tower.') },
  { id: 'case-monolith-mesh', slot: 'case', brand: 'Monolith', model: 'Mesh 500', price: 109, tier: 2, unlockLevel: 2, formFactors: ['ITX', 'mATX', 'ATX'], psuFormFactors: ['ATX', 'SFX'], maxGpuLengthMm: 380, maxCoolerHeightMm: 175, radiatorSizes: [240, 280, 360], airflow: 1.3, fans: 3, summary: t('Façade grillagée : excellent flux d’air.', 'Mesh front: excellent airflow.') },
  { id: 'case-monolith-mini', slot: 'case', brand: 'Monolith', model: 'Nano', price: 99, tier: 3, unlockLevel: 3, formFactors: ['ITX'], psuFormFactors: ['SFX'], maxGpuLengthMm: 300, maxCoolerHeightMm: 50, radiatorSizes: [240], airflow: 0.75, fans: 1, summary: t('Mini-ITX de 12 litres : chaque millimètre compte.', '12-litre mini-ITX: every millimetre counts.') }
]

export const CATALOG: Component[] = [...CPUS, ...MOTHERBOARDS, ...RAMS, ...GPUS, ...STORAGES, ...PSUS, ...COOLERS, ...CASES]

const byId = new Map(CATALOG.map((component) => [component.id, component]))

export function getComponent(id: string): Component | undefined {
  return byId.get(id)
}

export function getComponentOfSlot<S extends Slot>(slot: S, id: string | null | undefined): ComponentOfSlot<S> | null {
  if (!id) return null
  const component = byId.get(id)
  return component && component.slot === slot ? (component as ComponentOfSlot<S>) : null
}

export function componentsOfSlot<S extends Slot>(slot: S): ComponentOfSlot<S>[] {
  return CATALOG.filter((component): component is ComponentOfSlot<S> => component.slot === slot)
}

export function componentName(component: Component): string {
  return `${component.brand} ${component.model}`
}
