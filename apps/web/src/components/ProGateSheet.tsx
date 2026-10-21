'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePostHog } from 'posthog-js/react'
import { useLanguage } from '@/contexts/LanguageContext'
import { PRICE_LABELS, startCheckout, type BillingInterval } from '@/lib/billingApi'
import { BottomSheet } from './BottomSheet'
import { Icon, type IconName } from './Icon'
import { ProPill } from './ProPill'

const BENEFIT_ICONS: IconName[] = ['chat_bubble', 'mic', 'photo_camera']

export type GateSource = 'chat' | 'voice' | 'photo' | 'banner' | 'settings' | 'planner'

interface ProGateSheetProps {
  source: GateSource
  onClose: () => void
}

/** The single, calm Pro sheet: why it's paid, what it adds, a plan toggle, and a free way out. */
export function ProGateSheet({ source, onClose }: ProGateSheetProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const posthog = usePostHog()
  const [billing, setBilling] = useState<BillingInterval>('year')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    posthog?.capture('paywall_viewed', { source })
  }, [posthog, source])

  const checkout = async () => {
    setBusy(true)
    setFailed(false)
    posthog?.capture('checkout_started', { source, interval: billing })
    try {
      await startCheckout(billing)
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  // Portalled: it can open from inside other sheets, whose transforms would clip it.
  return createPortal(
    <BottomSheet title={t.plans.gateTitle} onClose={onClose}>
      <div className="flex flex-col items-center gap-3.5 text-center">
        <Image src="/icons/sproutine.png" alt="" width={88} height={88} className="-mb-1" />
        <ProPill />
        <p className="max-w-[320px] text-[15px] leading-[1.55] text-sproutine-text-secondary">
          {t.plans.gateBody}
        </p>

        <ul className="card w-full divide-y divide-sproutine-border p-0 text-left shadow-none">
          {t.plans.benefits.map(([title, body], i) => (
            <li key={title} className="flex min-h-16 items-center gap-3 px-3.5 py-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sproutine-accent-soft text-sproutine-accent">
                <Icon name={BENEFIT_ICONS[i]!} size={20} />
              </span>
              <span className="flex flex-col leading-[1.35]">
                <span className="text-[15px] font-semibold text-sproutine-text">{title}</span>
                <span className="text-[13px] text-sproutine-text-secondary">{body}</span>
              </span>
            </li>
          ))}
        </ul>

        <div
          role="radiogroup"
          aria-label={t.plans.subscription}
          className="flex gap-1 rounded-full bg-sproutine-surface p-1"
        >
          {(['month', 'year'] as const).map((iv) => {
            const on = billing === iv
            return (
              <button
                key={iv}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setBilling(iv)}
                className={`flex min-h-11 items-center gap-2 rounded-full text-[15px] ${
                  iv === 'year' ? 'pr-2 pl-[18px]' : 'px-[18px]'
                } ${on ? 'bg-sproutine-card font-semibold text-sproutine-text shadow-soft' : 'font-medium text-sproutine-text-secondary'}`}
              >
                {iv === 'year' ? t.plans.yearly : t.plans.monthly}
                {iv === 'year' && (
                  <span className="flex h-6 items-center rounded-full bg-sproutine-green-light px-[9px] text-xs font-bold text-sproutine-green">
                    {t.plans.save(PRICE_LABELS.yearlySaving)}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <span className="-mt-1 flex flex-col gap-0.5" aria-live="polite">
          <span className="text-base font-semibold text-sproutine-text">
            {billing === 'year'
              ? t.plans.perYear(PRICE_LABELS.year)
              : t.plans.perMonth(PRICE_LABELS.month)}
          </span>
          <span className="text-[13px] text-sproutine-text-secondary">
            {billing === 'year'
              ? t.plans.yearlyNote(PRICE_LABELS.yearPerMonth)
              : t.plans.monthlyNote}
          </span>
        </span>

        {failed && (
          <p role="alert" className="text-sm text-sproutine-accent">
            {t.plans.checkoutFailed}
          </p>
        )}

        <button
          type="button"
          onClick={checkout}
          disabled={busy}
          className="btn-primary h-14 w-full text-[17px]"
        >
          {busy ? t.plans.starting : t.plans.startPro}
        </button>
        <button
          type="button"
          onClick={() => {
            onClose()
            router.push('/?search=1')
          }}
          className="btn-ghost -mt-1.5 h-11"
        >
          <Icon name="search" size={20} />
          {t.plans.searchInstead}
        </button>
        <p className="text-xs leading-normal text-sproutine-muted">{t.plans.supportLine}</p>
      </div>
    </BottomSheet>,
    document.body
  )
}
