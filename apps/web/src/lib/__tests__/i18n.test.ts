import { describe, it, expect } from 'vitest'
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

// ─── transactions.filteredCount ──────────────────────────────────────────────

describe('transactions.filteredCount', () => {
  it('en: formats filtered/total', () => {
    expect(en.transactions.filteredCount(3, 10)).toBe('3 of 10 transactions')
  })
})

// ─── transactions.count ──────────────────────────────────────────────────────

describe('transactions.count', () => {
  it('en: formats count', () => {
    expect(en.transactions.count(5)).toBe('5 transactions')
  })
})

// ─── transactions.loadMonth ──────────────────────────────────────────────────

describe('transactions.loadMonth', () => {
  it('en: formats label', () => {
    expect(en.transactions.loadMonth('May 2026')).toBe('Load May 2026')
  })
})

// ─── csvImport.transactionsFound ─────────────────────────────────────────────

describe('csvImport.transactionsFound', () => {
  it('en: singular', () => {
    const result = en.csvImport.transactionsFound(1)
    expect(result).toContain('1 transaction')
    expect(result).not.toContain('transactions ')
  })

  it('en: plural', () => {
    expect(en.csvImport.transactionsFound(3)).toContain('3 transactions')
  })
})

// ─── csvImport.selectedOf ────────────────────────────────────────────────────

describe('csvImport.selectedOf', () => {
  it('en: formats selected/total', () => {
    expect(en.csvImport.selectedOf(2, 5)).toBe('2 of 5 selected')
  })
})

// ─── csvImport.import ────────────────────────────────────────────────────────

describe('csvImport.import', () => {
  it('en: formats count', () => {
    expect(en.csvImport.import(3)).toBe('Import 3')
  })
})

// ─── csvImport.imported ──────────────────────────────────────────────────────

describe('csvImport.imported', () => {
  it('en: singular', () => {
    expect(en.csvImport.imported(1)).toContain('1 transaction')
    expect(en.csvImport.imported(1)).not.toContain('transactions ')
  })

  it('en: plural', () => {
    expect(en.csvImport.imported(5)).toContain('5 transactions')
  })
})

// ─── receiptUpload.fileTooLarge ───────────────────────────────────────────────

describe('receiptUpload.fileTooLarge', () => {
  it('en: interpolates maxMb', () => {
    expect(en.receiptUpload.fileTooLarge(10)).toContain('10 MB')
  })
})

// ─── savingsGoals.daysLeft ───────────────────────────────────────────────────

describe('savingsGoals.daysLeft', () => {
  it('en: contains day count', () => {
    expect(en.savingsGoals.daysLeft(7)).toContain('7')
  })
})

// ─── proposals.goal.addedToGoals ─────────────────────────────────────────────

describe('proposals.goal.addedToGoals', () => {
  it('en: interpolates emoji and name', () => {
    const result = en.proposals.goal.addedToGoals('🏠', 'House')
    expect(result).toContain('🏠')
    expect(result).toContain('House')
  })
})

// ─── weeklySummary interpolations ────────────────────────────────────────────

describe('weeklySummary', () => {
  it('en: spent interpolates amount', () => {
    expect(en.weeklySummary.spent('¥5,000')).toContain('¥5,000')
  })

  it('en: earned interpolates amount', () => {
    expect(en.weeklySummary.earned('¥10,000')).toContain('¥10,000')
  })
})

// ─── savingsHabits.totalSaved ────────────────────────────────────────────────

describe('savingsHabits.totalSaved', () => {
  it('en: interpolates amount', () => {
    expect(en.savingsHabits.totalSaved('¥50,000')).toContain('¥50,000')
  })
})
