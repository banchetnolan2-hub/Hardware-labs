import { level as careerLevel, partsCost, resaleValue } from '@career/career'
import { TOOLS } from '@career/progression'
import { componentName, getComponent } from '@simulation/catalog'
import { useLanguage, useT } from '../../i18n'
import { useAppStore } from '../../store/app-store'
import { useGameStore } from '../../store/game-store'
import { formatMoney } from '../format'
import { Icon } from '../icons'
import { CategoryBadge, Meter, Stars } from '../ui'
import './pages.css'

export function Workshop() {
  const t = useT().game
  const language = useLanguage()
  const career = useGameStore((state) => state.career)!
  const buyTool = useGameStore((state) => state.buyTool)
  const sell = useGameStore((state) => state.sell)
  const navigate = useAppStore((state) => state.navigate)
  const job = career.active
  const level = careerLevel(career)
  const stock = Object.entries(career.inventory).filter(([, count]) => count > 0)

  return (
    <>
      <div className="page-title">
        <div>
          <h1>{t.workshop.title}</h1>
        </div>
      </div>
      <div className="workshop">
        <section className="panel workshop__job" data-testid="workshop-job">
          <h2 className="panel-title">{t.workshop.activeTitle}</h2>
          {job ? (
            <div className="job-card">
              <div className="job-card__head">
                <CategoryBadge category={job.contract.category} />
                <h3>{job.contract.title[language]}</h3>
                <span className="muted">{job.contract.client.name}</span>
              </div>
              <div className="job-card__stats">
                <div>
                  <span className="stat__label">{t.workshop.partsCost}</span>
                  <span className="mono">
                    {formatMoney(partsCost(job), language)} / {formatMoney(job.contract.budget, language)}
                  </span>
                  <Meter value={partsCost(job)} max={job.contract.budget} tone={partsCost(job) > job.contract.budget ? 'danger' : 'accent'} />
                </div>
                <div>
                  <span className="stat__label">{t.workshop.timeUsed}</span>
                  <span className="mono">{t.hud.hours(job.hoursUsed, job.contract.hoursAllowed)}</span>
                  <Meter value={job.hoursUsed} max={job.contract.hoursAllowed} tone={job.hoursUsed > job.contract.hoursAllowed ? 'danger' : 'accent'} />
                </div>
              </div>
              <div className="job-card__actions">
                <button type="button" className="btn btn-primary" onClick={() => navigate('configurator')}>
                  <Icon name="configurator" size={16} /> {t.workshop.openConfigurator}
                </button>
                <button type="button" className="btn" onClick={() => navigate('bench')}>
                  <Icon name="bench" size={16} /> {t.workshop.openBench}
                </button>
              </div>
            </div>
          ) : (
            <div className="job-card job-card--empty">
              <p className="job-card__empty-title">{t.workshop.noActive}</p>
              <p className="muted">{t.workshop.noActiveHint(career.board.length)}</p>
              <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate('contracts')} data-testid="go-contracts">
                {t.workshop.openContracts}
              </button>
            </div>
          )}
        </section>

        <section className="panel workshop__tools">
          <h2 className="panel-title">{t.workshop.tools}</h2>
          <p className="muted small">{t.workshop.toolsHint}</p>
          <ul className="tool-list">
            {TOOLS.map((tool) => {
              const owned = career.tools.includes(tool.id)
              const locked = tool.unlockLevel > level
              return (
                <li key={tool.id} className={owned ? 'is-owned' : ''}>
                  <div>
                    <div className="tool__name">{tool.name[language]}</div>
                    <div className="small muted">{tool.description[language]}</div>
                  </div>
                  {owned ? (
                    <span className="tag tag--ok">
                      <Icon name="check" size={12} /> {t.common.owned}
                    </span>
                  ) : locked ? (
                    <span className="tag">
                      <Icon name="lock" size={12} /> {t.common.locked(tool.unlockLevel)}
                    </span>
                  ) : (
                    <button type="button" className="btn" disabled={career.money < tool.price} onClick={() => buyTool(tool.id)}>
                      {t.common.buy} · {formatMoney(tool.price, language)}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="panel workshop__stock">
          <h2 className="panel-title">{t.workshop.stock}</h2>
          {stock.length === 0 ? (
            <p className="muted small">{t.workshop.stockEmpty}</p>
          ) : (
            <ul className="stock-list">
              {stock.map(([id, count]) => {
                const component = getComponent(id)
                if (!component) return null
                return (
                  <li key={id}>
                    <Icon name={component.slot} size={16} />
                    <span className="stock__name">
                      {componentName(component)} <span className="muted mono">×{count}</span>
                    </span>
                    <button type="button" className="btn btn-ghost" onClick={() => sell(id)}>
                      {t.workshop.resale(formatMoney(resaleValue(id), language))}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="panel workshop__recent">
          <h2 className="panel-title">{t.workshop.recent}</h2>
          {career.history.length === 0 ? (
            <p className="muted small">{t.workshop.recentEmpty}</p>
          ) : (
            <ul className="recent-list">
              {[...career.history]
                .reverse()
                .slice(0, 5)
                .map((entry) => (
                  <li key={entry.contractId}>
                    <CategoryBadge category={entry.category} />
                    <span className="recent__title">{entry.title[language]}</span>
                    {entry.outcome === 'delivered' ? <Stars value={entry.stars} /> : <span className="tag tag--bad">{t.workshop.abandoned}</span>}
                    <span className={`mono ${entry.payout > 0 ? 'positive' : 'muted'}`}>{formatMoney(entry.payout, language)}</span>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
