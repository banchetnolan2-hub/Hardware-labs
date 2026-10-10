import { useState } from 'react'
import { TUTORIAL_CONTRACT } from '@career/contracts'
import { describeRequirement } from '@career/requirements'
import type { Contract } from '@career/schema'
import { componentName, getComponent } from '@simulation/catalog'
import { SLOTS } from '@simulation/types'
import { useLanguage, useT } from '../../i18n'
import { useAppStore } from '../../store/app-store'
import { useGameStore } from '../../store/game-store'
import { formatMoney } from '../format'
import { Icon } from '../icons'
import { CategoryBadge, ConfirmDialog, DifficultyPips, EmptyState } from '../ui'
import './pages.css'

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
}

export function Contracts() {
  const t = useT().game
  const language = useLanguage()
  const career = useGameStore((state) => state.career)!
  const accept = useGameStore((state) => state.accept)
  const abandon = useGameStore((state) => state.abandon)
  const navigate = useAppStore((state) => state.navigate)
  const [selectedId, setSelectedId] = useState<string | null>(career.board[0]?.id ?? null)
  const [confirmAbandon, setConfirmAbandon] = useState(false)
  const job = career.active
  const selected = career.board.find((contract) => contract.id === selectedId) ?? career.board[0] ?? null

  return (
    <>
      <div className="page-title">
        <div>
          <h1>{t.contracts.title}</h1>
          <p>{t.contracts.subtitle}</p>
        </div>
      </div>

      {job && (
        <section className="panel active-banner" data-testid="active-contract">
          <div className="active-banner__info">
            <span className="tag tag--accent">{t.contracts.active}</span>
            <CategoryBadge category={job.contract.category} />
            <strong>{job.contract.title[language]}</strong>
            <span className="muted">{job.contract.client.name}</span>
          </div>
          <div className="active-banner__actions">
            <button type="button" className="btn btn-danger" onClick={() => setConfirmAbandon(true)}>
              {t.contracts.abandon}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => navigate('configurator')}>
              {t.contracts.continue}
            </button>
          </div>
        </section>
      )}

      {career.board.length === 0 ? (
        <EmptyState icon="contracts" title={t.contracts.empty} />
      ) : (
        <div className="contracts">
          <ul className="contract-list" aria-label={t.contracts.title}>
            {career.board.map((contract, index) => (
              <li key={contract.id} style={{ animationDelay: `${index * 50}ms` }}>
                <button
                  type="button"
                  className={`contract-card ${selected?.id === contract.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedId(contract.id)}
                  data-testid={`contract-${contract.id}`}
                >
                  <div className="contract-card__top">
                    <CategoryBadge category={contract.category} />
                    {contract.id === TUTORIAL_CONTRACT.id && <span className="tag tag--accent">{t.contracts.tutorial}</span>}
                    <DifficultyPips value={contract.difficulty} />
                  </div>
                  <div className="contract-card__title">{contract.title[language]}</div>
                  <div className="contract-card__client">
                    {contract.client.name}
                    {contract.client.company ? ` · ${contract.client.company}` : ''}
                  </div>
                  <div className="contract-card__meta mono">
                    <span>{formatMoney(contract.budget, language)}</span>
                    <span>+{formatMoney(contract.labourFee, language)}</span>
                    <span>
                      <Icon name="clock" size={12} /> {contract.hoursAllowed} h
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {selected && <ContractDetail contract={selected} blocked={!!job} onAccept={() => accept(selected.id) && navigate('configurator')} />}
        </div>
      )}

      {confirmAbandon && (
        <ConfirmDialog
          message={t.contracts.abandonConfirm}
          tone="danger"
          onCancel={() => setConfirmAbandon(false)}
          onConfirm={() => {
            setConfirmAbandon(false)
            abandon()
          }}
        />
      )}
    </>
  )
}

function ContractDetail({ contract, blocked, onAccept }: { contract: Contract; blocked: boolean; onAccept: () => void }) {
  const t = useT().game
  const language = useLanguage()
  return (
    <article className="panel contract-detail" key={contract.id}>
      <header className="contract-detail__header">
        <div>
          <CategoryBadge category={contract.category} />
          <h2>{contract.title[language]}</h2>
        </div>
        <DifficultyPips value={contract.difficulty} />
      </header>

      <div className="client-message">
        <div className="client-message__avatar">{initials(contract.client.name)}</div>
        <div>
          <div className="client-message__from">
            {contract.client.name}
            {contract.client.company && <span> · {contract.client.company}</span>}
          </div>
          <p>{contract.message[language]}</p>
        </div>
      </div>

      <div className="contract-detail__columns">
        <section>
          <h3 className="panel-title">{t.contracts.requirements}</h3>
          {contract.requirements.length === 0 ? (
            <p className="muted small">{t.contracts.noRequirements}</p>
          ) : (
            <ul className="check-list">
              {contract.requirements.map((requirement, index) => {
                const { label, target } = describeRequirement(requirement)
                return (
                  <li key={index}>
                    <Icon name="check" size={14} />
                    <span>{label[language]}</span>
                    <span className="mono">{target}</span>
                  </li>
                )
              })}
            </ul>
          )}
          {contract.machine && (
            <>
              <h3 className="panel-title spaced">{t.contracts.machineProvided}</h3>
              <ul className="machine-list">
                {SLOTS.map((slot) => {
                  const id = contract.machine!.build[slot]
                  const component = id ? getComponent(id) : null
                  return (
                    <li key={slot}>
                      <span>{t.slots[slot]}</span>
                      <span>{component ? componentName(component) : '—'}</span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>
        <section>
          <h3 className="panel-title">{t.contracts.conditions}</h3>
          <dl className="kv">
            <dt>{t.common.budget}</dt>
            <dd>{formatMoney(contract.budget, language)}</dd>
            <dt>{t.common.labour}</dt>
            <dd>{formatMoney(contract.labourFee, language)}</dd>
            <dt>{t.common.time}</dt>
            <dd>{contract.hoursAllowed} h</dd>
            <dt>{t.common.difficulty}</dt>
            <dd>{contract.difficulty} / 5</dd>
          </dl>
          <div className="estimate">
            <span className="stat__label">{t.contracts.estimate}</span>
            <span className="estimate__value mono">
              {formatMoney(Math.round(contract.labourFee * 0.5), language)} – {formatMoney(contract.labourFee, language)}
            </span>
            <span className="muted small">{t.contracts.estimateHint}</span>
          </div>
        </section>
      </div>

      <footer className="contract-detail__footer">
        {blocked && <span className="muted small">{t.contracts.acceptBlocked}</span>}
        <button type="button" className="btn btn-primary btn-lg" disabled={blocked} onClick={onAccept} data-testid="accept-contract">
          {t.contracts.accept}
        </button>
      </footer>
    </article>
  )
}
