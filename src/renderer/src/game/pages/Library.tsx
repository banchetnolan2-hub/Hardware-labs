import { useState } from 'react'
import { inventoryCount, level as careerLevel } from '@career/career'
import { CATALOG, componentName } from '@simulation/catalog'
import { SLOTS, type Component, type Slot } from '@simulation/types'
import { useLanguage, useT } from '../../i18n'
import { useGameStore } from '../../store/game-store'
import { formatMoney } from '../format'
import { Icon } from '../icons'
import { componentHeadline, componentSpecs } from '../specs'
import './pages.css'

export function Library() {
  const t = useT().game
  const language = useLanguage()
  const career = useGameStore((state) => state.career)
  const buy = useGameStore((state) => state.buy)
  const [filter, setFilter] = useState<Slot | 'all'>('all')
  const [selected, setSelected] = useState<Component>(CATALOG[0]!)
  const level = career ? careerLevel(career) : 0
  const items = CATALOG.filter((component) => filter === 'all' || component.slot === filter)

  return (
    <>
      <div className="page-title">
        <div>
          <h1>{t.library.title}</h1>
          <p>{career ? t.library.subtitle(CATALOG.length) : t.library.noCareer}</p>
        </div>
      </div>
      <div className="filter-bar" role="tablist">
        <button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>
          {t.library.all}
        </button>
        {SLOTS.map((slot) => (
          <button key={slot} type="button" className={filter === slot ? 'is-active' : ''} onClick={() => setFilter(slot)}>
            <Icon name={slot} size={14} /> {t.slots[slot]}
          </button>
        ))}
      </div>
      <div className="library">
        <ul className="library-grid">
          {items.map((component, index) => {
            const locked = !!career && component.unlockLevel > level
            return (
              <li key={component.id} style={{ animationDelay: `${Math.min(index, 20) * 20}ms` }}>
                <button type="button" className={`library-card ${selected.id === component.id ? 'is-selected' : ''} ${locked ? 'is-locked' : ''}`} onClick={() => setSelected(component)}>
                  <div className="library-card__top">
                    <Icon name={component.slot} size={16} />
                    <span className="mono small">{t.slots[component.slot]}</span>
                    {locked && <Icon name="lock" size={14} className="library-card__lock" />}
                  </div>
                  <div className="library-card__name">{componentName(component)}</div>
                  <div className="library-card__headline mono">{componentHeadline(component, language)}</div>
                  <div className="library-card__price mono">{formatMoney(component.price, language)}</div>
                </button>
              </li>
            )
          })}
        </ul>
        <aside className="panel library-detail" key={selected.id}>
          <div className="part-detail__brand mono">
            <Icon name={selected.slot} size={14} /> {selected.brand} · {t.slots[selected.slot]}
          </div>
          <h2 className="part-detail__model">{selected.model}</h2>
          <p className="muted">{selected.summary[language]}</p>
          <dl className="kv">
            {componentSpecs(selected, language).map(([label, value]) => (
              <div key={label} style={{ display: 'contents' }}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="library-detail__buy">
            <span className="mono library-detail__price">{formatMoney(selected.price, language)}</span>
            {career &&
              (selected.unlockLevel > level ? (
                <span className="tag">
                  <Icon name="lock" size={12} /> {t.library.lockedHint(selected.unlockLevel)}
                </span>
              ) : (
                <>
                  {inventoryCount(career, selected.id) > 0 && <span className="small muted">{t.common.inStock(inventoryCount(career, selected.id))}</span>}
                  <button type="button" className="btn btn-primary" disabled={career.money < selected.price} onClick={() => buy(selected.id)}>
                    {t.common.buy}
                  </button>
                </>
              ))}
          </div>
        </aside>
      </div>
    </>
  )
}
