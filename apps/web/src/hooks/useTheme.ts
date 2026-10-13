import { useEffect, useState } from 'react'

export type Theme = 'dark' | 'light' | 'system'

const THEMES: Theme[] = ['dark', 'light', 'system']
const STORAGE_KEY = 'truffle-theme'
// The TopBar renders `bg-truffle-surface` (--t-surface) — read that same CSS
// custom property for the tab/PWA chrome color instead of a hand-maintained
// hex table, so the two can never drift apart. Works for 'system' too: with
// no .dark/.light class set, --t-surface already resolves via the
// `@media (prefers-color-scheme)` block in globals.css, so getComputedStyle
// gives the right answer without any JS-side OS-preference logic.
const COLOR_VAR = '--t-surface'

function syncThemeColorMeta() {
  if (typeof document === 'undefined') return
  const color = getComputedStyle(document.documentElement).getPropertyValue(COLOR_VAR).trim()
  if (!color) return
  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', color)
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  if (theme !== 'system') root.classList.add(theme)
  syncThemeColorMeta()
  // Mirror to a cookie (readable server-side, unlike localStorage) so
  // manifest.json's route handler can color the installed PWA's status bar
  // to match instead of always shipping the dark-theme default.
  document.cookie = `${STORAGE_KEY}=${theme}; path=/; max-age=31536000; samesite=lax`
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'dark'
    setTheme(stored)
    applyTheme(stored)
  }, [])

  // When following the OS ("system"), keep the tab color live as the OS
  // scheme flips while the app is open — CSS re-resolves --t-surface on its
  // own, but the theme-color meta tag needs an explicit re-read to catch up.
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => syncThemeColorMeta()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const cycleTheme = () => {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] ?? 'dark'
    setTheme(next)
    applyTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  return { theme, cycleTheme }
}
