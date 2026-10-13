import { useEffect } from 'react'
import { usePersistedPreference } from './usePersistedPreference'

export type Theme = 'dark' | 'light' | 'system'

export const THEMES: Theme[] = ['light', 'dark', 'system']
const STORAGE_KEY = 'sproutine-theme'
// The top bar sits on the page background (--t-bg) — read that same CSS
// custom property for the tab/PWA chrome color instead of a hand-maintained
// hex table, so the two can never drift apart. Works for 'system' too: with
// no .dark/.light class set, --t-bg already resolves via the
// `@media (prefers-color-scheme)` block in globals.css.
const COLOR_VAR = '--t-bg'

function syncThemeColorMeta() {
  if (typeof document === 'undefined') return
  const color = getComputedStyle(document.documentElement).getPropertyValue(COLOR_VAR).trim()
  if (!color) return
  // layout.tsx emits a light/dark media pair; the in-app theme can differ
  // from the OS, so both get the colour that's actually showing.
  const metas = document.querySelectorAll('meta[name="theme-color"]')
  if (metas.length === 0) {
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    meta.setAttribute('content', color)
    document.head.appendChild(meta)
    return
  }
  metas.forEach((meta) => meta.setAttribute('content', color))
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  if (theme !== 'system') root.classList.add(theme)
  syncThemeColorMeta()
  // Mirror to a cookie (readable server-side, unlike localStorage) so
  // manifest.json's route handler can color the installed PWA's status bar
  // to match instead of always shipping the default palette.
  document.cookie = `${STORAGE_KEY}=${theme}; path=/; max-age=31536000; samesite=lax`
}

export function useTheme() {
  const [theme, setTheme] = usePersistedPreference<Theme>({
    storageKey: STORAGE_KEY,
    defaultValue: 'system',
    normalize: (raw) => (THEMES as unknown[]).includes(raw) ? (raw as Theme) : null,
  })

  // The inline script in layout.tsx applies the class before paint; this
  // keeps the class, theme-color meta and cookie in sync with later changes.
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // When following the OS ("system"), keep the tab color live as the OS
  // scheme flips while the app is open — CSS re-resolves --t-bg on its
  // own, but the theme-color meta tag needs an explicit re-read to catch up.
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => syncThemeColorMeta()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  return { theme, setTheme }
}
