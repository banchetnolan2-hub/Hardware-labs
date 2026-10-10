import type { Language } from '@shared/settings'

const money: Record<Language, Intl.NumberFormat> = {
  fr: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
  en: new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

export function formatMoney(value: number, language: Language): string {
  return money[language].format(value)
}

export function formatSigned(value: number, language: Language): string {
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatMoney(Math.abs(value), language)}`
}

export function formatNumber(value: number, language: Language, digits = 0): string {
  return value.toLocaleString(language === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}
