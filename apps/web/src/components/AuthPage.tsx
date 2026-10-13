'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { usePostHog } from 'posthog-js/react'
import { usePrefersReducedMotion } from './PageMotion'
import { RosieAvatar, Wordmark } from './Brand'
import { Icon } from './Icon'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { sproutineEase } from '@/lib/motion'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

// Sign-in is a short conversation with Rosie: one magic-link flow covers both
// sign-up and sign-in, so there is no mode switch to explain.
export function AuthPage({ error: initialError = null }: { error?: string | null }) {
  const { t } = useLanguage()
  const posthog = usePostHog()
  const reducedMotion = usePrefersReducedMotion()
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
  // When no site key is configured (CI / local dev), bypass captcha requirement
  const [captchaToken, setCaptchaToken] = useState<string | null>(SITE_KEY ? null : 'bypass')
  const turnstileRef = useRef<TurnstileInstance>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const address = email.trim()
    if (!/\S+@\S+\.\S+/.test(address)) {
      setError(t.auth.invalidEmail)
      return
    }
    if (!captchaToken) return
    setIsLoading(true)
    setError(null)

    posthog.capture('auth_magic_link_requested')

    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        captchaToken,
      },
    })

    turnstileRef.current?.reset()
    setCaptchaToken(SITE_KEY ? null : 'bypass')

    if (error) {
      posthog.capture('auth_magic_link_failed', { error: error.message })
      setError(error.message)
    } else {
      posthog.capture('auth_magic_link_sent')
      setSentTo(address)
    }
    setIsLoading(false)
  }

  const bubble = (delay: number) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.35, ease: sproutineEase, delay },
        }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-sproutine-bg">
      <div className="mx-auto grid min-h-full w-full max-w-6xl content-center gap-3.5 px-5 pt-4 pb-8 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-x-[72px] lg:px-[88px] lg:py-14">
        {/* ── Brand ── */}
        <section className="flex flex-col gap-3.5 lg:gap-7">
          <Wordmark tileClass="h-9 w-9 lg:h-11 lg:w-11" textClass="text-[22px] lg:text-[26px]" />

          <div className="-mt-1.5 -mb-3.5 flex justify-center lg:hidden">
            <Image
              src="/icons/sproutine.png"
              alt="A plate of Brussels sprouts"
              width={190}
              height={190}
              priority
            />
          </div>

          <h1 className="text-center font-display text-[34px] leading-[1.08] tracking-[-0.01em] text-balance text-sproutine-text lg:max-w-[600px] lg:text-left lg:text-[66px] lg:leading-[1.02]">
            {t.auth.tagline}
          </h1>
          <p className="hidden max-w-[520px] text-[19px] leading-[1.55] text-pretty text-sproutine-text-secondary lg:block">
            {t.auth.intro}
          </p>
          <Image
            src="/icons/sproutine.png"
            alt="A plate of Brussels sprouts"
            width={260}
            height={260}
            priority
            className="-mt-7 -mb-10 -ml-6 hidden motion-safe:animate-float lg:block"
          />
        </section>

        {/* ── Conversation with Rosie ── */}
        <section
          aria-label={t.auth.continueWithEmail}
          className="card mt-1.5 flex w-full flex-col gap-2.5 p-4 lg:mt-0 lg:gap-3 lg:self-center lg:p-6"
        >
          <header className="flex items-center gap-2.5 pb-1">
            <RosieAvatar size={36} />
            <span className="flex flex-col leading-tight">
              <span className="text-[15px] font-semibold text-sproutine-text lg:text-base">
                {t.auth.rosieName}
              </span>
              <span className="text-[13px] text-sproutine-muted lg:text-sm">
                {t.auth.rosieRole}
              </span>
            </span>
          </header>

          <div className="flex flex-col gap-2.5" aria-live="polite">
            <RosieBubble {...bubble(0.1)}>{t.auth.greeting}</RosieBubble>
            <RosieBubble {...bubble(0.35)}>{t.auth.ask}</RosieBubble>

            <AnimatePresence initial={false}>
              {sentTo && (
                <motion.div key="sent" className="flex flex-col gap-2.5" {...bubble(0)}>
                  <p className="max-w-[85%] self-end rounded-[20px] rounded-br-md bg-sproutine-accent px-3.5 py-2.5 text-[15px] font-medium break-all text-sproutine-bg">
                    {sentTo}
                  </p>
                  <RosieBubble>
                    <span className="block font-semibold">{t.auth.checkEmail}</span>
                    <span className="mt-1 block">{t.auth.magicLinkSent(sentTo)}</span>
                  </RosieBubble>
                  <button
                    type="button"
                    onClick={() => {
                      setSentTo(null)
                      setError(null)
                    }}
                    className="btn-ghost h-11 self-start px-3 text-sm"
                  >
                    <Icon name="mail" size={18} />
                    {t.auth.differentEmail}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!sentTo && (
            <form onSubmit={handleSubmit} noValidate className="mt-1 flex flex-col gap-2.5">
              <label htmlFor="auth-email" className="sr-only">
                {t.auth.emailLabel}
              </label>
              <input
                id="auth-email"
                type="email"
                inputMode="email"
                placeholder={t.auth.emailPlaceholder}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError(null)
                }}
                autoComplete="email"
                spellCheck={false}
                aria-invalid={!!error}
                aria-describedby={error ? 'auth-error' : undefined}
                className={`field bg-sproutine-bg ${error ? 'border-2 border-sproutine-red px-[15px]' : ''}`}
                required
              />

              {SITE_KEY && (
                <Turnstile
                  ref={turnstileRef}
                  siteKey={SITE_KEY}
                  onSuccess={setCaptchaToken}
                  onExpire={() => setCaptchaToken(null)}
                  options={{ theme: 'auto', size: 'invisible' }}
                />
              )}

              {error && (
                <p
                  id="auth-error"
                  role="alert"
                  className="flex items-start gap-1.5 text-sm font-medium text-sproutine-red"
                >
                  <Icon name="error" size={18} className="mt-px" />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading || !captchaToken}
                className="btn-primary w-full"
              >
                {isLoading && (
                  <span className="h-[18px] w-[18px] animate-spin rounded-full border-[2.5px] border-sproutine-bg border-r-transparent" />
                )}
                {isLoading ? t.auth.sending : t.auth.continueWithEmail}
              </button>

              <p className="text-center text-[13px] text-sproutine-muted lg:text-sm">
                {t.auth.footer}
              </p>
            </form>
          )}

          {!sentTo && process.env.NEXT_PUBLIC_DEMO_ENABLED === '1' && (
            <form action="/api/auth/demo" method="post" className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-sproutine-border" />
                <span className="text-xs text-sproutine-muted">{t.auth.demoHint}</span>
                <span className="h-px flex-1 bg-sproutine-border" />
              </div>
              <button
                type="submit"
                className="btn-secondary w-full"
                onClick={() =>
                  posthog.capture('demo_link_clicked', undefined, { transport: 'sendBeacon' })
                }
              >
                {t.auth.demoButton}
              </button>
            </form>
          )}
        </section>

        <p className="pt-2 text-center text-xs text-sproutine-muted lg:col-span-2">
          {t.auth.disclaimer}
        </p>
      </div>
    </div>
  )
}

function RosieBubble({
  children,
  ...motionProps
}: { children: React.ReactNode } & React.ComponentProps<typeof motion.p>) {
  return (
    <motion.p
      className="max-w-[88%] self-start rounded-[20px] rounded-bl-md bg-sproutine-surface px-3.5 py-2.5 text-[15px] leading-[1.45] text-sproutine-text lg:px-4 lg:py-3 lg:text-base"
      {...motionProps}
    >
      {children}
    </motion.p>
  )
}
