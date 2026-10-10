import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { ContractCategory } from '@career/schema'
import { useT } from '../i18n'
import { Icon } from './icons'

export function CategoryBadge({ category }: { category: ContractCategory }) {
  const t = useT().game
  return <span className={`category-badge category-badge--${category}`}>{t.categories[category]}</span>
}

export function DifficultyPips({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="pips" aria-label={`${value}/${max}`}>
      {Array.from({ length: max }, (_, index) => (
        <span key={index} className={index < value ? 'is-on' : ''} />
      ))}
    </span>
  )
}

export function Stars({ value, animated = false }: { value: number; animated?: boolean }) {
  return (
    <span className={`stars ${animated ? 'stars--animated' : ''}`} aria-label={`${value}/5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className={index < value ? 'is-on' : ''} style={{ animationDelay: `${400 + index * 160}ms` }}>
          <Icon name="star" size={animated ? 34 : 14} />
        </span>
      ))}
    </span>
  )
}

/** Barre de progression avec seuil optionnel. */
export function Meter({ value, max = 1, tone = 'accent', marker }: { value: number; max?: number; tone?: 'accent' | 'success' | 'warning' | 'danger'; marker?: number }) {
  const ratio = Math.max(0, Math.min(1, value / max))
  return (
    <div className={`meter meter--${tone}`}>
      <div className="meter__fill" style={{ transform: `scaleX(${ratio})` }} />
      {marker !== undefined && <div className="meter__marker" style={{ left: `${Math.min(100, (marker / max) * 100)}%` }} />}
    </div>
  )
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'success' | 'warning' | 'danger' }) {
  return (
    <div className={`stat ${tone ? `stat--${tone}` : ''}`}>
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
      {hint && <div className="stat__hint">{hint}</div>}
    </div>
  )
}

/** Valeur qui défile jusqu'à sa cible (compteurs d'argent, d'expérience). */
export function useCountUp(target: number, duration = 900, delay = 0): number {
  const [value, setValue] = useState(target)
  const previous = useRef(target)
  useEffect(() => {
    const reduced = document.documentElement.dataset.motion === 'reduced'
    const from = previous.current
    previous.current = target
    if (reduced || from === target) {
      setValue(target)
      return
    }
    let frame = 0
    const start = performance.now() + delay
    const tick = (now: number) => {
      const progress = Math.max(0, Math.min(1, (now - start) / duration))
      const eased = 1 - (1 - progress) ** 3
      setValue(Math.round(from + (target - from) * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration, delay])
  return value
}

export function ConfirmDialog({ message, onConfirm, onCancel, tone = 'accent' }: { message: string; onConfirm: () => void; onCancel: () => void; tone?: 'accent' | 'danger' }) {
  const t = useT().game.common
  const confirmRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    confirmRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onCancel])
  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <div className="dialog panel" role="alertdialog" aria-modal onClick={(event) => event.stopPropagation()}>
        <p>{message}</p>
        <div className="dialog__actions">
          <button type="button" className="btn" onClick={onCancel}>
            {t.cancel}
          </button>
          <button ref={confirmRef} type="button" className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} data-testid="confirm">
            {t.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, hint, action }: { icon: Parameters<typeof Icon>[0]['name']; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <Icon name={icon} size={36} />
      <p className="empty-state__title">{title}</p>
      {hint && <p className="empty-state__hint">{hint}</p>}
      {action}
    </div>
  )
}
