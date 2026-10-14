import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const TYPES: EmailOtpType[] = ['email', 'recovery', 'signup', 'email_change']

/**
 * Where the confirmation and password-reset emails land, on whichever site
 * sent the request (the link is built from the redirect URL the app passed).
 *
 * Sproutine's templates (supabase/templates) link here with a one-time token
 * hash, verified on the server, so the link works on any device. Supabase's
 * default templates instead come back with a PKCE `code`, which only the
 * browser that asked can exchange; that is handled too.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const isRecovery = type === 'recovery'

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  let ok = false
  if (tokenHash && type && TYPES.includes(type)) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error
  }

  if (ok) return NextResponse.redirect(`${origin}${isRecovery ? '/auth/reset' : '/'}`)
  return NextResponse.redirect(
    isRecovery ? `${origin}/auth/reset?error=expired` : `${origin}/?error=auth_failed`
  )
}
