'use client'

import { THEMES, useTheme, type Theme } from '@/hooks/useTheme'
import { useLanguage } from '@/contexts/LanguageContext'
import { Icon, type IconName } from './Icon'

export const THEME_ICONS: Record<Theme, IconName> = {
  light: 'light_mode',
  dark: 'dark_mode',
  system: 'contrast',
}

/** Top-bar icon button: each tap moves to the next theme (Light → Dark → System). */
export function ThemeCycle() {
  const { t } = useLanguage()
  const { theme, setTheme } = useTheme()
  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]!

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`${t.theme.label}: ${t.theme[theme]}`}
      title={`${t.theme.label}: ${t.theme[theme]}`}
      className="icon-btn"
    >
      <Icon name={THEME_ICONS[theme]} />
    </button>
  )
}

/** Segmented Light / Dark / System control, used in Settings. */
export function ThemeSegmented() {
  const { t } = useLanguage()
  const { theme, setTheme } = useTheme()
  return (
    <div
      role="radiogroup"
      aria-label={t.theme.label}
      className="flex gap-1 rounded-full bg-sproutine-surface p-1"
    >
      {THEMES.map((option) => {
        const selected = option === theme
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(option)}
            className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-sm ${
              selected
                ? 'bg-sproutine-card font-semibold text-sproutine-text shadow-soft'
                : 'font-medium text-sproutine-text-secondary hover:text-sproutine-text'
            }`}
          >
            <Icon name={THEME_ICONS[option]} filled={selected} size={20} />
            {t.theme[option]}
          </button>
        )
      })}
    </div>
  )
}
