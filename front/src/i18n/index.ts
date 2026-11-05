import { createI18n } from 'vue-i18n'
import type { Locale } from '@/types/api'
import en from './en'
import ptBR from './pt-BR'

export const LOCALES: { value: Locale; label: string; short: string }[] = [
  { value: 'pt-BR', label: 'Português (Brasil)', short: 'PT' },
  { value: 'en', label: 'English', short: 'EN' },
]

const STORAGE_KEY = 'nimbus.locale'

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'pt-BR' || saved === 'en') return saved
  } catch {
    // Storage unavailable: fall back to the browser language.
  }
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'en',
  messages: { 'pt-BR': ptBR, en },
})

export function setLocale(locale: Locale) {
  i18n.global.locale.value = locale
  document.documentElement.lang = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // ignore
  }
}

export function currentLocale(): Locale {
  return i18n.global.locale.value
}
