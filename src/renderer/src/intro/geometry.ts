/**
 * Géométrie de l'introduction, exprimée dans un repère 1920×1080 (viewBox du SVG).
 *
 * Le logo (logo-full.png, 1080×750, recadré depuis l'original 1536×1024 à partir de (230, 100))
 * est affiché à LOGO.width de large. Les points ci-dessous correspondent aux éléments du logo
 * officiel convertis dans ce repère, afin que les tracés animés convergent exactement sur
 * l'anneau et les nœuds de circuit du logo.
 */
export const STAGE = { width: 1920, height: 1080 }

export const LOGO = { x: 580, y: 236, width: 760, height: 527.8 }

/** Centre et rayon de l'anneau « HL » du logo dans le repère de la scène. */
export const RING = { cx: 960, cy: 419, r: 156 }

/** Tracés de circuit : chacun se termine sur un nœud du logo officiel. */
export const TRACES: { d: string; end: [number, number] }[] = [
  { d: 'M -600 300 H 520 L 610 390 H 750', end: [750, 390] },
  { d: 'M -600 520 H 480 L 569 431 H 692', end: [692, 431] },
  { d: 'M -600 700 H 520 L 744 476', end: [744, 476] },
  { d: 'M 2520 250 H 1400 L 1261 389 H 1176', end: [1176, 389] },
  { d: 'M 2520 610 H 1460 L 1301 451 H 1236', end: [1236, 451] },
  { d: 'M 1060 -300 V 150 L 1000 210 V 268', end: [1000, 268] }
]

/** Tracés secondaires, plus discrets, qui structurent l'arrière-plan sans converger. */
export const AMBIENT_TRACES: string[] = [
  'M -600 140 H 260 L 330 70 H 640',
  'M 2520 860 H 1640 L 1560 940 H 1300',
  'M 2520 120 H 1720 L 1660 180 H 1540',
  'M -600 920 H 300 L 380 1000 H 700'
]

export const SIGNATURE_Y = 812

export const pct = (value: number, total: number) => `${(value / total) * 100}%`
