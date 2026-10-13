import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Mirrors globals.css --t-bg / --t-surface for each theme. The installed PWA's
// OS chrome (Android status bar) is colored from this manifest's theme_color,
// not from the live meta[name=theme-color] tag useTheme.ts keeps in sync — so
// without this, a user on the light theme gets a dark status bar over a light
// app. Served dynamically (instead of public/manifest.json) so it can read
// the theme cookie useTheme.ts writes alongside localStorage.
const PALETTES = {
  dark: { background_color: '#0e0d0c', theme_color: '#1e1d1b' },
  light: { background_color: '#faf6f0', theme_color: '#f0e9df' },
} as const

export async function GET() {
  const cookieStore = await cookies()
  const theme = cookieStore.get('truffle-theme')?.value
  const palette = theme === 'light' ? PALETTES.light : PALETTES.dark

  return NextResponse.json(
    {
      name: 'Truffle',
      short_name: 'Truffle',
      description: 'Your finances, unearthed.',
      start_url: '/',
      display: 'standalone',
      background_color: palette.background_color,
      theme_color: palette.theme_color,
      orientation: 'portrait',
      icons: [
        {
          src: '/icons/truffle.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/icons/truffle.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } }
  )
}
