import { useCallback, useEffect, useState } from 'react'
import logoEmblem from './assets/brand/logo-emblem.png'
import { useReducedMotion } from './hooks/useReducedMotion'
import { Intro } from './intro/Intro'
import { MainMenu } from './pages/MainMenu'
import { ReleaseNotes } from './pages/ReleaseNotes'
import { Settings } from './pages/Settings'
import { GameShell } from './game/GameShell'
import { Bench } from './game/pages/Bench'
import { Configurator } from './game/pages/Configurator'
import { Contracts } from './game/pages/Contracts'
import { Finances } from './game/pages/Finances'
import { Library } from './game/pages/Library'
import { Progress } from './game/pages/Progress'
import { Workshop } from './game/pages/Workshop'
import { Results } from './game/Results'
import { GAME_ROUTES, useAppStore, type GameRoute } from './store/app-store'
import { useGameStore } from './store/game-store'

const GAME_PAGES: Record<GameRoute, () => React.JSX.Element> = {
  workshop: Workshop,
  contracts: Contracts,
  configurator: Configurator,
  bench: Bench,
  library: Library,
  finances: Finances,
  progress: Progress
}

type IntroState = 'pending' | 'playing' | 'leaving' | 'done'

export function App() {
  const ready = useAppStore((state) => state.ready)
  const route = useAppStore((state) => state.route)
  const language = useAppStore((state) => state.settings.language)
  const back = useAppStore((state) => state.back)
  const reducedMotion = useReducedMotion()
  const gameStatus = useGameStore((state) => state.status)
  const career = useGameStore((state) => state.career)
  const report = useGameStore((state) => state.report)
  const loadCareer = useGameStore((state) => state.load)

  useEffect(() => {
    void loadCareer()
  }, [loadCareer])
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

  // Échap ferme les pages secondaires (paramètres, notes de version).
  useEffect(() => {
    if (intro !== 'done' || (route !== 'settings' && route !== 'release-notes')) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [intro, route, back])

  const onExitStart = useCallback(() => setIntro('leaving'), [])
  const onExitEnd = useCallback(() => setIntro('done'), [])

  if (!ready || intro === 'pending' || gameStatus !== 'ready') return null

  const gameRoute = (GAME_ROUTES as string[]).includes(route) ? (route as GameRoute) : null
  // Sans carrière, seule la bibliothèque est consultable.
  const GamePage = gameRoute && (career || gameRoute === 'library') ? GAME_PAGES[gameRoute] : null

  const showPages = intro === 'leaving' || intro === 'done'

  return (
    <>
      <div className={`titlebar ${intro === 'done' ? 'is-visible' : ''}`}>
        <img src={logoEmblem} alt="" draggable={false} />
        HARDWARE LAB
      </div>
      {showPages && (
        <main className="app-shell">
          {(route === 'menu' || (gameRoute && !GamePage)) && <MainMenu />}
          {GamePage && (
            <GameShell>
              <GamePage />
            </GameShell>
          )}
          {report && <Results report={report} />}
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
