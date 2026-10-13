import { describe, it, expect } from 'vitest'
import { DIETS, EU_ALLERGENS } from '@sproutine/types'
import { translations, LOCALE_LABELS, type Locale } from '../i18n'

const en = translations.en

// ─── Structural completeness ────────────────────────────────────────────────

describe('translations completeness', () => {
  const locales: Locale[] = ['en']
  const topLevelKeys = Object.keys(en) as (keyof typeof en)[]

  it.each(locales)('%s has all top-level keys', (locale) => {
    for (const key of topLevelKeys) {
      expect(translations[locale], `missing key: ${key}`).toHaveProperty(key)
    }
  })

  it('LOCALE_LABELS has an entry for every locale', () => {
    for (const locale of locales) {
      expect(LOCALE_LABELS[locale]).toBeDefined()
      expect(LOCALE_LABELS[locale].flag).toBeTruthy()
      expect(LOCALE_LABELS[locale].label).toBeTruthy()
    }
  })
})

// ─── auth.magicLinkSent ──────────────────────────────────────────────────────

describe('auth.magicLinkSent', () => {
  it('en: interpolates email', () => {
    expect(en.auth.magicLinkSent('hello@example.com')).toContain('hello@example.com')
  })
})

// ─── Domain labels cover every enum value ────────────────────────────────────

describe('domain labels', () => {
  it('has a label for every diet', () => {
    for (const diet of DIETS) expect(en.diets[diet]).toBeTruthy()
  })

  it('has a label for every EU allergen', () => {
    for (const allergen of EU_ALLERGENS) expect(en.allergens[allergen]).toBeTruthy()
  })
})
