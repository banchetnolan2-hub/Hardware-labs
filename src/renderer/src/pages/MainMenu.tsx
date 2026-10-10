import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { level as careerLevel } from '@career/career'
import { ROADMAP_PHASE_COUNT, phaseStatus } from '@shared/roadmap'
import logoEmblem from '../assets/brand/logo-emblem.png'
import logoFull from '../assets/brand/logo-full.png'
import { Backdrop } from '../components/Backdrop'
import { useUpdateStatusLabel } from '../components/UpdatePanel'
import { useT } from '../i18n'
import { formatMoney } from '../game/format'
import { ConfirmDialog, Meter } from '../game/ui'
import { useLanguage } from '../i18n'
import { useAppStore, type Route } from '../store/app-store'
import { useGameStore } from '../store/game-store'
import './main-menu.css'

type MenuKey = keyof ReturnType<typeof useT>['menu']['items']

type MenuEntry = {
  key: MenuKey
  /** Action disponible, ou phase de développement qui l'apportera. */
  action: { route: Route } | { quit: true } | { phase: number } | { newCareer: true }
}

const ENTRIES: MenuEntry[] = [
  { key: 'continue', action: { route: 'workshop' } },
  { key: 'newCareer', action: { newCareer: true } },
  { key: 'sandbox', action: { phase: 4 } },
  { key: 'configurations', action: { phase: 4 } },
  { key: 'library', action: { route: 'library' } },
  { key: 'settings', action: { route: 'settings' } },
  { key: 'releaseNotes', action: { route: 'release-notes' } },
  { key: 'quit', action: { quit: true } }
]

