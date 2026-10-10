import type { ReactNode } from 'react'
import { useT } from '../i18n'
import { useAppStore } from '../store/app-store'

/** En-tête commun aux pages secondaires, avec retour au menu. */
export function PageHeader({ title, aside }: { title: string; aside?: ReactNode }) {
  const t = useT()
  const back = useAppStore((state) => state.back)
  return (
    <header className="page-header">
      <button type="button" className="btn btn-ghost" onClick={back}>
        <span aria-hidden>←</span> {t.common.back}
        <kbd className="page-header__kbd">Esc</kbd>
      </button>
      <h1 className="page-header__title">{title}</h1>
      <div className="page-header__aside">{aside}</div>
    </header>
  )
}
