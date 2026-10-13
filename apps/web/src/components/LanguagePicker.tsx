'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { LOCALE_LABELS, type Locale } from '@/lib/i18n'

interface LanguagePickerProps {
  onChange: (locale: Locale) => void
}

export function LanguagePicker({ onChange }: LanguagePickerProps) {
  const { locale } = useLanguage()
  return (
    <div className="flex gap-2">
      {(Object.entries(LOCALE_LABELS) as [Locale, { flag: string; label: string }][]).map(
        ([loc, { flag, label }]) => (
          <button
            key={loc}
            type="button"
            onClick={() => onChange(loc)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              locale === loc
                ? 'bg-truffle-amber text-truffle-bg'
                : 'bg-truffle-surface text-truffle-muted border border-truffle-border'
            }`}
          >
            <span>{flag}</span>
            <span>{label}</span>
          </button>
        )
      )}
    </div>
  )
}
