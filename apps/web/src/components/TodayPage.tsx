'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  MEAL_SLOTS,
  mealSlotAt,
  PLAN_SLOTS,
  RECIPES_BY_ID,
  weekStartOf,
  type MealPlan,
  type FoodRecord,
  type MealLogProposal,
  type MealSlot,
  type Nutrients,
} from '@sproutine/food/client'
import { AppColumn } from './AppColumn'
import { BottomNav } from './BottomNav'
import { TopBar } from './TopBar'
import { PageEnter } from './PageMotion'
import { Icon, type IconName } from './Icon'
import { BarcodeScanner } from './BarcodeScanner'
import { MealLogCard } from './MealLogCard'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'

const UPCOMING_ICONS: IconName[] = ['eco', 'spa']

interface TodayLog {
  id: string
  eatenAt: string
  slot: MealSlot
  items: { name: string; brand: string | null; grams: number }[]
  /** Absent in gentle mode. */
  totals?: Nutrients
  partial?: string[]
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** A single-item card for a scanned product: one pack serving, else 100 g. */
function proposalForScan(food: FoodRecord): MealLogProposal {
  const grams = food.servingG ? Math.round(food.servingG) : 100
  return {
    // The device's own clock decides breakfast vs lunch here.
    slot: mealSlotAt(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone),
    source: 'barcode',
    items: [
      {
        query: food.name,
        match: food,
        alternatives: [],
        grams,
        portion: food.servingG
          ? { grams, basis: 'food-unit', confidence: 'medium' }
          : { grams, basis: 'generic-unit', confidence: 'low' },
      },
    ],
  }
}

export function TodayPage({ userId, name }: { userId: string; name: string }) {
  const { t, locale } = useLanguage()
  const router = useRouter()
  const [logs, setLogs] = useState<TodayLog[] | null>(null)
  // Until the server says otherwise, show no numbers.
  const [gentle, setGentle] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState<MealLogProposal | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/meals?since=${encodeURIComponent(startOfToday().toISOString())}`
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = (await res.json()) as { logs: TodayLog[]; gentle: boolean }
      setLogs(body.logs)
      setGentle(body.gentle)
    } catch (e) {
      console.warn('[today] loading meals failed:', e)
      setLogs((prev) => prev ?? [])
    }
  }, [])

  useEffect(() => {
    // Fetching on mount; the state updates happen after the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  // Today's meals from this week's plan, if there is one.
  const [planned, setPlanned] = useState<Partial<
    Record<(typeof PLAN_SLOTS)[number], string>
  > | null>(null)
  useEffect(() => {
    const today = new Date().toLocaleDateString('sv-SE')
    fetch(`/api/plans?week=${weekStartOf(new Date())}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { plan: { plan: MealPlan } | null } | null) => {
        const day = body?.plan?.plan.days.find((d) => d.date === today)
        setPlanned(day && Object.keys(day.meals).length ? day.meals : null)
      })
      .catch(() => setPlanned(null))
  }, [])

  const handleDetected = async (code: string) => {
    setScanning(false)
    setNotice(null)
    try {
      const res = await fetch(`/api/food/barcode/${encodeURIComponent(code)}`)
      if (res.status === 404) return setNotice(t.meal.notFoundBarcode)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { food } = (await res.json()) as { food: FoodRecord }
      setScanned(proposalForScan(food))
    } catch (e) {
      console.warn('[today] barcode lookup failed:', e)
      setNotice(t.meal.lookupFailed)
    }
  }

  const removeLog = async (id: string) => {
    // A delete that matches nothing (e.g. an expired session) isn't an error
    // to PostgREST, so check that the row really went.
    const { data, error } = await supabase.from('meal_logs').delete().eq('id', id).select('id')
    if (error || !data?.length) {
      console.warn('[today] remove failed:', error?.message ?? 'no row deleted')
      setNotice(t.meal.removeFailed)
      return
    }
    setLogs((prev) => prev?.filter((l) => l.id !== id) ?? null)
  }

  const now = new Date()
  const hour = now.getHours()
  const timeGreeting =
    hour < 12 ? t.today.goodMorning : hour < 17 ? t.today.goodAfternoon : t.today.goodEvening
  const greeting = name ? `${timeGreeting}, ${name}` : timeGreeting
  const dateLabel = now.toLocaleDateString(locale === 'en' ? 'en-GB' : locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const hasLogs = !!logs && logs.length > 0
  const dayKcal =
    !gentle && hasLogs
      ? logs.reduce(
          (acc, l) => ({
            kcal: acc.kcal + (l.totals?.kcal ?? 0),
            partial: acc.partial || l.totals?.kcal == null || !!l.partial?.includes('kcal'),
          }),
          { kcal: 0, partial: false }
        )
      : null

  return (
    <AppColumn>
      <TopBar userId={userId} />

      <PageEnter className="flex min-h-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 pt-3 pb-8">
          <div className="space-y-1.5">
            <p className="text-sm text-sproutine-muted">{dateLabel}</p>
            <h1 className="font-display text-[34px] leading-[1.08] text-sproutine-text">
              {greeting}
            </h1>
          </div>

          {notice && (
            <p
              role="status"
              className="rounded-2xl bg-sproutine-surface px-4 py-3 text-[15px] text-sproutine-text"
            >
              {notice}
            </p>
          )}

          {scanned && (
            <MealLogCard
              proposal={scanned}
              safetyMode={gentle}
              onSaved={() => {
                setScanned(null)
                void load()
              }}
              onDiscard={() => setScanned(null)}
            />
          )}

          {planned && (
            <Link href="/week" className="card block space-y-1 px-4 py-3">
              <h2 className="eyebrow">{t.today.onTheMenu}</h2>
              <ul>
                {PLAN_SLOTS.map((slot) =>
                  planned[slot] ? (
                    <li key={slot} className="flex gap-3 py-0.5 text-[15px]">
                      <span className="w-20 shrink-0 text-sproutine-text-secondary">
                        {t.week.slots[slot]}
                      </span>
                      <span className="text-sproutine-text">
                        {RECIPES_BY_ID[planned[slot]!]?.name ?? planned[slot]}
                      </span>
                    </li>
                  ) : null
                )}
              </ul>
            </Link>
          )}

          {hasLogs ? (
            <section className="space-y-3">
              {dayKcal && (
                <p className="text-[15px] text-sproutine-text-secondary">
                  {t.meal.total}:{' '}
                  <span className="font-semibold text-sproutine-text">
                    {dayKcal.partial ? `${t.meal.atLeast} ` : ''}
                    {Math.round(dayKcal.kcal)} {t.meal.kcal}
                  </span>
                </p>
              )}
              {MEAL_SLOTS.map((slot) => {
                const inSlot = logs.filter((l) => l.slot === slot)
                if (!inSlot.length) return null
                return (
                  <div key={slot} className="card space-y-1 px-4 py-3">
                    <h2 className="eyebrow">{t.meal.slots[slot]}</h2>
                    <ul className="divide-y divide-sproutine-border">
                      {inSlot.map((log) => (
                        <li key={log.id} className="flex items-start gap-2 py-2">
                          <ul className="min-w-0 flex-1 space-y-0.5">
                            {log.items.map((item, i) => (
                              <li key={i} className="flex gap-2 text-[15px] text-sproutine-text">
                                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                                <span className="shrink-0 text-sproutine-text-secondary tabular-nums">
                                  {Math.round(item.grams)} g
                                </span>
                              </li>
                            ))}
                            {!gentle && log.totals?.kcal != null && (
                              <li className="text-[13px] text-sproutine-muted">
                                {Math.round(log.totals.kcal)} {t.meal.kcal}
                              </li>
                            )}
                          </ul>
                          <button
                            type="button"
                            onClick={() => removeLog(log.id)}
                            aria-label={t.meal.removeMeal}
                            className="icon-btn -mt-1.5 h-10 w-10"
                          >
                            <Icon name="delete" size={20} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </section>
          ) : (
            logs && (
              <section className="card flex flex-col items-center gap-2.5 px-5 py-6 text-center">
                <Image
                  src="/icons/sproutine.png"
                  alt=""
                  width={120}
                  height={120}
                  priority
                  className="-mt-3.5 -mb-4"
                />
                <h2 className="font-display text-[22px] text-sproutine-text">
                  {t.today.emptyTitle}
                </h2>
                <p className="max-w-[280px] text-[15px] leading-normal text-pretty text-sproutine-text-secondary">
                  {t.today.emptyBody}
                </p>
              </section>
            )
          )}

          <div className="flex gap-2.5">
            <Link href="/chat" className="btn-primary h-12 flex-1 px-5 text-[15px]">
              {t.today.talkToRosie}
              <Icon name="arrow_forward" size={20} />
            </Link>
            <button
              type="button"
              onClick={() => {
                setNotice(null)
                setScanning(true)
              }}
              className="btn-secondary h-12 px-5 text-[15px]"
            >
              <Icon name="barcode_scanner" size={20} />
              {t.meal.scanAction}
            </button>
          </div>

          <section className="space-y-2.5">
            <h2 className="eyebrow">{t.today.comingSoon}</h2>
            <ul className="overflow-hidden rounded-[22px] bg-sproutine-surface">
              {t.today.upcoming.map((label, i) => (
                <li
                  key={label}
                  className="flex min-h-14 items-center gap-3 border-b border-sproutine-border px-4 text-[15px] text-sproutine-text last:border-b-0"
                >
                  <Icon
                    name={UPCOMING_ICONS[i] ?? 'eco'}
                    size={22}
                    className="text-sproutine-text-secondary"
                  />
                  {label}
                </li>
              ))}
            </ul>
          </section>
        </main>
      </PageEnter>

      <BottomNav active="today" />

      <AnimatePresence>
        {scanning && (
          <BarcodeScanner
            onDetected={handleDetected}
            onClose={() => setScanning(false)}
            onTellRosie={() => router.push('/chat')}
          />
        )}
      </AnimatePresence>
    </AppColumn>
  )
}
