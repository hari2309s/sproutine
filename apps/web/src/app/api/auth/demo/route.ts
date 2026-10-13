import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Cheap in-process throttle. Serverless instances aren't shared, but this still
// blunts a single instance being hammered, and the same-origin check below is
// the real cross-site defense. Enough for a demo login — not a general auth SLA.
let lastCallAt = 0
const MIN_INTERVAL_MS = 1500

/**
 * One-click demo sign-in.
 *
 * Truffle only does passwordless magic-link auth, so there is no password to
 * hand a visitor. Instead we mint a one-time magic-link token for the demo
 * account with the admin API (no captcha, no email round-trip) and immediately
 * exchange it for a session on the response cookies.
 *
 * Enabled only when DEMO_USER_EMAIL is set and NEXT_PUBLIC_DEMO_ENABLED === '1'.
 * The account and its data are created by `pnpm seed:demo` and refreshed nightly
 * by a GitHub Action.
 */
export async function POST(request: Request) {
  const { origin } = new URL(request.url)
  const demoEmail = process.env.DEMO_USER_EMAIL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (
    process.env.NEXT_PUBLIC_DEMO_ENABLED !== '1' ||
    !demoEmail ||
    !serviceRoleKey ||
    !supabaseUrl ||
    !anonKey
  ) {
    return NextResponse.redirect(`${origin}/?error=demo_unavailable`, { status: 303 })
  }

  // CSRF: this route swaps the caller's session cookie, so only accept form
  // posts that originate from our own pages. `Sec-Fetch-Site` is sent by all
  // modern browsers; fall back to an Origin/Referer host match for the rest.
  const secFetchSite = request.headers.get('sec-fetch-site')
  const sameSite =
    secFetchSite === 'same-origin' ||
    secFetchSite === 'same-site' ||
    (() => {
      const source = request.headers.get('origin') ?? request.headers.get('referer')
      if (!source) return false
      try {
        return new URL(source).host === new URL(request.url).host
      } catch {
        return false
      }
    })()
  if (!sameSite) {
    return NextResponse.redirect(`${origin}/?error=demo_unavailable`, { status: 303 })
  }

  const now = Date.now()
  if (now - lastCallAt < MIN_INTERVAL_MS) {
    return NextResponse.redirect(`${origin}/?error=demo_unavailable`, { status: 303 })
  }
  lastCallAt = now

  try {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: demoEmail,
    })
    const tokenHash = data?.properties?.hashed_token
    if (error || !tokenHash) throw error ?? new Error('no magic-link token returned')

    const cookieStore = await cookies()
    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    })

    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: 'magiclink',
      token_hash: tokenHash,
    })
    if (verifyError) throw verifyError

    return NextResponse.redirect(`${origin}/`, { status: 303 })
  } catch (e) {
    console.error('[demo login] failed:', e)
    return NextResponse.redirect(`${origin}/?error=demo_unavailable`, { status: 303 })
  }
}
