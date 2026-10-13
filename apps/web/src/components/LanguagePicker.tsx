'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { LOCALE_LABELS, type Locale } from '@/lib/i18n'
import { Icon } from './Icon'

/** Segmented language control. */
export function LanguagePicker({ onChange }: { onChange: (locale: Locale) => void }) {
  const { locale } = useLanguage()
  return (
    <div role="radiogroup" className="flex gap-1 rounded-full bg-sproutine-surface p-1">
      {(Object.entries(LOCALE_LABELS) as [Locale, { flag: string; label: string }][]).map(
        ([loc, { label }]) => {
          const selected = locale === loc
          return (
            <button
              key={loc}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(loc)}
              className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-[15px] ${
                selected
                  ? 'bg-sproutine-card font-semibold text-sproutine-text shadow-soft'
                  : 'font-medium text-sproutine-text-secondary hover:text-sproutine-text'
              }`}
            >
              {selected && <Icon name="check" size={18} />}
              {label}
            </button>
          )
        }
      )}
    </div>
  )
}
