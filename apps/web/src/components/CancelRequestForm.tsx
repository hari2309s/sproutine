'use client'

import { useState } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import { useLanguage } from '@/contexts/LanguageContext'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

type Kind = 'ordinary' | 'extraordinary'

/** Cancellation for visitors who aren't signed in (§ 312k BGB). */
export function CancelRequestForm({ mailto }: { mailto: string }) {
  const { t, locale } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [kind, setKind] = useState<Kind>('ordinary')
  const [reason, setReason] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(SITE_KEY ? null : 'none')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ receivedAt: string; emailed: boolean } | null>(null)

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString(locale === 'en' ? 'en-GB' : locale, {
      dateStyle: 'long',
      timeStyle: 'short',
    })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/cancel-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          kind,
          reason: reason.trim() || undefined,
          captchaToken: captchaToken === 'none' ? undefined : captchaToken,
        }),
      })
      if (res.status === 503) return setError(t.cancelPage.requestUnavailable)
      if (!res.ok) return setError(t.cancelPage.requestFailed)
      setDone((await res.json()) as { receivedAt: string; emailed: boolean })
    } catch {
      setError(t.cancelPage.requestFailed)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <p role="status" className="card p-4 text-[15px] leading-normal text-sproutine-text">
        {done.emailed
          ? t.cancelPage.requestDone(fmtTime(done.receivedAt), email)
          : t.cancelPage.requestNoEmail(fmtTime(done.receivedAt))}
      </p>
    )
  }

  const field =
    'h-12 w-full rounded-2xl border border-sproutine-border-strong bg-sproutine-card px-4 text-base text-sproutine-text'
  return (
    <form onSubmit={submit} className="card space-y-4 p-4">
      <h2 className="font-display text-xl text-sproutine-text">{t.cancelPage.formTitle}</h2>
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-sproutine-text">{t.cancelPage.name}</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          className={field}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-sproutine-text">{t.cancelPage.email}</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className={field}
        />
      </label>
      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-sm font-semibold text-sproutine-text">
          {t.cancelPage.kind}
        </legend>
        {(['ordinary', 'extraordinary'] as const).map((k) => (
          <label
            key={k}
            className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] text-sproutine-text"
          >
            <input
              type="radio"
              name="kind"
              checked={kind === k}
              onChange={() => setKind(k)}
              className="h-5 w-5 accent-[var(--t-accent)]"
            />
            {k === 'ordinary' ? t.cancelPage.ordinary : t.cancelPage.extraordinary}
          </label>
        ))}
      </fieldset>
      {kind === 'extraordinary' && (
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-sproutine-text">{t.cancelPage.reason}</span>
          <textarea
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-sproutine-border-strong bg-sproutine-card px-4 py-3 text-base text-sproutine-text"
          />
        </label>
      )}
      {SITE_KEY && (
        <Turnstile
          siteKey={SITE_KEY}
          onSuccess={setCaptchaToken}
          onExpire={() => setCaptchaToken(null)}
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-sproutine-accent">
          {error}{' '}
          <a href={mailto} className="font-semibold underline">
            {t.cancelPage.emailUs}
          </a>
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !captchaToken}
        className="btn-primary h-14 w-full text-[17px]"
      >
        {busy ? t.cancelPage.sending : t.cancelPage.confirm}
      </button>
    </form>
  )
}
