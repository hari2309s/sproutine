'use client'

import { useState } from 'react'
import { usePostHog } from 'posthog-js/react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useEntitlement, useRefreshEntitlement } from '@/hooks/useEntitlement'

// Statuses Stripe can still bill or resume; the cancel route handles all of them.
const LIVE = new Set(['active', 'trialing', 'past_due', 'incomplete', 'unpaid', 'paused'])

interface Done {
  endsAt: string | null
  cancelledAt: string
  emailed: boolean
}

export function CancelSignedIn() {
  const { t, locale } = useLanguage()
  const { entitlement } = useEntitlement()
  const refresh = useRefreshEntitlement()
  const posthog = usePostHog()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [done, setDone] = useState<Done | null>(null)
  const [nothing, setNothing] = useState(false)

  const lc = locale === 'en' ? 'en-GB' : locale
  const fmtDay = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(lc, { day: 'numeric', month: 'long', year: 'numeric' })
      : ''
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString(lc, { dateStyle: 'long', timeStyle: 'short' })

  const cancel = async () => {
    setBusy(true)
    setFailed(false)
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' })
      if (res.status === 404) return setNothing(true)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setDone((await res.json()) as Done)
      posthog?.capture('subscription_cancelled', { source: 'cancel_page' })
      void refresh()
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  if (!entitlement) {
    return <div className="h-32 animate-pulse rounded-[22px] bg-sproutine-surface" aria-hidden />
  }

  if (done) {
    return (
      <div role="status" className="card space-y-2 p-4">
        <p className="text-[15px] leading-normal text-sproutine-text">
          {done.endsAt ? t.cancelPage.done(fmtDay(done.endsAt)) : t.cancelPage.doneNoDate}
        </p>
        <p className="text-sm text-sproutine-text-secondary">
          {done.emailed ? t.cancelPage.emailed : t.cancelPage.notEmailed(fmtTime(done.cancelledAt))}
        </p>
        <p className="text-sm text-sproutine-text-secondary">{t.cancelPage.doneUndo}</p>
      </div>
    )
  }

  const live = entitlement.hasCustomer && !!entitlement.status && LIVE.has(entitlement.status)
  if (nothing || !live) {
    return <p className="card p-4 text-[15px] text-sproutine-text">{t.cancelPage.nothing}</p>
  }

  const end = fmtDay(entitlement.currentPeriodEnd)
  if (entitlement.cancelAtPeriodEnd) {
    return (
      <p className="card p-4 text-[15px] text-sproutine-text">
        {t.cancelPage.alreadyCancelled(end)}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-2 p-4">
        {end && (
          <p className="text-[15px] font-semibold text-sproutine-text">
            {t.cancelPage.plan(t.plans.intervalLabel[entitlement.interval ?? 'month'], end)}
          </p>
        )}
        <p className="text-sm leading-normal text-sproutine-text-secondary">
          {t.cancelPage.whatHappens}
        </p>
      </div>
      {failed && (
        <p role="alert" className="text-sm text-sproutine-accent">
          {t.cancelPage.failed}
        </p>
      )}
      <button
        type="button"
        onClick={cancel}
        disabled={busy}
        className="btn-primary h-14 w-full text-[17px]"
      >
        {busy ? t.cancelPage.cancelling : t.cancelPage.confirm}
      </button>
    </div>
  )
}
