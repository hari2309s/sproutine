'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { usePostHog } from 'posthog-js/react'
import { PageEnter } from './PageMotion'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { LOCALE_LABELS, type Locale } from '@/lib/i18n'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

export function AuthPage({ error: initialError = null }: { error?: string | null }) {
  const { t, locale, setLocale } = useLanguage()
  const posthog = usePostHog()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
  // When no site key is configured (CI / local dev), bypass captcha requirement
  const [captchaToken, setCaptchaToken] = useState<string | null>(SITE_KEY ? null : 'bypass')
  const turnstileRef = useRef<TurnstileInstance>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError(t.auth.invalidEmail)
      return
    }
    if (!captchaToken) return
    setIsLoading(true)
    setError(null)

    posthog.capture('auth_magic_link_requested')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        captchaToken,
      },
    })

    turnstileRef.current?.reset()
    setCaptchaToken(null)

    if (error) {
      posthog.capture('auth_magic_link_failed', { error: error.message })
      setError(error.message)
    } else {
      posthog.capture('auth_magic_link_sent')
      setSent(true)
    }
    setIsLoading(false)
  }

  const LOCALE_CYCLE: Locale[] = ['en']
  const currentIdx = LOCALE_CYCLE.indexOf(locale)
  const nextLocale = LOCALE_CYCLE[
    (currentIdx === -1 ? 0 : currentIdx + 1) % LOCALE_CYCLE.length
  ] as Locale
  const next = LOCALE_LABELS[nextLocale]

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 bg-truffle-bg">
      {/* Language toggle */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setLocale(nextLocale)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-truffle-muted hover:text-truffle-text bg-truffle-surface border border-truffle-border transition-colors"
        >
          <span>{next.flag}</span>
          <span>{next.label}</span>
        </button>
      </div>

      <PageEnter className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mb-4">
            <Image
              src="/icons/truffle.png"
              alt="Truffle"
              width={96}
              height={96}
              priority
              className="mx-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-truffle-text">Truffle</h1>
          <p className="text-truffle-text-secondary mt-2">{t.auth.tagline}</p>
        </div>

        {sent ? (
          <div className="card text-center space-y-3">
            <div className="text-4xl">📬</div>
            <h2 className="font-semibold text-truffle-text">{t.auth.checkEmail}</h2>
            <p className="text-sm text-truffle-text-secondary">{t.auth.magicLinkSent(email)}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder={t.auth.emailPlaceholder}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError(null)
                }}
                autoComplete="email"
                spellCheck={false}
                className="w-full bg-truffle-surface border border-truffle-border rounded-xl px-4 py-4 text-truffle-text placeholder-truffle-muted focus:outline-none focus:border-truffle-amber text-center"
                required
              />
            </div>

            {SITE_KEY && (
              <Turnstile
                ref={turnstileRef}
                siteKey={SITE_KEY}
                onSuccess={setCaptchaToken}
                onExpire={() => setCaptchaToken(null)}
                options={{ theme: 'dark', size: 'invisible' }}
              />
            )}

            {error && <p className="text-sm text-truffle-red text-center">{error}</p>}

            <button
              type="submit"
              disabled={isLoading || !captchaToken}
              className="btn-primary w-full py-4 disabled:opacity-50"
            >
              {isLoading ? t.auth.sending : t.auth.continueWithEmail}
            </button>
          </form>
        )}

        {!sent && process.env.NEXT_PUBLIC_DEMO_ENABLED === '1' && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-truffle-border" />
              <span className="text-xs text-truffle-muted">{t.auth.demoHint}</span>
              <span className="h-px flex-1 bg-truffle-border" />
            </div>
            <form action="/api/auth/demo" method="post">
              <button
                type="submit"
                className="btn-ghost w-full py-3 text-sm"
                onClick={() =>
                  posthog.capture('demo_link_clicked', undefined, { transport: 'sendBeacon' })
                }
              >
                {t.auth.demoButton}
              </button>
            </form>
          </div>
        )}

        <p className="text-xs text-truffle-muted text-center">{t.auth.footer}</p>
      </PageEnter>
    </div>
  )
}
