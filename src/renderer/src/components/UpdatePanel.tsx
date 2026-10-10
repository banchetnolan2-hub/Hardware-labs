import type { UpdateStatus } from '@shared/updater'
import { useState } from 'react'
import { useT } from '../i18n'
import { useAppStore } from '../store/app-store'

export function useUpdateStatusLabel(status: UpdateStatus): string {
  const s = useT().settings.updates.states
  switch (status.state) {
    case 'unsupported':
      return s.unsupported
    case 'idle':
      return s.idle
    case 'checking':
      return s.checking
    case 'not-available':
      return s.notAvailable
    case 'available':
      return s.available(status.version)
    case 'downloading':
      return s.downloading(status.version, Math.floor(status.percent))
    case 'downloaded':
      return s.downloaded(status.version)
    case 'error':
      return s[status.kind]
  }
}

/** Contrôles de mise à jour affichés dans les paramètres. */
export function UpdateControls() {
  const t = useT().settings.updates
  const status = useAppStore((state) => state.updateStatus)
  const label = useUpdateStatusLabel(status)
  const [postponed, setPostponed] = useState(false)
  const tone =
    status.state === 'error' ? 'error' : status.state === 'available' || status.state === 'downloaded' ? 'accent' : ''

  return (
    <div className="update-controls">
      <div className={`update-controls__status update-controls__status--${tone}`} role="status">
        {label}
        {status.state === 'error' && <div className="update-controls__detail mono">{status.message.split('\n')[0]}</div>}
        {postponed && status.state === 'downloaded' && <div className="update-controls__detail">{t.laterHint}</div>}
      </div>
      {status.state === 'downloading' && (
        <div className="progress" aria-hidden>
          <div className="progress__bar" style={{ transform: `scaleX(${status.percent / 100})` }} />
        </div>
      )}
      <div className="update-controls__actions">
        {status.state === 'available' && (
          <button type="button" className="btn btn-primary" onClick={() => void window.hardwareLab.downloadUpdate()}>
            {t.download}
          </button>
        )}
        {status.state === 'downloaded' && (
          <>
            {!postponed && (
              <button type="button" className="btn" onClick={() => setPostponed(true)}>
                {t.later}
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={() => void window.hardwareLab.installUpdate()}>
              {t.install}
            </button>
          </>
        )}
        {status.state !== 'available' && status.state !== 'downloaded' && (
          <button
            type="button"
            className="btn"
            disabled={status.state === 'unsupported' || status.state === 'checking' || status.state === 'downloading'}
            onClick={() => void window.hardwareLab.checkForUpdates()}
          >
            {t.check}
          </button>
        )}
      </div>
    </div>
  )
}
