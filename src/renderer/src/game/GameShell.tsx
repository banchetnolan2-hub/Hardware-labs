import type { CSSProperties, ReactNode } from 'react'
import { level as careerLevel, partsCost } from '@career/career'
import { levelProgress, maxDifficulty } from '@career/progression'
import logoEmblem from '../assets/brand/logo-emblem.png'
import { Backdrop } from '../components/Backdrop'
import { useLanguage, useT } from '../i18n'
import { GAME_ROUTES, useAppStore, type GameRoute } from '../store/app-store'
import { useGameStore } from '../store/game-store'
import { formatMoney } from './format'
import { Icon } from './icons'
import { Meter, useCountUp } from './ui'
import './game.css'

/** Cadre commun des pages de jeu : barre d'état de l'atelier et navigation. */
export function GameShell({ children }: { children: ReactNode }) {
  const t = useT().game
  const language = useLanguage()
  const route = useAppStore((state) => state.route) as GameRoute
  const navigate = useAppStore((state) => state.navigate)
  const career = useGameStore((state) => state.career)
  const saveError = useGameStore((state) => state.saveError)
  const notice = useGameStore((state) => state.notice)
  const dismissNotice = useGameStore((state) => state.dismissNotice)
  const money = useCountUp(career?.money ?? 0, 700)

  const routes = career ? GAME_ROUTES : (['library'] as GameRoute[])
  const progress = career ? levelProgress(career.xp) : null
  const job = career?.active

  return (
    <div className="page game">
      <Backdrop />
      <aside className="game-nav">
        <div className="game-nav__brand">
          <img src={logoEmblem} alt="" draggable={false} />
          <div>
            <div className="game-nav__name">HARDWARE LAB</div>
            {career && <div className="game-nav__day mono">{t.hud.day(career.day)}</div>}
          </div>
        </div>
        <nav>
          {routes.map((item, index) => (
            <button
              key={item}
              type="button"
              className={`game-nav__item ${route === item ? 'is-active' : ''}`}
              onClick={() => navigate(item)}
              style={{ '--i': index } as CSSProperties}
              data-testid={`nav-${item}`}
              aria-current={route === item ? 'page' : undefined}
            >
              <Icon name={item} />
              <span>{t.nav[item]}</span>
              {item === 'configurator' && job && <span className="game-nav__dot" />}
            </button>
          ))}
        </nav>
        <div className="game-nav__footer">
          <button type="button" className="game-nav__item" onClick={() => navigate('settings')}>
            <Icon name="settings" />
            <span>{t.nav.settings}</span>
          </button>
          <button type="button" className="game-nav__item" onClick={() => navigate('menu')} data-testid="nav-menu">
            <Icon name="menu" />
            <span>{t.nav.menu}</span>
          </button>
        </div>
      </aside>

      <div className="game-main">
        {career && progress && (
          <header className="hud">
            <div className="hud__item" data-testid="hud-money">
              <span className="hud__label">{t.hud.balance}</span>
              <span className="hud__value mono">{formatMoney(money, language)}</span>
            </div>
            <div className="hud__item hud__item--meter">
              <span className="hud__label">
                {t.hud.reputation} <span className="mono">{Math.round(career.reputation)}</span>
              </span>
              <Meter value={career.reputation} max={100} tone="success" marker={maxDifficulty(career.reputation) * 20} />
            </div>
            <div className="hud__item hud__item--meter">
              <span className="hud__label">
                {t.hud.level} <span className="mono">{careerLevel(career)}</span>
              </span>
              <Meter value={progress.ratio} />
            </div>
            <button type="button" className={`hud__job ${job ? '' : 'is-empty'}`} onClick={() => navigate(job ? 'configurator' : 'contracts')}>
              <span className="hud__label">{t.hud.activeJob}</span>
              {job ? (
                <span className="hud__job-title">
                  {job.contract.title[language]}
                  <span className="mono">
                    {formatMoney(partsCost(job), language)} / {formatMoney(job.contract.budget, language)} · {t.hud.hours(job.hoursUsed, job.contract.hoursAllowed)}
                  </span>
                </span>
              ) : (
                <span className="hud__job-title hud__job-title--empty">{t.hud.noJob}</span>
              )}
            </button>
            {saveError && (
              <span className="hud__save-error" title={saveError}>
                <Icon name="warning" size={14} /> {t.hud.saveError}
              </span>
            )}
          </header>
        )}
        <div className="game-content" key={route}>
          {children}
        </div>
      </div>

      {notice && (
        <div className="toast" role="alert" onClick={dismissNotice}>
          <Icon name="warning" size={16} />
          {t.errors[notice.error]}
        </div>
      )}
    </div>
  )
}
