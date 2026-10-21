'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { useEntitlement } from '@/hooks/useEntitlement'
import { openBillingPortal, PRICE_LABELS } from '@/lib/billingApi'
import { Icon } from './Icon'
import { ProGateSheet } from './ProGateSheet'
import { ProPill } from './ProPill'

export function SubscriptionSection() {
  const { t, locale } = useLanguage()
  const { entitlement } = useEntitlement()
  const [gate, setGate] = useState(false)
  const [opening, setOpening] = useState(false)
  const [failed, setFailed] = useState(false)

  if (!entitlement) {
    return <div className="h-28 animate-pulse rounded-[22px] bg-sproutine-surface" aria-hidden />
  }

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(locale === 'en' ? 'en-GB' : locale, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : ''
  const { plan, interval, currentPeriodEnd, cancelAtPeriodEnd, status, hasCustomer } = entitlement
  const periodEnd = fmt(currentPeriodEnd)

  const manage = async () => {
    setOpening(true)
    setFailed(false)
    try {
      await openBillingPortal()
    } catch {
      setFailed(true)
      setOpening(false)
    }
  }

  return (
    <section className="space-y-2.5">
      <h3 className="eyebrow">{t.plans.subscription}</h3>
      <div className="card divide-y divide-sproutine-border p-0 shadow-none">
        <div className="flex flex-col gap-1.5 p-4">
          <span className="flex items-center gap-2">
            <span className="font-display text-[22px] text-sproutine-text">
              {plan === 'pro'
                ? t.plans.proName
                : plan === 'trial'
                  ? t.plans.trialName
                  : t.plans.freeName}
            </span>
            {plan !== 'free' && <ProPill />}
          </span>
          {plan === 'pro' && interval && (
            <span className="text-sm text-sproutine-text-secondary">
              {t.plans.intervalLabel[interval]} ·{' '}
              {interval === 'year' ? PRICE_LABELS.year : PRICE_LABELS.month}
            </span>
          )}
          {plan === 'pro' && periodEnd && (
            <span className="flex items-center gap-1.5 text-sm text-sproutine-text">
              <Icon name="event_repeat" size={18} className="text-sproutine-green" />
              {cancelAtPeriodEnd ? t.plans.endsOn(periodEnd) : t.plans.renewsOn(periodEnd)}
            </span>
          )}
          {status === 'past_due' && (
            <p role="alert" className="text-sm text-sproutine-accent">
              {t.plans.paymentIssue}
            </p>
          )}
          {plan === 'trial' && (
            <span className="text-sm leading-normal text-sproutine-text-secondary">
              {t.plans.trialBlurb(fmt(entitlement.trialEndsAt))}
            </span>
          )}
          {plan === 'free' && (
            <span className="text-sm leading-normal text-sproutine-text-secondary">
              {t.plans.freeBlurb}
            </span>
          )}
          {plan !== 'pro' && (
            <button
              type="button"
              onClick={() => setGate(true)}
              className="mt-1.5 flex h-11 items-center gap-1.5 self-start rounded-full border-[1.5px] border-sproutine-border-strong pr-4 pl-3 text-[15px] font-semibold text-sproutine-text"
            >
              <Icon name="auto_awesome" size={18} filled className="text-sproutine-accent" />
              {t.plans.seeWhatProAdds}
            </button>
          )}
        </div>
        {hasCustomer && (
          <button
            type="button"
            onClick={manage}
            disabled={opening}
            className="flex min-h-16 w-full items-center gap-3 py-2 pr-3 pl-4 text-left"
          >
            <Icon name="credit_card" size={22} className="text-sproutine-text-secondary" />
            <span className="flex flex-1 flex-col leading-[1.3]">
              <span className="text-[15px] font-semibold text-sproutine-text">
                {opening ? t.plans.opening : t.plans.manage}
              </span>
              <span className="text-[13px] text-sproutine-text-secondary">
                {t.plans.manageHint}
              </span>
            </span>
            <Icon name="open_in_new" size={20} className="text-sproutine-muted" />
          </button>
        )}
      </div>
      {failed && (
        <p role="alert" className="text-sm text-sproutine-accent">
          {t.plans.checkoutFailed}
        </p>
      )}
      <p className="text-[13px] leading-normal text-sproutine-text-secondary">
        {plan === 'pro' && periodEnd ? t.plans.proNote(periodEnd) : t.plans.freeNote}
      </p>
      <AnimatePresence>
        {gate && <ProGateSheet source="settings" onClose={() => setGate(false)} />}
      </AnimatePresence>
    </section>
  )
}