export function MainMenu() {
  const t = useT()
  const navigate = useAppStore((state) => state.navigate)
  const appInfo = useAppStore((state) => state.appInfo)
  const updateStatus = useAppStore((state) => state.updateStatus)
  const updateLabel = useUpdateStatusLabel(updateStatus)
  const updateReady = updateStatus.state === 'available' || updateStatus.state === 'downloaded'
  const listRef = useRef<HTMLUListElement>(null)
  const language = useLanguage()
  const career = useGameStore((state) => state.career)
  const startNewCareer = useGameStore((state) => state.startNewCareer)
  const [confirmNew, setConfirmNew] = useState(false)

  const beginCareer = async () => {
    await startNewCareer()
    navigate('contracts')
  }

  const activate = (entry: MenuEntry) => {
    if ('route' in entry.action) navigate(entry.action.route)
    else if ('quit' in entry.action) void window.hardwareLab.quit()
    else if ('newCareer' in entry.action) {
      if (career) setConfirmNew(true)
      else void beginCareer()
    }
  }

  // Navigation au clavier entre les entrées disponibles.
  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const buttons = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
    if (buttons.length === 0) return
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const step = event.key === 'ArrowDown' ? 1 : -1
    const next = current === -1 ? 0 : (current + step + buttons.length) % buttons.length
    buttons[next]?.focus()
  }

  return (
    <div className="page main-menu">
      <Backdrop />

      <aside className="main-menu__rail">
        <img className="main-menu__logo" src={logoFull} alt="HARDWARE LAB" draggable={false} />

        <nav aria-label={t.menu.title}>
          <ul className="main-menu__list" ref={listRef} onKeyDown={onKeyDown}>
            {ENTRIES.map((entry, index) => {
              const item = t.menu.items[entry.key]
              const upcoming = 'phase' in entry.action ? entry.action.phase : null
              const unavailable = entry.key === 'continue' && !career
              return (
                <li key={entry.key} style={{ '--i': index } as CSSProperties}>
                  <button
                    type="button"
                    className={`menu-item ${entry.key === 'quit' ? 'menu-item--quit' : ''}`}
                    disabled={upcoming !== null || unavailable}
                    title={upcoming !== null ? t.menu.upcomingIn(upcoming) : unavailable ? t.menu.noCareer : undefined}
                    onClick={() => activate(entry)}
                    autoFocus={entry.key === (career ? 'continue' : 'newCareer')}
                    data-testid={`menu-${entry.key}`}
                  >
                    <span className="menu-item__index mono">{String(index + 1).padStart(2, '0')}</span>
                    <span className="menu-item__text">
                      <span className="menu-item__label">{item.label}</span>
                      <span className="menu-item__hint">{item.hint}</span>
                    </span>
                    {upcoming !== null && (
                      <span className="menu-item__tag mono">
                        {t.menu.upcoming} · P{upcoming}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <p className="main-menu__keys">{t.menu.keyboard}</p>
      </aside>

      <section className="main-menu__content">
        <article className="panel main-menu__lab" style={{ '--i': 0 } as CSSProperties}>
          <h2 className="panel-title">{t.menu.lab.title}</h2>
          {career ? (
            <div className="lab-summary" data-testid="lab-summary">
              <img src={logoEmblem} alt="" className="lab-empty__emblem" draggable={false} />
              <div className="lab-summary__stats">
                <div>
                  <span className="lab-summary__label">{t.game.hud.balance}</span>
                  <span className="lab-summary__value mono">{formatMoney(career.money, language)}</span>
                </div>
                <div>
                  <span className="lab-summary__label">{t.game.hud.level}</span>
                  <span className="lab-summary__value mono">{careerLevel(career)}</span>
                </div>
                <div>
                  <span className="lab-summary__label">{t.game.hud.reputation}</span>
                  <span className="lab-summary__value mono">{Math.round(career.reputation)}</span>
                  <Meter value={career.reputation} max={100} tone="success" />
                </div>
                <div>
                  <span className="lab-summary__label">{t.menu.lab.delivered}</span>
                  <span className="lab-summary__value mono">{career.stats.delivered}</span>
                </div>
              </div>
              <p className="lab-summary__job">
                {career.active ? `${t.game.hud.activeJob} : ${career.active.contract.title[language]} — ${career.active.contract.client.name}` : t.menu.lab.contractsWaiting(career.board.length)}
              </p>
            </div>
          ) : (
            <div className="lab-empty">
              <img src={logoEmblem} alt="" className="lab-empty__emblem" draggable={false} />
              <div>
                <p className="lab-empty__title">{t.menu.lab.empty}</p>
                <p className="lab-empty__hint">{t.menu.lab.emptyHint}</p>
              </div>
            </div>
          )}
        </article>

        <article className="panel main-menu__roadmap" style={{ '--i': 1 } as CSSProperties}>
          <h2 className="panel-title">{t.menu.roadmap.title}</h2>
          <ol className="roadmap">
            {Array.from({ length: ROADMAP_PHASE_COUNT }, (_, index) => {
              const phase = index + 1
              const status = phaseStatus(phase)
              return (
                <li key={phase} className={`roadmap__item roadmap__item--${status}`}>
                  <span className="roadmap__dot" />
                  <span className="roadmap__phase mono">P{phase}</span>
                  <span className="roadmap__name">{t.menu.roadmap.phases[index]}</span>
                  <span className="roadmap__status">{t.menu.roadmap[status]}</span>
                </li>
              )
            })}
          </ol>
        </article>

        <article className="panel main-menu__system" style={{ '--i': 2 } as CSSProperties}>
          <h2 className="panel-title">{t.menu.system.title}</h2>
          <dl className="spec-list">
            <div>
              <dt>{t.menu.system.version}</dt>
              <dd className="mono">v{appInfo?.version}</dd>
            </div>
            <div>
              <dt>{t.menu.system.build}</dt>
              <dd>{appInfo?.isPackaged ? t.menu.system.packaged : t.menu.system.development}</dd>
            </div>
            <div>
              <dt>{t.menu.system.engine}</dt>
              <dd className="mono">
                Electron {appInfo?.electron} · Chromium {appInfo?.chrome?.split('.')[0]}
              </dd>
            </div>
            <div>
              <dt>{t.menu.system.updates}</dt>
              <dd>
                {updateReady ? (
                  <button type="button" className="link-button" onClick={() => navigate('settings')}>
                    {updateLabel}
                  </button>
                ) : (
                  updateLabel
                )}
              </dd>
            </div>
          </dl>
        </article>
      </section>

      <footer className="main-menu__footer mono">HARDWARE LAB · v{appInfo?.version}</footer>

      {confirmNew && (
        <ConfirmDialog
          message={t.menu.newCareerConfirm}
          tone="danger"
          onCancel={() => setConfirmNew(false)}
          onConfirm={() => {
            setConfirmNew(false)
            void beginCareer()
          }}
        />
      )}
    </div>
  )
}
