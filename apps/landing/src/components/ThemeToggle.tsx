'use client'

import { useEffect, useState } from 'react'
import { Icon } from './ui'

type Theme = 'light' | 'dark'

function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme
  if (set === 'light' || set === 'dark') return set
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null)
  useEffect(() => setTheme(currentTheme()), [])

  const toggle = () => {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('sproutine-theme', next)
    } catch {
      // Private mode or blocked storage: the theme still applies for this visit.
    }
    setTheme(next)
  }

  const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-full border border-line-strong text-ink2 hover:bg-surface"
    >
      <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={22} />
    </button>
  )
}
