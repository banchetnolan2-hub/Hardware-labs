import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import logoFull from '../assets/brand/logo-full.png'
import { useT } from '../i18n'
import { useAppStore } from '../store/app-store'
import { AMBIENT_TRACES, LOGO, RING, SIGNATURE_Y, STAGE, TRACES, pct } from './geometry'
import { INTRO_SIGNATURE_ENABLED, INTRO_SKIP_DURATION, INTRO_TIMELINE } from './timeline'
import './intro.css'

type IntroProps = {
  reducedMotion: boolean
  /** Appelé quand la sortie commence : le menu peut être monté sous l'introduction. */
  onExitStart: () => void
  /** Appelé quand l'introduction a entièrement disparu. */
  onExitEnd: () => void
}

type Phase = 'playing' | 'leaving'

export function Intro({ reducedMotion, onExitStart, onExitEnd }: IntroProps) {
  const t = useT()
  const version = useAppStore((state) => state.appInfo?.version ?? '')
  const timeline = reducedMotion ? INTRO_TIMELINE.reduced : INTRO_TIMELINE.full
  const [phase, setPhase] = useState<Phase>('playing')
  const [exitDuration, setExitDuration] = useState<number>(timeline.exitDuration)
  const timers = useRef<number[]>([])
  const leaving = useRef(false)

  const leave = useCallback(
    (duration: number) => {
      if (leaving.current) return
      leaving.current = true
      setExitDuration(duration)
      setPhase('leaving')
      onExitStart()
      timers.current.push(window.setTimeout(onExitEnd, duration))
    },
    [onExitStart, onExitEnd]
  )

  useEffect(() => {
    timers.current.push(window.setTimeout(() => leave(timeline.exitDuration), timeline.exit))
    const list = timers.current
    return () => list.forEach((id) => window.clearTimeout(id))
  }, [leave, timeline])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (['Escape', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        leave(INTRO_SKIP_DURATION)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [leave])

  const style = {
    '--t-grid': `${timeline.grid}ms`,
    '--t-hud': `${timeline.hud}ms`,
    '--t-traces': `${timeline.traces}ms`,
    '--t-checks': `${timeline.checks}ms`,
    '--t-ring': `${timeline.ring}ms`,
    '--t-logo': `${timeline.logo}ms`,
    '--t-signature': `${timeline.signature}ms`,
    '--t-exit': `${exitDuration}ms`
  } as CSSProperties

  const signature = t.intro.signature

  return (
    <div
      className={`intro ${reducedMotion ? 'intro--reduced' : ''} ${phase === 'leaving' ? 'is-leaving' : ''}`}
      style={style}
      onClick={() => leave(INTRO_SKIP_DURATION)}
      data-testid="intro"
    >
      <div className="intro__grid" aria-hidden />
      <div className="intro__vignette" aria-hidden />

      {/* Étape A — habillage technique */}
      <div className="intro__hud" aria-hidden>
        <span className="intro__corner intro__corner--tl" />
        <span className="intro__corner intro__corner--tr" />
        <span className="intro__corner intro__corner--bl" />
        <span className="intro__corner intro__corner--br" />
        <div className="intro__label intro__label--tl mono">HL/SYS · {t.intro.bootLabel}</div>
        <div className="intro__label intro__label--tr mono">BUILD {version}</div>
        <ul className="intro__checks mono">
          {t.intro.checks.map((check, index) => (
            <li key={check} style={{ '--i': index } as CSSProperties}>
              <span>{check}</span>
              <span className="intro__check-dots" />
              <span className="intro__check-ok">OK</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="intro__stage">
        {/* Étape B — tracés qui convergent vers la composition */}
        <svg
          className="intro__svg"
          viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <defs>
            <radialGradient id="intro-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#19c8ff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#19c8ff" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g className="intro__ambient">
            {AMBIENT_TRACES.map((d, index) => (
              <path key={d} d={d} pathLength={100} style={{ '--i': index } as CSSProperties} />
            ))}
          </g>

          <circle className="intro__core" cx={RING.cx} cy={RING.cy} r={RING.r * 1.9} fill="url(#intro-core)" />

          <g className="intro__traces">
            {TRACES.map(({ d, end }, index) => (
              <g key={d} style={{ '--i': index } as CSSProperties}>
                <path className="intro__trace" d={d} pathLength={100} />
                <path className="intro__pulse" d={d} pathLength={100} />
                <circle className="intro__node" cx={end[0]} cy={end[1]} r={6} />
              </g>
            ))}
          </g>

          <g className="intro__ring">
            <circle cx={RING.cx} cy={RING.cy} r={RING.r} pathLength={100} className="intro__ring-main" />
            <circle cx={RING.cx} cy={RING.cy} r={RING.r + 22} pathLength={100} className="intro__ring-ticks" />
          </g>
        </svg>

        {/* Étape C — révélation du logo officiel */}
        <img
          className="intro__logo"
          src={logoFull}
          alt="HARDWARE LAB"
          draggable={false}
          style={{
            left: pct(LOGO.x, STAGE.width),
            top: pct(LOGO.y, STAGE.height),
            width: pct(LOGO.width, STAGE.width)
          }}
        />

        {/* Étape D — signature */}
        {INTRO_SIGNATURE_ENABLED && (
          <div className="intro__signature mono" style={{ top: pct(SIGNATURE_Y, STAGE.height) }} aria-label={signature}>
            <span className="intro__signature-text" aria-hidden>
              {[...signature].map((char, index) => (
                <span key={index} style={{ '--i': index } as CSSProperties}>
                  {char === ' ' ? ' ' : char}
                </span>
              ))}
            </span>
            <span className="intro__signature-line" aria-hidden />
          </div>
        )}
      </div>

      <button
        type="button"
        className="intro__skip"
        onClick={(event) => {
          event.stopPropagation()
          leave(INTRO_SKIP_DURATION)
        }}
      >
        {t.intro.skip}
        <kbd>{t.intro.skipKey}</kbd>
      </button>
    </div>
  )
}
