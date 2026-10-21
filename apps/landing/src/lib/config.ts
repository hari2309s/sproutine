export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  ''
)
// The app's demo sign-in is a same-origin POST, so the landing page can only
// send visitors to the app with the demo button highlighted.
export const DEMO_URL = `${APP_URL}/?demo=1`
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3001')
).replace(/\/$/, '')
export const GITHUB_URL = 'https://github.com/hari2309s/sproutine'
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'hello@sproutine.app'

export const NAV_LINKS = [
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how' },
  { label: 'Safety', href: '/#safety' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'FAQ', href: '/#faq' },
] as const

/** Impressum (§ 5 DDG) details. Production builds fail without name and address. */
export const IMPRINT = {
  name: process.env.NEXT_PUBLIC_IMPRINT_NAME ?? '',
  // One address line per "\n" (or real newline) in the env value.
  address: (process.env.NEXT_PUBLIC_IMPRINT_ADDRESS ?? '')
    .split(/\\n|\n/)
    .map((l) => l.trim())
    .filter(Boolean),
  phone: process.env.NEXT_PUBLIC_IMPRINT_PHONE ?? '',
  vatId: process.env.NEXT_PUBLIC_IMPRINT_VAT_ID ?? '',
}

export const CANCEL_URL = `${APP_URL}/cancel`
