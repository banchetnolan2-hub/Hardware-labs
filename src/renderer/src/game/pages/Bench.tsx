import { machineKey, testHours } from '@career/career'
import { SERVICES } from '@career/progression'
import { BENCH_TESTS, type BenchEventCode } from '@simulation/bench'
import { useLanguage, useT } from '../../i18n'
import { useAppStore } from '../../store/app-store'
import { useGameStore } from '../../store/game-store'
import { BenchChart } from '../Chart'
import { formatMoney } from '../format'
import { Icon } from '../icons'
import { EmptyState, Meter } from '../ui'
import './pages.css'

const EVENT_LABEL: Record<BenchEventCode, { fr: string; en: string; tone: 'warning' | 'danger' }> = {
  shutdown: { fr: 'Arrêt', en: 'Shutdown', tone: 'danger' },
  'bsod-memory': { fr: 'Écran bleu', en: 'Blue screen', tone: 'danger' },
  'cpu-throttle': { fr: 'Limite CPU', en: 'CPU throttle', tone: 'warning' },
  'gpu-throttle': { fr: 'Limite GPU', en: 'GPU throttle', tone: 'warning' },
  'vrm-limit': { fr: 'VRM', en: 'VRM', tone: 'warning' },
  'io-errors': { fr: 'Erreurs disque', en: 'Disk errors', tone: 'warning' }
}

