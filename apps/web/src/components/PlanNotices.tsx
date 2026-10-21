'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { useEntitlement, useRefreshEntitlement } from '@/hooks/useEntitlement'
import { daysUntil } from '@/lib/billingApi'
import { Icon } from './Icon'
import { ProGateSheet } from './ProGateSheet'
import { ProPill } from './ProPill'

const BANNER_HIDDEN_UNTIL = 'sproutine-trial-banner-hidden-until'
const ENDED_SEEN = 'sproutine-trial-ended-seen'
const BANNER_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000
const LAST_DAYS = 3

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage blocked: the notice just shows again next visit.
  }
}

/** Trial banner, the one-time "trial ended" card and the post-checkout welcome, for Today. */
export function PlanNotices() {
  const { t } = useLanguage()
  const { entitlement } = useEntitlement()
  const refresh = useRefreshEntitlement()
  const [gate, setGate] = useState(false)
  const [hidden, setHidden] = useState(true)
  const [endedSeen, setEndedSeen] = useState(true)
  const [showFree, setShowFree] = useState(false)
  const [welcome, setWelcome] = useState(false)

  useEffect(() => {
    // Local storage and the URL only exist in the browser.
    /* eslint-disable react-hooks/set-state-in-effect */
    setHidden(Number(read(BANNER_HIDDEN_UNTIL) ?? 0) > Date.now())
    setEndedSeen(read(ENDED_SEEN) === '1')
    const url = new URL(window.location.href)
    if (url.searchParams.get('billing') === 'success') {
      setWelcome(true)
      url.searchParams.delete('billing')
      window.history.replaceState(null, '', url)
      // The webhook may land a moment after the redirect.
      void refresh()
      const id = setTimeout(() => void refresh(), 3000)
      return () => clearTimeout(id)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [refresh])

  if (!entitlement) return null
  const days = daysUntil(entitlement.trialEndsAt)
  const trialEnded =
    entitlement.plan === 'free' && !entitlement.status && !!entitlement.trialEndsAt && days === 0

  return (
    <>
      {welcome && entitlement.plan === 'pro' && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl bg-sproutine-accent-soft px-4 py-3 text-[15px] text-sproutine-text"
        >
          <ProPill />
          {t.plans.welcome}
        </p>
      )}

      {entitlement.plan === 'trial' && !hidden && (
        <div className="flex flex-col gap-1 rounded-[22px] bg-sproutine-surface py-1 pr-1 pl-3">
          <div className="flex min-h-11 items-center gap-2.5">
            <ProPill />
            <span className="flex-1 text-sm font-semibold text-sproutine-text">
              {t.plans.trialLeft(days)}
            </span>
            {days > LAST_DAYS && (
              <button
                type="button"
                onClick={() => setGate(true)}
                className="h-11 px-2 text-sm font-semibold text-sproutine-accent"
              >
                {t.plans.seePlans}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                write(BANNER_HIDDEN_UNTIL, String(Date.now() + BANNER_SNOOZE_MS))
                setHidden(true)
              }}
              aria-label={t.plans.dismiss}
              className="icon-btn h-11 w-11"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
          {days <= LAST_DAYS && (
            <div className="flex flex-col gap-1 pr-3 pb-1">
              <p className="text-[13px] leading-normal text-sproutine-text-secondary">
                {showFree ? t.plans.endedDetail : t.plans.trialEndingNote}
              </p>
              <div className="-ml-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => setGate(true)}
                  className="h-11 px-2.5 text-sm font-semibold text-sproutine-accent"
                >
                  {t.plans.keepPro}
                </button>
                {!showFree && (
                  <button
                    type="button"
                    onClick={() => setShowFree(true)}
                    className="h-11 px-2.5 text-sm font-semibold text-sproutine-text-secondary"
                  >
                    {t.plans.whatStaysFree}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {trialEnded && !endedSeen && (
        <section className="card flex flex-col gap-3 p-4">
          <div className="flex items-center gap-1.5">
            <Image
              src="/icons/sproutine.png"
              alt=""
              width={64}
              height={64}
              className="-my-2 -ml-2"
            />
            <h2 className="font-display text-xl leading-tight text-sproutine-text">
              {t.plans.endedTitle}
            </h2>
          </div>
          <p className="text-[15px] leading-normal text-sproutine-text">{t.plans.endedBody}</p>
          <p className="text-sm leading-normal text-sproutine-text-secondary">
            {t.plans.endedDetail}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                write(ENDED_SEEN, '1')
                setEndedSeen(true)
              }}
              className="btn-secondary h-12 flex-1 px-3 text-[15px] whitespace-nowrap"
            >
              {t.plans.continueFree}
            </button>
            <button
              type="button"
              onClick={() => setGate(true)}
              className="btn-primary h-12 flex-1 px-3 text-[15px] whitespace-nowrap"
            >
              {t.plans.keepPro}
            </button>
          </div>
        </section>
      )}

      <AnimatePresence>
        {gate && <ProGateSheet source="banner" onClose={() => setGate(false)} />}
      </AnimatePresence>
    </>
  )
}
