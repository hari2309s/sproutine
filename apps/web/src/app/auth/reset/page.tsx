'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { Wordmark } from '@/components/Brand'
import { Icon } from '@/components/Icon'
import { LoadingScreen } from '@/components/LoadingScreen'

const MIN_PASSWORD = 8

/**
 * Landing page for the "forgot password" email. /auth/callback has already
 * exchanged the link for a session; this sets the new password on it.
 */
function ResetPassword() {
  const { t } = useLanguage()
  const router = useRouter()
  const linkFailed = useSearchParams().get('error') === 'expired'
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session))
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < MIN_PASSWORD) return setError(t.auth.passwordTooShort)
    setSaving(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) {
      setError(
        error.message.toLowerCase().includes('different') ? error.message : t.auth.genericError
      )
      return
    }
    setSaved(true)
    setTimeout(() => router.replace('/'), 1200)
  }

  if (hasSession === null) return <LoadingScreen />

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-sproutine-bg">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 pt-6 pb-10">
        <Wordmark />
        <section className="card flex flex-col gap-3 p-5">
          <h1 className="font-display text-[26px] text-sproutine-text">{t.auth.resetTitle}</h1>
          {linkFailed || !hasSession ? (
            <>
              <p role="alert" className="text-[15px] text-sproutine-text-secondary">
                {t.auth.resetExpired}
              </p>
              <button type="button" onClick={() => router.replace('/')} className="btn-primary">
                {t.auth.backToSignIn}
              </button>
            </>
          ) : saved ? (
            <p role="status" className="flex items-center gap-2 text-[15px] text-sproutine-text">
              <Icon name="check_circle" size={20} className="text-sproutine-accent" />
              {t.auth.passwordSaved}
            </p>
          ) : (
            <form onSubmit={submit} noValidate className="flex flex-col gap-3">
              <p className="text-[15px] text-sproutine-text-secondary">{t.auth.resetIntro}</p>
              <div className="relative">
                <label htmlFor="new-password" className="sr-only">
                  {t.auth.newPasswordLabel}
                </label>
                <input
                  id="new-password"
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError(null)
                  }}
                  placeholder={t.auth.passwordPlaceholderNew}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD}
                  className="field w-full bg-sproutine-bg pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? t.auth.hidePassword : t.auth.showPassword}
                  aria-pressed={show}
                  className="icon-btn absolute top-1/2 right-1 h-10 w-10 -translate-y-1/2"
                >
                  <Icon name={show ? 'visibility_off' : 'visibility'} size={20} />
                </button>
              </div>
              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-1.5 text-sm font-medium text-sproutine-red"
                >
                  <Icon name="error" size={18} className="mt-px" />
                  {error}
                </p>
              )}
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? t.auth.working : t.auth.savePassword}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPassword />
    </Suspense>
  )
}
