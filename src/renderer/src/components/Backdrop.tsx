import './backdrop.css'

const TRACES = [
  'M -40 180 H 420 L 500 100 H 900',
  'M 1960 860 H 1500 L 1420 940 H 1080',
  'M 1960 220 H 1640 L 1560 300 H 1320',
  'M -40 900 H 240 L 320 980 H 760',
  'M 1200 -40 V 80 L 1280 160 H 1960'
]

/** Arrière-plan des pages : grille et pistes de circuit, dans la continuité de l'introduction. */
export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden>
      <div className="backdrop__grid" />
      <svg className="backdrop__svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
        {TRACES.map((d, index) => (
          <g key={d}>
            <path className="backdrop__trace" d={d} />
            <path className="backdrop__signal" d={d} pathLength={100} style={{ animationDelay: `${index * 2.3}s` }} />
          </g>
        ))}
      </svg>
      <div className="backdrop__glow" />
    </div>
  )
}
