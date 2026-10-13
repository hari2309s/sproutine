'use client'

import { useEffect, useRef, useState } from 'react'
import { THEMES, useTheme, type Theme } from '@/hooks/useTheme'
import { useLanguage } from '@/contexts/LanguageContext'
import { Icon, type IconName } from './Icon'

export const THEME_ICONS: Record<Theme, IconName> = {
  light: 'light_mode',
  dark: 'dark_mode',
  system: 'contrast',
}

/** Top-bar icon button that opens Light / Dark / System as a small menu. */
export function ThemeMenu() {
  const { t } = useLanguage()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t.theme.label}: ${t.theme[theme]}`}
        className={`icon-btn ${open ? 'bg-sproutine-surface text-sproutine-text' : ''}`}
      >
        <Icon name={THEME_ICONS[theme]} filled={open} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-40 flex w-48 flex-col rounded-2xl border border-sproutine-border bg-sproutine-card p-1.5 shadow-soft"
        >
          {THEMES.map((option) => {
            const selected = option === theme
            return (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setTheme(option)
                  setOpen(false)
                }}
                className={`flex min-h-12 items-center gap-2.5 rounded-xl px-3 text-[15px] ${
                  selected
                    ? 'bg-sproutine-accent-soft font-semibold text-sproutine-text'
                    : 'text-sproutine-text hover:bg-sproutine-surface'
                }`}
              >
                <Icon
                  name={THEME_ICONS[option]}
                  filled={selected}
                  size={20}
                  className="text-sproutine-text-secondary"
                />
                <span className="flex-1 text-left">{t.theme[option]}</span>
                {selected && <Icon name="check" size={20} className="text-sproutine-accent" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
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
