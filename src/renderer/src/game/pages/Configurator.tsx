import { useMemo, useState } from 'react'
import { deliveryCheck, inventoryCount, level as careerLevel, partsCost } from '@career/career'
import { checkRequirements } from '@career/requirements'
import type { Career, Job } from '@career/schema'
import { componentName, componentsOfSlot, getComponent } from '@simulation/catalog'
import { checkCompatibility, type CompatibilityStatus } from '@simulation/compatibility'
import { isSimulable, performance, resolveBuild, simulate } from '@simulation/simulate'
import { HEALTHY, SLOTS, type Component, type Slot } from '@simulation/types'
import { useLanguage, useT } from '../../i18n'
import { useAppStore } from '../../store/app-store'
import { useGameStore } from '../../store/game-store'
import { formatMoney } from '../format'
import { Icon } from '../icons'
import { componentHeadline, componentSpecs } from '../specs'
import { CategoryBadge, ConfirmDialog, EmptyState, Meter } from '../ui'
import './pages.css'

/*
 * L'analyse en direct repose uniquement sur les fiches techniques (machine supposée saine) :
 * les pannes cachées d'une machine client ne se révèlent qu'au banc de test.
 */
const STATUS_TAG: Record<CompatibilityStatus, string> = { compatible: 'tag--ok', conditional: 'tag--warn', incompatible: 'tag--bad' }

/** Mesure principale demandée par le client, pour prévisualiser l'effet d'une pièce. */
function primaryPreview(job: Job, ids: Job['build']): string | null {
  const build = resolveBuild(ids)
  if (!isSimulable(build)) return null
  const requirement = job.contract.requirements.find((item) => ['fps', 'office', 'creation'].includes(item.kind))
  if (!requirement) return null
  const checks = checkRequirements(build, HEALTHY, [requirement])
  return checks[0]!.value
}

export function Configurator() {
  const t = useT().game
  const language = useLanguage()
  const career = useGameStore((state) => state.career)!
  const navigate = useAppStore((state) => state.navigate)
  const [slot, setSlot] = useState<Slot>('cpu')
  const job = career.active

  if (!job) {
    return (
      <EmptyState
        icon="configurator"
        title={t.configurator.noJob}
        action={
          <button type="button" className="btn btn-primary" onClick={() => navigate('contracts')}>
            {t.configurator.goContracts}
          </button>
        }
      />
    )
  }

  return (
    <>
      <div className="page-title">
        <div>
          <h1>{t.configurator.title}</h1>
          <p>
            <CategoryBadge category={job.contract.category} /> &nbsp;{job.contract.title[language]} · {job.contract.client.name}
          </p>
        </div>
      </div>
      <div className="configurator">
        <SlotList job={job} active={slot} onSelect={setSlot} />
        <PartBrowser career={career} job={job} slot={slot} />
        <LivePanel career={career} job={job} />
      </div>
    </>
  )
}

