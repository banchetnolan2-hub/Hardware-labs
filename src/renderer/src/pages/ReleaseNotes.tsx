import { RELEASE_NOTES } from '@shared/release-notes'
import { Backdrop } from '../components/Backdrop'
import { PageHeader } from '../components/PageHeader'
import { useLanguage, useT } from '../i18n'
import { useAppStore } from '../store/app-store'
import './pages.css'

export function ReleaseNotes() {
  const t = useT()
  const language = useLanguage()
  const installed = useAppStore((state) => state.appInfo?.version)

  return (
    <div className="page subpage">
      <Backdrop />
      <PageHeader title={t.releaseNotes.title} />
      <div className="subpage__body">
        {RELEASE_NOTES.map((note) => (
          <article key={note.version} className="panel subpage__section release">
            <header className="release__header">
              <span className="release__version mono">v{note.version}</span>
              <h2 className="release__title">{note.title[language]}</h2>
              {note.version === installed && <span className="release__badge mono">{t.releaseNotes.installed}</span>}
              <time className="release__date mono" dateTime={note.date}>
                {new Date(note.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </time>
            </header>
            <ul className="release__changes">
              {note.changes.map((change) => (
                <li key={change.fr}>{change[language]}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  )
}
