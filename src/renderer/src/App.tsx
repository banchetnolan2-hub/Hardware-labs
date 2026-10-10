import { useCallback, useEffect, useState } from 'react'
import logoEmblem from './assets/brand/logo-emblem.png'
import { useReducedMotion } from './hooks/useReducedMotion'
import { Intro } from './intro/Intro'
import { MainMenu } from './pages/MainMenu'
import { ReleaseNotes } from './pages/ReleaseNotes'
import { Settings } from './pages/Settings'
import { useAppStore } from './store/app-store'

type IntroState = 'pending' | 'playing' | 'leaving' | 'done'

export function App() {
  const ready = useAppStore((state) => state.ready)
  const route = useAppStore((state) => state.route)
  const language = useAppStore((state) => state.settings.language)
  const navigate = useAppStore((state) => state.navigate)
  const reducedMotion = useReducedMotion()
  const [intro, setIntro] = useState<IntroState>('pending')

  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full'
  }, [reducedMotion])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  // L'introduction est décidée une seule fois, au démarrage.
  useEffect(() => {
    if (ready && intro === 'pending') {
      setIntro(useAppStore.getState().settings.intro.enabled ? 'playing' : 'done')
    }
  }, [ready, intro])

  // Échap ramène au menu depuis les pages secondaires.
  useEffect(() => {
    if (intro !== 'done' || route === 'menu') return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') navigate('menu')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [intro, route, navigate])

  const onExitStart = useCallback(() => setIntro('leaving'), [])
  const onExitEnd = useCallback(() => setIntro('done'), [])

  if (!ready || intro === 'pending') return null

  const showPages = intro === 'leaving' || intro === 'done'

  return (
    <>
      <div className={`titlebar ${intro === 'done' ? 'is-visible' : ''}`}>
        <img src={logoEmblem} alt="" draggable={false} />
        HARDWARE LAB
      </div>
      {showPages && (
        <main className="app-shell">
          {route === 'menu' && <MainMenu />}
          {route === 'settings' && <Settings />}
          {route === 'release-notes' && <ReleaseNotes />}
        </main>
      )}
      {(intro === 'playing' || intro === 'leaving') && (
        <Intro reducedMotion={reducedMotion} onExitStart={onExitStart} onExitEnd={onExitEnd} />
      )}
    </>
  )
}
