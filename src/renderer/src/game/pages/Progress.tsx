import { CATEGORIES, LEVEL_XP, TOOLS, levelProgress, maxDifficulty } from '@career/progression'
import { CATALOG } from '@simulation/catalog'
import { useLanguage, useT } from '../../i18n'
import { useGameStore } from '../../store/game-store'
import { formatMoney } from '../format'
import { Icon } from '../icons'
import { CategoryBadge, Meter, Stars } from '../ui'
import './pages.css'

export function Progress() {
  const t = useT().game
  const language = useLanguage()
  const career = useGameStore((state) => state.career)!
  const progress = levelProgress(career.xp)

  return (
    <>
      <div className="page-title">
        <div>
          <h1>{t.progress.title}</h1>
          <p>{t.progress.stats(career.stats.delivered, career.stats.abandoned)}</p>
        </div>
      </div>
      <div className="progress-page">
        <section className="panel level-card">
          <div className="level-badge">
            <span className="level-badge__label">{t.hud.level}</span>
            <span className="level-badge__value">{progress.level}</span>
          </div>
          <div className="level-card__bars">
            <div>
              <div className="live-row">
                <span>{t.progress.level(progress.level)}</span>
                <span className="mono">{t.progress.xp(career.xp, progress.next)}</span>
              </div>
              <Meter value={progress.ratio} />
            </div>
            <div>
              <div className="live-row">
                <span>{t.progress.reputation}</span>
                <span className="mono">{Math.round(career.reputation)} / 100</span>
              </div>
              <Meter value={career.reputation} max={100} tone="success" />
              <div className="small muted">{t.progress.reputationHint(maxDifficulty(career.reputation))}</div>
            </div>
          </div>
        </section>

        <section className="panel">
          <h2 className="panel-title">{t.progress.unlocks}</h2>
          <ol className="unlock-track">
            {LEVEL_XP.map((xp, index) => {
              const level = index + 1
              const reached = progress.level >= level
              const components = CATALOG.filter((component) => component.unlockLevel === level).length
              const categories = CATEGORIES.filter((category) => category.unlockLevel === level)
              const tools = TOOLS.filter((tool) => tool.unlockLevel === level)
              return (
                <li key={level} className={reached ? 'is-reached' : ''}>
                  <div className="unlock-track__level">
                    <span className="mono">{level}</span>
                    <small className="mono">{xp} XP</small>
                  </div>
                  <div className="unlock-track__content">
                    {components > 0 && <span className="tag">{t.progress.componentsUnlock(components)}</span>}
                    {categories.map((category) => (
                      <CategoryBadge key={category.id} category={category.id} />
                    ))}
                    {tools.map((tool) => (
                      <span key={tool.id} className="tag tag--accent">
                        {tool.name[language]}
                      </span>
                    ))}
                  </div>
                  {reached && <Icon name="check" size={16} className="unlock-track__check" />}
                </li>
              )
            })}
          </ol>
        </section>

        <section className="panel">
          <h2 className="panel-title">{t.progress.history}</h2>
          {career.history.length === 0 ? (
            <p className="muted small">{t.progress.historyEmpty}</p>
          ) : (
            <table className="data-table" data-testid="history">
              <tbody>
                {[...career.history].reverse().map((entry) => (
                  <tr key={entry.contractId}>
                    <td className="mono">J{entry.day}</td>
                    <td>
                      <CategoryBadge category={entry.category} />
                    </td>
                    <td>
                      {entry.title[language]} <span className="muted small">· {entry.clientName}</span>
                    </td>
                    <td>{entry.outcome === 'delivered' ? <Stars value={entry.stars} /> : <span className="tag tag--bad">{t.workshop.abandoned}</span>}</td>
                    <td className={`num ${entry.reputationDelta >= 0 ? 'positive' : 'negative'}`}>
                      {entry.reputationDelta >= 0 ? '+' : ''}
                      {entry.reputationDelta} rep
                    </td>
                    <td className="num">+{entry.xpGained} XP</td>
                    <td className="num">{formatMoney(entry.payout, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  )
}