export function Bench() {
  const t = useT().game
  const language = useLanguage()
  const career = useGameStore((state) => state.career)!
  const lastBench = useGameStore((state) => state.lastBench)
  const runTest = useGameStore((state) => state.test)
  const service = useGameStore((state) => state.service)
  const navigate = useAppStore((state) => state.navigate)
  const job = career.active

  if (!job) {
    return (
      <EmptyState
        icon="bench"
        title={t.bench.noJob}
        action={
          <button type="button" className="btn btn-primary" onClick={() => navigate('contracts')}>
            {t.configurator.goContracts}
          </button>
        }
      />
    )
  }

  const left = Math.round((job.contract.hoursAllowed - job.hoursUsed) * 10) / 10
  const key = machineKey(job)
  const repair = !!job.contract.machine && job.contract.machine.faults.length > 0

  return (
    <>
      <div className="page-title">
        <div>
          <h1>{t.bench.title}</h1>
          <p>{repair ? t.bench.faultsHint : job.contract.title[language]}</p>
        </div>
        <div className="hours-box">
          <span className="stat__label">{t.common.time}</span>
          <span className={`mono ${left < 0 ? 'negative' : ''}`}>{t.bench.hoursLeft(left)}</span>
          <Meter value={job.hoursUsed} max={job.contract.hoursAllowed} tone={left < 0 ? 'danger' : left < 1 ? 'warning' : 'accent'} />
        </div>
      </div>

      <div className="bench">
        <section className="panel bench__tests">
          <h2 className="panel-title">{t.bench.tests}</h2>
          <ul className="test-list">
            {BENCH_TESTS.map((test) => {
              const missingTool = !!test.tool && !career.tools.includes(test.tool)
              return (
                <li key={test.id} className={`test ${missingTool ? 'is-locked' : ''}`}>
                  <div>
                    <div className="test__name">{test.name[language]}</div>
                    <div className="test__desc">{test.description[language]}</div>
                  </div>
                  <div className="test__side">
                    <span className="mono small">
                      <Icon name="clock" size={12} /> {testHours(career, test.id)} h
                    </span>
                    {missingTool ? (
                      <span className="tag">
                        <Icon name="lock" size={12} /> {t.bench.requiresTool}
                      </span>
                    ) : (
                      <button type="button" className="btn" onClick={() => runTest(test.id)} data-testid={`run-${test.id}`}>
                        {t.bench.run}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          {repair && (
            <>
              <h2 className="panel-title spaced">{t.bench.services}</h2>
              <p className="muted small">{t.bench.servicesHint}</p>
              <ul className="test-list">
                {SERVICES.map((item) => {
                  const done = job.services.some((entry) => entry.service === item.id)
                  return (
                    <li key={item.id} className="test">
                      <div>
                        <div className="test__name">{item.name[language]}</div>
                        <div className="test__desc">{item.description[language]}</div>
                      </div>
                      <div className="test__side">
                        <span className="mono small">
                          <Icon name="clock" size={12} /> {item.hours} h
                        </span>
                        {done ? (
                          <span className="tag tag--ok">{t.bench.done}</span>
                        ) : (
                          <button type="button" className="btn" onClick={() => service(item.id)} data-testid={`service-${item.id}`}>
                            {t.bench.perform(formatMoney(item.cost, language))}
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>

        <section className="panel bench__result" data-testid="bench-result">
          <h2 className="panel-title">{t.bench.result}</h2>
          {lastBench ? (
            <div className="result" key={`${lastBench.test}-${job.bench.length}`}>
              <div className="result__header">
                <strong>{BENCH_TESTS.find((test) => test.id === lastBench.test)!.name[language]}</strong>
                <span className={`tag ${lastBench.outcome === 'pass' ? 'tag--ok' : lastBench.outcome === 'warning' ? 'tag--warn' : 'tag--bad'}`} data-testid="bench-outcome">
                  {t.bench.outcome[lastBench.outcome]}
                </span>
              </div>
              {lastBench.samples.length > 1 && (
                <>
                  <BenchChart
                    animationKey={`${lastBench.test}-${job.bench.length}`}
                    samples={lastBench.samples}
                    duration={BENCH_TESTS.find((test) => test.id === lastBench.test)!.durationMin}
                    series={[
                      { key: 'cpuTemp', label: t.bench.chart.cpu, color: '#19c8ff', axis: 'temp' },
                      { key: 'gpuTemp', label: t.bench.chart.gpu, color: '#b48cff', axis: 'temp' },
                      { key: 'cpuClock', label: t.bench.chart.clock, color: '#3ccf8e', axis: 'percent' },
                      { key: 'power', label: t.bench.chart.power, color: '#f5a524', axis: 'power' }
                    ]}
                    events={lastBench.events
                      .filter((event) => event.code !== 'vrm-limit')
                      .map((event) => ({ t: event.t, label: EVENT_LABEL[event.code][language], tone: EVENT_LABEL[event.code].tone }))}
                  />
                  <div className="chart-legend">
                    <span style={{ color: '#19c8ff' }}>■ {t.bench.chart.cpu}</span>
                    <span style={{ color: '#b48cff' }}>■ {t.bench.chart.gpu}</span>
                    <span style={{ color: '#3ccf8e' }}>■ {t.bench.chart.clock}</span>
                    <span style={{ color: '#f5a524' }}>■ {t.bench.chart.power}</span>
                  </div>
                  <div className="result__metrics">
                    {lastBench.metrics.maxCpuTemp !== null && <span className="mono">CPU max {Math.round(lastBench.metrics.maxCpuTemp)} °C</span>}
                    {lastBench.metrics.maxGpuTemp !== null && <span className="mono">GPU max {Math.round(lastBench.metrics.maxGpuTemp)} °C</span>}
                    {lastBench.metrics.maxPower !== null && <span className="mono">{lastBench.metrics.maxPower} W</span>}
                    {lastBench.metrics.minCpuClock !== null && <span className="mono">CPU ≥ {lastBench.metrics.minCpuClock} %</span>}
                  </div>
                </>
              )}
              <h3 className="live-heading">{t.bench.findings}</h3>
              <ul className="findings" data-testid="findings">
                {lastBench.findings.map((finding, index) => (
                  <li key={index} style={{ animationDelay: `${lastBench.samples.length > 1 ? 2200 + index * 150 : index * 120}ms` }}>
                    {finding[language]}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState icon="bench" title={t.bench.noResult} />
          )}
        </section>

        <section className="panel bench__log">
          <h2 className="panel-title">{t.bench.history}</h2>
          {job.bench.length === 0 ? (
            <p className="muted small">{t.bench.historyEmpty}</p>
          ) : (
            <ol className="bench-log">
              {[...job.bench].reverse().map((record, index) => (
                <li key={index} className={record.buildKey !== key ? 'is-outdated' : ''}>
                  <div className="bench-log__head">
                    <span>{BENCH_TESTS.find((test) => test.id === record.test)!.name[language]}</span>
                    <span className={`tag ${record.outcome === 'pass' ? 'tag--ok' : record.outcome === 'warning' ? 'tag--warn' : 'tag--bad'}`}>{t.bench.outcome[record.outcome]}</span>
                  </div>
                  {record.buildKey !== key && <div className="small muted">{t.bench.outdated}</div>}
                  <ul>
                    {record.findings.map((finding, findingIndex) => (
                      <li key={findingIndex}>{finding[language]}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  )
}
