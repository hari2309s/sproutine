import type { Metadata, Viewport } from 'next'
import { Hanken_Grotesk, Young_Serif } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const hanken = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-hanken' })
// Soft cookbook serif for headlines — Rosie's voice on the page.
const youngSerif = Young_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-young-serif',
})

export const metadata: Metadata = {
  title: 'Sproutine — Eat well, one sprout at a time.',
  description:
    'A voice-first healthy eating companion that logs your meals, plans your week and nudges you gently, without the guilt.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sproutine',
  },
  openGraph: {
    title: 'Sproutine',
    description: 'Eat well, one sprout at a time.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Pinch-zoom is left at the browser default (no maximumScale/userScalable
  // lock) — locking it out blocks low-vision users from zooming the page.
  // Light/dark pair for the pre-JS paint. The inline script below and
  // useTheme.ts then sync the tag to whatever --t-bg actually resolves to,
  // because the in-app theme can differ from the OS setting.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6efe4' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1612' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* Prevent theme flash on load. 'system' (the default) leaves <html>
            without a class so globals.css follows the OS. Also syncs the
            browser/PWA chrome colour to the page background. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var t = localStorage.getItem('sproutine-theme') || 'system';
                if (t === 'dark' || t === 'light') document.documentElement.classList.add(t);
              } catch (e) {}
              var color = getComputedStyle(document.documentElement).getPropertyValue('--t-bg').trim();
              if (color) {
                document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
                  m.setAttribute('content', color);
                });
              }
            })()`,
          }}
        />
        <link
          rel="preload"
          href="/fonts/material-symbols-rounded.woff2?v=65a60f8049"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${hanken.variable} ${youngSerif.variable} font-sans h-full`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
