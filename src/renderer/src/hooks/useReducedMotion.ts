import { useEffect, useState } from 'react'
import { useAppStore } from '../store/app-store'

const QUERY = '(prefers-reduced-motion: reduce)'

/** Combine la préférence du joueur et celle du système d'exploitation. */
export function useReducedMotion(): boolean {
  const preference = useAppStore((state) => state.settings.accessibility.reducedMotion)
  const [systemReduced, setSystemReduced] = useState(() => window.matchMedia(QUERY).matches)

  useEffect(() => {
    const media = window.matchMedia(QUERY)
    const onChange = () => setSystemReduced(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  if (preference === 'reduce') return true
  if (preference === 'full') return false
  return systemReduced
}
