import type { Metadata, Viewport } from 'next'
import { Hanken_Grotesk, Young_Serif } from 'next/font/google'
import { SITE_URL } from '@/lib/config'
import './globals.css'

const hanken = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-hanken' })
const youngSerif = Young_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-young-serif',
})

const description =
  'Say what you ate. Rosie turns it into a kind, accurate meal log, with numbers from real food data. Free to start, made in Berlin.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Sproutine · Eat well, one sprout at a time', template: '%s · Sproutine' },
  description,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Sproutine · Eat well, one sprout at a time',
    description,
    url: '/',
    siteName: 'Sproutine',
    images: [{ url: '/icons/sproutine.png', width: 512, height: 512, alt: 'Sproutine' }],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: { card: 'summary', title: 'Sproutine', description },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6efe4' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1612' },
  ],
}

// Applies the saved theme before first paint so dark mode doesn't flash.
const themeScript = `document.documentElement.classList.add('js');try{var t=localStorage.getItem('sproutine-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link
          rel="preload"
          href="/fonts/material-symbols-rounded.woff2?v=1aa307d229"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${hanken.variable} ${youngSerif.variable} font-sans`}>{children}</body>
    </html>
  )
}