function SlotList({ job, active, onSelect }: { job: Job; active: Slot; onSelect: (slot: Slot) => void }) {
  const t = useT().game
  const language = useLanguage()
  const report = useMemo(() => checkCompatibility(resolveBuild(job.build)), [job])
  return (
    <section className="panel slot-list">
      <h2 className="panel-title">{t.configurator.parts}</h2>
      <ul>
        {SLOTS.map((slot) => {
          const id = job.build[slot]
          const component = id ? getComponent(id) : null
          const issues = report.issues.filter((issue) => issue.slots.includes(slot) && issue.code !== 'missing')
          const state = issues.some((issue) => issue.severity === 'error') ? 'error' : issues.length ? 'warning' : component ? 'ok' : 'empty'
          return (
            <li key={slot}>
              <button type="button" className={`slot ${active === slot ? 'is-active' : ''} slot--${state}`} onClick={() => onSelect(slot)} data-testid={`slot-${slot}`}>
                <Icon name={slot} size={20} />
                <span className="slot__text">
                  <span className="slot__label">{t.slots[slot]}</span>
                  <span className="slot__value">{component ? componentName(component) : t.common.empty}</span>
                </span>
                {component && (
                  <span className="slot__meta">
                    <span className={`tag ${job.origins[slot] === 'client' ? '' : 'tag--accent'}`}>{job.origins[slot] === 'client' ? t.common.client : t.common.workshop}</span>
                    {job.origins[slot] === 'workshop' && <span className="mono small">{formatMoney(component.price, language)}</span>}
                  </span>
                )}
                <span className={`slot__dot slot__dot--${state}`} />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function PartBrowser({ career, job, slot }: { career: Career; job: Job; slot: Slot }) {
  const t = useT().game
  const language = useLanguage()
  const install = useGameStore((state) => state.install)
  const buyAndInstall = useGameStore((state) => state.buyAndInstall)
  const remove = useGameStore((state) => state.remove)
  const level = careerLevel(career)
  const installedId = job.build[slot]
  const [focusId, setFocusId] = useState<string | null>(null)

  const candidates = useMemo(() => {
    const spares = job.clientSpares.map((id) => getComponent(id)).filter((component): component is Component => component?.slot === slot)
    const catalog = componentsOfSlot(slot).sort((a, b) => a.price - b.price)
    return [...spares.map((component) => ({ component, spare: true })), ...catalog.map((component) => ({ component, spare: false }))].map(({ component, spare }) => {
      const ids = { ...job.build, [slot]: component.id }
      return {
        component,
        spare,
        status: checkCompatibility(resolveBuild(ids)).status,
        preview: primaryPreview(job, ids)
      }
    })
  }, [job, slot])

  const focus = getComponent(focusId ?? installedId ?? '') ?? candidates.find((candidate) => !candidate.spare)?.component ?? null
  const installed = installedId ? getComponent(installedId) : null

  return (
    <section className="panel part-browser">
      <header className="part-browser__header">
        <h2 className="panel-title">{t.configurator.choose(t.slots[slot])}</h2>
        {installed && (
          <button type="button" className="btn btn-ghost" onClick={() => remove(slot)} data-testid="remove-part">
            {t.common.remove}
          </button>
        )}
      </header>
      <div className="part-browser__body">
        <ul className="part-list" data-testid="part-list">
          {candidates.map(({ component, spare, status, preview }) => {
            const isInstalled = component.id === installedId && !spare
            const locked = component.unlockLevel > level
            const stock = inventoryCount(career, component.id)
            const affordable = career.money >= component.price
            return (
              <li key={`${spare ? 'spare' : 'cat'}-${component.id}`}>
                <div
                  className={`part ${isInstalled ? 'is-installed' : ''} ${locked ? 'is-locked' : ''} ${focus?.id === component.id ? 'is-focused' : ''}`}
                  onMouseEnter={() => setFocusId(component.id)}
                  onFocus={() => setFocusId(component.id)}
                >
                  <div className="part__main">
                    <div className="part__name">
                      {componentName(component)}
                      {spare && <span className="tag">{t.configurator.clientSpares}</span>}
                    </div>
                    <div className="part__headline mono">{componentHeadline(component, language)}</div>
                  </div>
                  <div className="part__signals">
                    {preview && <span className="mono part__preview">{preview}</span>}
                    {!locked && <span className={`tag ${STATUS_TAG[status]}`}>{t.configurator.preview[status]}</span>}
                  </div>
                  <div className="part__buy">
                    <span className="part__price mono">{spare ? '—' : formatMoney(component.price, language)}</span>
                    {!spare && stock > 0 && <span className="small muted">{t.common.inStock(stock)}</span>}
                  </div>
                  <div className="part__action">
                    {isInstalled ? (
                      <span className="tag tag--ok">
                        <Icon name="check" size={12} /> {t.configurator.selected}
                      </span>
                    ) : locked ? (
                      <span className="tag">
                        <Icon name="lock" size={12} /> {t.common.locked(component.unlockLevel)}
                      </span>
                    ) : spare || stock > 0 ? (
                      <button type="button" className="btn" onClick={() => install(slot, component.id)} data-testid={`install-${component.id}`}>
                        {t.common.install}
                      </button>
                    ) : (
                      <button type="button" className="btn btn-primary" disabled={!affordable} onClick={() => buyAndInstall(slot, component.id)} data-testid={`buy-${component.id}`}>
                        {t.common.buyInstall}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        {focus && (
          <aside className="part-detail" key={focus.id}>
            <div className="part-detail__brand mono">{focus.brand}</div>
            <div className="part-detail__model">{focus.model}</div>
            <p className="muted small">{focus.summary[language]}</p>
            <dl className="kv">
              {componentSpecs(focus, language).map(([label, value]) => (
                <div key={label} style={{ display: 'contents' }}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        )}
      </div>
    </section>
  )
}

function tempTone(value: number, limit: number) {
  return value >= limit - 1 ? 'danger' : value >= limit - 10 ? 'warning' : 'success'
}

function LivePanel({ career, job }: { career: Career; job: Job }) {
  const t = useT().game
  const language = useLanguage()
  const navigate = useAppStore((state) => state.navigate)
  const runTest = useGameStore((state) => state.test)
  const deliver = useGameStore((state) => state.deliver)
  const [confirm, setConfirm] = useState(false)

  const analysis = useMemo(() => {
    const build = resolveBuild(job.build)
    const condition = HEALTHY
    const compatibility = checkCompatibility(build)
    if (!isSimulable(build)) return { compatibility, sim: null }
    return {
      compatibility,
      sim: {
        perf: performance(build, condition),
        gaming: simulate(build, 'gaming', condition),
        full: simulate(build, 'full', condition),
        gpu: !!build.gpu
      }
    }
  }, [job])
  const check = useMemo(() => deliveryCheck(career)!, [career])
  const cost = partsCost(job)
  const budgetRatio = cost / job.contract.budget

  return (
    <aside className="panel live-panel" data-testid="live-panel">
      <h2 className="panel-title">{t.configurator.metrics}</h2>

      <section className="live-section">
        <div className="live-row">
          <span>{t.configurator.cost}</span>
          <span className={`mono ${cost > job.contract.budget ? 'negative' : ''}`} data-testid="parts-cost">
            {formatMoney(cost, language)} / {formatMoney(job.contract.budget, language)}
          </span>
        </div>
        <Meter value={cost} max={job.contract.budget} tone={budgetRatio > 1 ? 'danger' : budgetRatio > 0.9 ? 'warning' : 'accent'} />
      </section>

      <section className="live-section">
        <div className="live-row">
          <span>{t.configurator.compatibility}</span>
          <span className={`tag ${STATUS_TAG[analysis.compatibility.status]}`} data-testid="compat-status">
            {t.configurator.preview[analysis.compatibility.status]}
          </span>
        </div>
        {analysis.compatibility.issues.filter((issue) => issue.code !== 'missing').length > 0 && (
          <ul className="issue-list">
            {analysis.compatibility.issues
              .filter((issue) => issue.code !== 'missing')
              .map((issue, index) => (
                <li key={index} className={`issue--${issue.severity}`}>
                  <Icon name={issue.severity === 'error' ? 'cross' : 'warning'} size={14} />
                  <span>
                    {issue.message[language]}
                    {issue.fix && <small>{issue.fix[language]}</small>}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>

      {analysis.sim ? (
        <>
          <section className="live-section">
            <h3 className="live-heading">{t.configurator.performance}</h3>
            <div className="fps-grid">
              {(['1080p', '1440p', '4k'] as const).map((resolution) => (
                <div key={resolution} className="fps-cell">
                  <span className="mono fps-cell__value">{analysis.sim!.perf.fps[resolution]}</span>
                  <span className="fps-cell__label">
                    {resolution} · {t.units.fps}
                  </span>
                </div>
              ))}
            </div>
            <div className="live-row small">
              <span className="muted">{t.configurator.bottleneck[analysis.sim.perf.gamingBottleneck]}</span>
              <span className="mono">
                {t.configurator.office} {analysis.sim.perf.officeScore} · {t.configurator.creation} {analysis.sim.perf.creationScore}
              </span>
            </div>
          </section>

          <section className="live-section">
            <h3 className="live-heading">
              <Icon name="bolt" size={14} /> {t.configurator.power}
            </h3>
            <div className="live-row">
              <span>{t.configurator.psuLoad}</span>
              <span className="mono">
                {Math.round(analysis.sim.full.systemPower)} / {Math.round(analysis.sim.full.psuCapacity)} W
              </span>
            </div>
            <Meter
              value={analysis.sim.full.psuLoad}
              max={1}
              marker={0.8}
              tone={analysis.sim.full.psuTrip || analysis.sim.full.psuLoad > 1 ? 'danger' : analysis.sim.full.psuLoad > 0.8 ? 'warning' : 'success'}
            />
            <div className="live-row small muted">
              <span>{t.configurator.psuMargin(Math.round((1 - analysis.sim.full.psuLoad) * 100))}</span>
              <span className="mono">
                {t.configurator.gamingDraw} {Math.round(analysis.sim.gaming.wallPower)} W
              </span>
            </div>
          </section>

          <section className="live-section">
            <h3 className="live-heading">
              <Icon name="thermo" size={14} /> {t.configurator.thermals}
            </h3>
            <TempRow label={t.configurator.cpuTemp} gaming={analysis.sim.gaming.cpuTemp} full={analysis.sim.full.cpuTemp} limit={95} />
            {analysis.sim.gpu && (
              <TempRow label={t.configurator.gpuTemp} gaming={analysis.sim.gaming.gpuTemp!} full={analysis.sim.full.gpuTemp!} limit={88} />
            )}
            <div className="live-row small muted">
              <span>{t.configurator.noise}</span>
              <span className="mono">{analysis.sim.gaming.noiseDb.toFixed(1)} dB</span>
            </div>
            {(analysis.sim.full.cpuThrottled || analysis.sim.full.gpuThrottled) && (
              <div className="live-row small">
                <span className="tag tag--warn">
                  <Icon name="warning" size={12} /> {t.configurator.throttling}
                </span>
              </div>
            )}
          </section>
        </>
      ) : (
        <p className="muted small live-section">{t.configurator.incomplete}</p>
      )}

      {check.requirements.length > 0 && (
        <section className="live-section">
          <h3 className="live-heading">{t.configurator.requirements}</h3>
          <ul className="check-list" data-testid="requirements">
            {check.requirements.map((item, index) => (
              <li key={index} className={item.met ? 'is-met' : 'is-unmet'}>
                <Icon name={item.met ? 'check' : 'cross'} size={14} />
                <span>{item.label[language]}</span>
                <span className="mono">
                  {item.value} <span className="muted">({item.target})</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="live-section delivery">
        <h3 className="live-heading">{t.configurator.delivery}</h3>
        <p className={`small ${check.stability && check.stability.outcome !== 'fail' ? 'positive' : 'muted'}`}>
          {check.stability && check.stability.outcome !== 'fail' ? t.configurator.stabilityOk : t.configurator.stabilityMissing}
        </p>
        {check.blockers.length > 0 && (
          <ul className="issue-list" data-testid="blockers">
            {check.blockers.map((blocker, index) => (
              <li key={index} className="issue--warning">
                <Icon name="warning" size={14} />
                <span>{blocker[language]}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="delivery__actions">
          <button
            type="button"
            className="btn btn-block"
            disabled={!analysis.sim || analysis.compatibility.status === 'incompatible'}
            onClick={() => {
              if (runTest('stability')) navigate('bench')
            }}
            data-testid="run-stability"
          >
            {t.configurator.runStability}
          </button>
          <button type="button" className="btn btn-primary btn-lg btn-block" disabled={!check.canDeliver} onClick={() => setConfirm(true)} data-testid="deliver">
            {t.configurator.deliver}
          </button>
        </div>
      </section>

      {confirm && (
        <ConfirmDialog
          message={t.configurator.deliverConfirm}
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false)
            deliver()
          }}
        />
      )}
    </aside>
  )
}

function TempRow({ label, gaming, full, limit }: { label: string; gaming: number; full: number; limit: number }) {
  const t = useT().game
  return (
    <div className="temp-row">
      <span>{label}</span>
      <span className={`mono temp temp--${tempTone(gaming, limit)}`}>
        {Math.round(gaming)}°<small>{t.configurator.atGaming}</small>
      </span>
      <span className={`mono temp temp--${tempTone(full, limit)}`}>
        {Math.round(full)}°<small>{t.configurator.atFull}</small>
      </span>
    </div>
  )
}
