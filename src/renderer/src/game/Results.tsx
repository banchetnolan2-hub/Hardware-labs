import type { CSSProperties } from 'react'
import type { DeliveryReport } from '@career/career'
import { categoryInfo, levelProgress, toolInfo } from '@career/progression'
import { componentName, getComponent } from '@simulation/catalog'
import { useLanguage, useT } from '../i18n'
import { useAppStore } from '../store/app-store'
import { useGameStore } from '../store/game-store'
import { formatMoney, formatSigned } from './format'
import { CategoryBadge, Meter, Stars, useCountUp } from './ui'

/** Écran de résultats animé affiché après une livraison. */
export function Results({ report }: { report: DeliveryReport }) {
  const t = useT().game
  const language = useLanguage()
  const career = useGameStore((state) => state.career)!
  const dismiss = useGameStore((state) => state.dismissReport)
  const navigate = useAppStore((state) => state.navigate)
  const total = useCountUp(report.total, 1200, 900)
  const score = useCountUp(report.score, 900, 300)
  const progress = levelProgress(career.xp)
  const levelUp = report.levelAfter > report.levelBefore
  const lines = [
    { label: t.results.reimbursed, value: report.reimbursed },
    { label: t.results.labour, value: report.labour },
    ...(report.savingsBonus > 0 ? [{ label: t.results.savings, value: report.savingsBonus }] : [])
  ]

  const close = () => {
    dismiss()
    navigate('contracts')
  }

  return (
    <div className="results-backdrop" role="dialog" aria-modal data-testid="results">
      <div className="results panel">
        <div className="results__glow" aria-hidden />
        <header className="results__header">
          <CategoryBadge category={report.contract.category} />
          <h2>{t.results.title}</h2>
          <p className="muted">
            {report.contract.title[language]} · {report.contract.client.name}
          </p>
        </header>

        <div className="results__score">
          <Stars value={report.stars} animated />
          <div className="results__score-value mono" data-testid="results-score">
            {score}
            <small>/100 · {t.results.score}</small>
          </div>
        </div>

        <div className="results__columns">
          <section>
            <ul className="payout">
              {lines.map((line, index) => (
                <li key={line.label} style={{ '--i': index } as CSSProperties}>
                  <span>{line.label}</span>
                  <span className="mono">{formatMoney(line.value, language)}</span>
                </li>
              ))}
              <li className="payout__total">
                <span>{t.results.total}</span>
                <span className="mono" data-testid="results-total">
                  {formatMoney(total, language)}
                </span>
              </li>
            </ul>
            <p className="small muted">{t.results.profit(formatSigned(report.total - report.partsCost, language))}</p>
          </section>
          <section className="results__progress">
            <div>
              <div className="live-row">
                <span>{t.results.xp}</span>
                <span className="mono positive">+{report.xpGained} XP</span>
              </div>
              <Meter value={progress.ratio} />
            </div>
            <div className="live-row">
              <span>{t.results.reputation}</span>
              <span className={`mono ${report.reputationDelta >= 0 ? 'positive' : 'negative'}`}>
                {report.reputationDelta >= 0 ? '+' : ''}
                {report.reputationDelta}
              </span>
            </div>
            {levelUp && <div className="level-up">{t.results.levelUp(report.levelAfter)}</div>}
          </section>
        </div>

        {levelUp && (report.unlocks.components.length > 0 || report.unlocks.categories.length > 0 || report.unlocks.tools.length > 0) && (
          <section className="results__unlocks">
            <h3 className="panel-title">{t.results.unlocks}</h3>
            <div className="unlock-chips">
              {report.unlocks.categories.map((id) => (
                <span key={id} className="tag tag--accent">
                  {categoryInfo(id as never).name[language]}
                </span>
              ))}
              {report.unlocks.tools.map((id) => (
                <span key={id} className="tag tag--accent">
                  {toolInfo(id).name[language]}
                </span>
              ))}
              {report.unlocks.components.map((id) => (
                <span key={id} className="tag">
                  {componentName(getComponent(id)!)}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="results__notes">
          <h3 className="panel-title">{t.results.notes}</h3>
          {report.notes.length === 0 ? (
            <p className="small">{t.results.perfect}</p>
          ) : (
            <ul>
              {report.notes.map((note, index) => (
                <li key={index}>{note[language]}</li>
              ))}
            </ul>
          )}
        </section>

        <footer className="results__footer">
          <button type="button" className="btn btn-primary btn-lg" onClick={close} autoFocus data-testid="results-continue">
            {t.results.continue}
          </button>
        </footer>
      </div>
    </div>
  )
}
