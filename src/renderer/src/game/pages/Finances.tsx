import { useMemo } from 'react'
import { resaleValue } from '@career/career'
import { useLanguage, useT } from '../../i18n'
import { useGameStore } from '../../store/game-store'
import { Sparkline } from '../Chart'
import { formatMoney, formatSigned } from '../format'
import { Stat } from '../ui'
import './pages.css'

export function Finances() {
  const t = useT().game
  const language = useLanguage()
  const career = useGameStore((state) => state.career)!
  const net = career.stats.earned - career.stats.spent
  const stockValue = Object.entries(career.inventory).reduce((total, [id, count]) => total + resaleValue(id) * count, 0)

  // Solde reconstitué à partir des mouvements (du plus ancien au plus récent).
  const balance = useMemo(() => {
    let running = career.money - career.ledger.reduce((total, entry) => total + entry.amount, 0)
    return [running, ...career.ledger.map((entry) => (running += entry.amount))]
  }, [career])

  return (
    <>
      <div className="page-title">
        <div>
          <h1>{t.finances.title}</h1>
        </div>
      </div>
      <div className="finances">
        <section className="panel finances__kpis">
          <Stat label={t.finances.balance} value={formatMoney(career.money, language)} />
          <Stat label={t.finances.earned} value={formatMoney(career.stats.earned, language)} tone="success" />
          <Stat label={t.finances.spent} value={formatMoney(career.stats.spent, language)} tone="danger" />
          <Stat label={t.finances.net} value={formatSigned(net, language)} tone={net >= 0 ? 'success' : 'danger'} />
          <Stat label={t.finances.stockValue} value={formatMoney(stockValue, language)} />
        </section>
        <section className="panel">
          <h2 className="panel-title">{t.finances.history}</h2>
          {balance.length > 1 ? <Sparkline values={balance} /> : <p className="muted small">{t.finances.ledgerEmpty}</p>}
        </section>
        <section className="panel">
          <h2 className="panel-title">{t.finances.ledger}</h2>
          {career.ledger.length === 0 ? (
            <p className="muted small">{t.finances.ledgerEmpty}</p>
          ) : (
            <table className="data-table" data-testid="ledger">
              <thead>
                <tr>
                  <th>{t.finances.day}</th>
                  <th>{t.finances.label}</th>
                  <th className="num">{t.finances.amount}</th>
                </tr>
              </thead>
              <tbody>
                {[...career.ledger].reverse().slice(0, 100).map((entry, index) => (
                  <tr key={index}>
                    <td className="mono">{entry.day}</td>
                    <td>{entry.label[language]}</td>
                    <td className={`num ${entry.amount >= 0 ? 'positive' : 'negative'}`}>{formatSigned(entry.amount, language)}</td>
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
