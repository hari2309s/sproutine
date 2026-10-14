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

const MIN_PASSWORD = 8

type Mode = 'signUp' | 'signIn' | 'reset'

// Sign-in is a short conversation with Rosie: create an account with a name,
// email and password, or sign in. Only "forgot password" sends an email, so
// everyday sign-in never waits on (or runs into limits of) email delivery.
export function AuthPage({ error: initialError = null }: { error?: string | null }) {
  const { t } = useLanguage()
  const posthog = usePostHog()
  const reducedMotion = usePrefersReducedMotion()
  const [mode, setMode] = useState<Mode>('signUp')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // An email-based next step (confirm sign-up, reset password) replaces the form.
  const [notice, setNotice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
  // Which field the error is about, so only that one is marked invalid.
  const [errorField, setErrorField] = useState<'name' | 'email' | 'password' | null>(null)
  const fail = (message: string, field: typeof errorField = null) => {
    setError(message)
    setErrorField(field)
  }
  const fieldProps = (field: NonNullable<typeof errorField>) => ({
    'aria-invalid': errorField === field,
    'aria-describedby': errorField === field ? 'auth-error' : undefined,
  })
  // When no site key is configured (CI / local dev), bypass captcha requirement
  const [captchaToken, setCaptchaToken] = useState<string | null>(SITE_KEY ? null : 'bypass')
  const turnstileRef = useRef<TurnstileInstance>(null)

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setErrorField(null)
    setNotice(null)
  }

  /** Supabase error → something Rosie would say. */
  const friendly = (message: string, status?: number): string => {
    const m = message.toLowerCase()
    if (status === 429 || m.includes('rate limit') || m.includes('too many'))
      return t.auth.rateLimited
    if (m.includes('invalid login credentials')) return t.auth.invalidCredentials
    if (m.includes('email not confirmed')) return t.auth.emailNotConfirmed
    if (m.includes('already registered') || m.includes('already been registered'))
      return t.auth.alreadyRegistered
    if (m.includes('password') && (m.includes('least') || m.includes('short')))
      return t.auth.passwordTooShort
    return t.auth.genericError
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const address = email.trim()
    if (mode === 'signUp' && !name.trim()) return fail(t.auth.nameRequired, 'name')
    if (!/\S+@\S+\.\S+/.test(address)) return fail(t.auth.invalidEmail, 'email')
    if (mode !== 'reset' && password.length < MIN_PASSWORD) {
      return mode === 'signUp'
        ? fail(t.auth.passwordTooShort, 'password')
        : fail(t.auth.invalidCredentials)
    }
    if (!captchaToken) return
    setIsLoading(true)
    fail('', null)

    // Email links come back to the site the request came from (localhost or
    // the deployed app), as long as it's in Supabase's redirect allow-list.
    const confirmUrl = `${window.location.origin}/auth/confirm`
    let failure: { message: string; status?: number } | null = null

    if (mode === 'signUp') {
      posthog.capture('auth_sign_up_requested')
      const { data, error } = await supabase.auth.signUp({
        email: address,
        password,
        options: {
          data: { display_name: name.trim().slice(0, 60) },
          emailRedirectTo: confirmUrl,
          captchaToken,
        },
      })
      if (error) failure = error
      // No session means the project asks for email confirmation first. A
      // known address gets the same answer (Supabase returns it with no
      // identities), so sign-up never reveals who has an account.
      else if (!data.session) setNotice(t.auth.confirmEmailSent(address))
      // Otherwise onAuthStateChange in HomeClient takes over (→ onboarding).
    } else if (mode === 'signIn') {
      posthog.capture('auth_sign_in_requested')
      const { error } = await supabase.auth.signInWithPassword({
        email: address,
        password,
        options: { captchaToken },
      })
      if (error) failure = error
    } else {
      posthog.capture('auth_reset_requested')
      const { error } = await supabase.auth.resetPasswordForEmail(address, {
        redirectTo: confirmUrl,
        captchaToken,
      })
      if (error) failure = error
      else setNotice(t.auth.resetSent(address))
    }

    turnstileRef.current?.reset()
    setCaptchaToken(SITE_KEY ? null : 'bypass')
    if (failure) {
      posthog.capture('auth_failed', { mode, error: failure.message })
      fail(friendly(failure.message, failure.status))
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
          aria-label={t.auth.rosieName}
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

          {mode !== 'reset' && (
            <div
              role="group"
              aria-label={t.auth.modeLabel}
              className="flex gap-1 rounded-full bg-sproutine-surface p-1"
            >
              {(['signUp', 'signIn'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => switchMode(m)}
                  className={`h-10 flex-1 rounded-full text-sm ${
                    mode === m
                      ? 'bg-sproutine-card font-semibold text-sproutine-text shadow-soft'
                      : 'font-medium text-sproutine-text-secondary hover:text-sproutine-text'
                  }`}
                >
                  {m === 'signUp' ? t.auth.modeSignUp : t.auth.modeSignIn}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2.5" aria-live="polite">
            <RosieBubble {...bubble(0.1)}>{t.auth.greeting}</RosieBubble>
            <AnimatePresence mode="wait" initial={false}>
              <RosieBubble key={notice ?? mode} {...bubble(0)}>
                {notice ??
                  (mode === 'signUp'
                    ? t.auth.askSignUp
                    : mode === 'signIn'
                      ? t.auth.askSignIn
                      : t.auth.resetAsk)}
              </RosieBubble>
            </AnimatePresence>
          </div>

          {notice ? (
            <button
              type="button"
              onClick={() => switchMode('signIn')}
              className="btn-ghost h-11 self-start px-3 text-sm"
            >
              {t.auth.backToSignIn}
            </button>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="mt-1 flex flex-col gap-2.5">
              {mode === 'signUp' && (
                <>
                  <label htmlFor="auth-name" className="sr-only">
                    {t.auth.nameLabel}
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    placeholder={t.auth.namePlaceholder}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (error) fail('', null)
                    }}
                    autoComplete="given-name"
                    maxLength={60}
                    {...fieldProps('name')}
                    className="field bg-sproutine-bg"
                    required
                  />
                </>
              )}

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
                  if (error) fail('', null)
                }}
                autoComplete={mode === 'signUp' ? 'email' : 'username'}
                spellCheck={false}
                {...fieldProps('email')}
                className="field bg-sproutine-bg"
                required
              />

              {mode !== 'reset' && (
                <div className="relative">
                  <label htmlFor="auth-password" className="sr-only">
                    {t.auth.passwordLabel}
                  </label>
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={
                      mode === 'signUp' ? t.auth.passwordPlaceholderNew : t.auth.passwordPlaceholder
                    }
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (error) fail('', null)
                    }}
                    autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                    minLength={mode === 'signUp' ? MIN_PASSWORD : undefined}
                    {...fieldProps('password')}
                    className="field w-full bg-sproutine-bg pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                    aria-pressed={showPassword}
                    className="icon-btn absolute top-1/2 right-1 h-10 w-10 -translate-y-1/2"
                  >
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                  </button>
                </div>
              )}

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
                {isLoading
                  ? t.auth.working
                  : mode === 'signUp'
                    ? t.auth.createAccount
                    : mode === 'signIn'
                      ? t.auth.signIn
                      : t.auth.sendResetLink}
              </button>

              {mode === 'signIn' && (
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="self-center text-sm font-semibold text-sproutine-accent"
                >
                  {t.auth.forgotPassword}
                </button>
              )}
              {mode === 'reset' && (
                <button
                  type="button"
                  onClick={() => switchMode('signIn')}
                  className="self-center text-sm font-semibold text-sproutine-accent"
                >
                  {t.auth.backToSignIn}
                </button>
              )}
            </form>
          )}

          {!notice && mode !== 'reset' && process.env.NEXT_PUBLIC_DEMO_ENABLED === '1' && (
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
