import type { Sample } from '@simulation/bench'

type Series = { key: 'cpuTemp' | 'gpuTemp' | 'cpuClock' | 'power'; label: string; color: string; axis: 'temp' | 'percent' | 'power' }

const WIDTH = 1000
const HEIGHT = 330
const PAD = { left: 44, right: 48, top: 16, bottom: 30 }

/**
 * Courbes d'un test de charge. Les points proviennent du moteur de simulation ;
 * l'animation se contente de dévoiler la courbe calculée.
 */
export function BenchChart({ samples, duration, series, events, animationKey }: { samples: Sample[]; duration: number; series: Series[]; events: { t: number; label: string; tone: 'warning' | 'danger' }[]; animationKey: string }) {
  const temps = samples.flatMap((sample) => [sample.cpuTemp, sample.gpuTemp ?? sample.cpuTemp])
  const tempMax = Math.max(100, Math.ceil(Math.max(...temps) / 10) * 10)
  const tempMin = 20
  const powerMax = Math.max(100, Math.ceil(Math.max(...samples.map((sample) => sample.power)) / 100) * 100)
  const x = (time: number) => PAD.left + (time / duration) * (WIDTH - PAD.left - PAD.right)
  const y = (value: number, axis: Series['axis']) => {
    const ratio = axis === 'temp' ? (value - tempMin) / (tempMax - tempMin) : axis === 'percent' ? value / 110 : value / powerMax
    return HEIGHT - PAD.bottom - Math.max(0, Math.min(1, ratio)) * (HEIGHT - PAD.top - PAD.bottom)
  }
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(duration * ratio))

  return (
    <svg className="bench-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" key={animationKey}>
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const value = Math.round(tempMin + (tempMax - tempMin) * ratio)
        const yy = y(value, 'temp')
        return (
          <g key={ratio}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={yy} y2={yy} className="bench-chart__grid" />
            <text x={PAD.left - 6} y={yy + 3} className="bench-chart__axis" textAnchor="end">
              {value}°
            </text>
            <text x={WIDTH - PAD.right + 6} y={yy + 3} className="bench-chart__axis">
              {Math.round(powerMax * ratio)}
            </text>
          </g>
        )
      })}
      {ticks.map((tick) => (
        <text key={tick} x={x(tick)} y={HEIGHT - 8} className="bench-chart__axis" textAnchor="middle">
          {tick} min
        </text>
      ))}
      {events.map((event, index) => (
        <g key={index} className={`bench-chart__event bench-chart__event--${event.tone}`}>
          <line x1={x(event.t)} x2={x(event.t)} y1={PAD.top} y2={HEIGHT - PAD.bottom} />
          <text x={x(event.t) + 4} y={PAD.top + 10 + index * 12}>
            {event.label}
          </text>
        </g>
      ))}
      {series.map((serie) => {
        const points = samples
          .filter((sample) => sample[serie.key] !== null)
          .map((sample) => `${x(sample.t).toFixed(1)},${y(sample[serie.key] as number, serie.axis).toFixed(1)}`)
        if (points.length < 2) return null
        return <polyline key={serie.key} points={points.join(' ')} className="bench-chart__line" stroke={serie.color} pathLength={100} />
      })}
    </svg>
  )
}

/** Petite courbe d'évolution (solde). */
export function Sparkline({ values, height = 80 }: { values: number[]; height?: number }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const width = 600
  const points = values.map((value, index) => `${((index / (values.length - 1)) * width).toFixed(1)},${(height - 6 - ((value - min) / span) * (height - 12)).toFixed(1)}`)
  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img">
      <polygon points={`0,${height} ${points.join(' ')} ${width},${height}`} className="sparkline__area" />
      <polyline points={points.join(' ')} className="sparkline__line" pathLength={100} />
    </svg>
  )
}
