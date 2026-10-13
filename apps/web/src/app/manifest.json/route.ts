import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Mirrors globals.css --t-bg for each theme. The installed PWA's
// OS chrome (Android status bar) is colored from this manifest's theme_color,
// not from the live meta[name=theme-color] tag useTheme.ts keeps in sync — so
// without this, a user on the light theme gets a dark status bar over a light
// app. Served dynamically (instead of public/manifest.json) so it can read
// the theme cookie useTheme.ts writes alongside localStorage.
const PALETTES = {
  dark: { background_color: '#1c1612', theme_color: '#1c1612' },
  light: { background_color: '#f6efe4', theme_color: '#f6efe4' },
} as const

export async function GET() {
  const cookieStore = await cookies()
  const theme = cookieStore.get('sproutine-theme')?.value
  // 'system' and unset can't be resolved server-side; light is the default look.
  const palette = theme === 'dark' ? PALETTES.dark : PALETTES.light

  return NextResponse.json(
    {
      name: 'Sproutine',
      short_name: 'Sproutine',
      description: 'Eat well, one sprout at a time.',
      start_url: '/',
      display: 'standalone',
      background_color: palette.background_color,
      theme_color: palette.theme_color,
      orientation: 'portrait',
      // 'any' keeps the transparent plate; 'maskable' versions sit on a sage
      // background with safe-zone padding so Android's mask can't clip them.
      icons: [
        { src: '/icons/sproutine.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        {
          src: '/web-app-manifest-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: '/web-app-manifest-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } }
  )
}
