'use client'

import { createContext, useContext, useEffect, useMemo } from 'react'
import { usePersistedPreference } from '@/hooks/usePersistedPreference'
import { type Locale, type Translations, translations } from '@/lib/i18n'

const STORAGE_KEY = 'truffle-locale'

const SUPPORTED_LOCALES = Object.keys(translations) as Locale[]

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && value in translations
}

// Match the browser's preferred languages against what the app actually
// supports, most-preferred first. Falls back to nothing (caller decides the
// default) if none of the visitor's languages are supported.
function detectBrowserLocale(): Locale | null {
  if (typeof navigator === 'undefined') return null
  const candidates =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : navigator.language
        ? [navigator.language]
        : []

  for (const lang of candidates) {
    const lower = lang.toLowerCase()
    const base = lower.split('-')[0]
    const match = SUPPORTED_LOCALES.find((l) => l.toLowerCase() === lower || l.toLowerCase() === base)
    if (match) return match
  }
  return null
}

interface LanguageContextValue {
  locale: Locale
  t: Translations
  setLocale: (locale: Locale) => void
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: 'en',
  t: translations.en,
  setLocale: () => {},
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = usePersistedPreference<Locale>({
    storageKey: STORAGE_KEY,
    defaultValue: 'en',
    normalize: (raw) => (isLocale(raw) ? raw : null),
    detectFallback: detectBrowserLocale,
    // No metadataField: LanguageContext doesn't sync with Supabase itself —
    // account-level `user_metadata.language` is applied externally via
    // `setLocale` once the session resolves.
  })

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo(
    () => ({ locale, t: translations[locale], setLocale }),
    [locale, setLocale]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}
