import type { Language } from '@shared/settings'
import { useAppStore } from '../store/app-store'
import { en } from './en'
import { fr, type Messages } from './fr'

const dictionaries: Record<Language, Messages> = { fr, en }

export function useT(): Messages {
  return dictionaries[useAppStore((state) => state.settings.language)]
}

export function useLanguage(): Language {
  return useAppStore((state) => state.settings.language)
}
