import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Truffle — Your finances, unearthed.',
  description:
    "Talk to your money. Truffle listens, understands, and surfaces what's hiding beneath the surface of your financial life — without the dread.",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Truffle',
  },
  openGraph: {
    title: 'Truffle',
    description: 'Your finances, unearthed.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Pinch-zoom is left at the browser default (no maximumScale/userScalable
  // lock) — locking it out blocks low-vision users from zooming the page.
  // A single tag (not a media-query pair) — the in-app theme toggle can
  // diverge from the OS color scheme. This is only the pre-JS fallback
  // (matches --t-surface's dark value in globals.css, the default theme);
  // the inline script below and `useTheme.ts` immediately replace it with
  // whatever --t-surface actually resolves to, so it can never drift.
  themeColor: '#1e1d1b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* Prevent theme flash on load — also seeds the tab/PWA chrome color
            (meta[name=theme-color]) from the live --t-surface CSS variable
            (same one the TopBar renders), ahead of useTheme's effect. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              var t = localStorage.getItem('truffle-theme') || 'dark';
              if (t !== 'system') document.documentElement.classList.add(t);
              var color = getComputedStyle(document.documentElement).getPropertyValue('--t-surface').trim();
              if (color) {
                var meta = document.querySelector('meta[name="theme-color"]');
                if (meta) meta.setAttribute('content', color);
              }
            })()`,
          }}
        />
      </head>
      <body className={`${inter.className} h-full`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
