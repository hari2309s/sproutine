'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  MEAL_SLOTS,
  PLAN_SLOTS,
  RECIPES_BY_ID,
  type MealLogProposal,
  type MealSlot,
} from '@sproutine/food/client'
import { AppColumn } from './AppColumn'
import { BottomNav } from './BottomNav'
import { TopBar } from './TopBar'
import { PageEnter } from './PageMotion'
import { Icon } from './Icon'
import { BarcodeScanner } from './BarcodeScanner'
import { MealLogCard } from './MealLogCard'
import { HabitsCard } from './HabitsCard'
import { WaterRow } from './WaterRow'
import { QuickAddSection } from './QuickAddSection'
import { MealCopySheet } from './MealCopySheet'
import { ShareSheet } from './ShareSheet'
import { Toast } from './Toast'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  type TodayLog,
  startOfToday,
  proposalForScan,
  fetchTodayMeals,
  lookupBarcode,
  removeMealLog,
  setMealFavourite,
  copyMeal,
  fetchPlannedMeals,
} from '@/lib/mealApi'

export function TodayPage({ userId, name }: { userId: string; name: string }) {
  const { t, locale } = useLanguage()
  const router = useRouter()
  const [logs, setLogs] = useState<TodayLog[] | null>(null)
  const [gentle, setGentle] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState<MealLogProposal | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [copySlot, setCopySlot] = useState<MealSlot | null>(null)
  const [showShare, setShowShare] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const body = await fetchTodayMeals(startOfToday().toISOString())
      setLogs(body.logs)
      setGentle(body.gentle)
    } catch (e) {
      console.warn('[today] loading meals failed:', e)
      setLogs((prev) => prev ?? [])
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const [planned, setPlanned] = useState<Partial<
    Record<(typeof PLAN_SLOTS)[number], string>
  > | null>(null)
  useEffect(() => {
    fetchPlannedMeals().then(setPlanned).catch(() => setPlanned(null))
  }, [])

  const handleDetected = async (code: string) => {
    setScanning(false)
    setNotice(null)
    try {
      const food = await lookupBarcode(code)
      if (!food) return setNotice(t.meal.notFoundBarcode)
      setScanned(proposalForScan(food))
    } catch {
      setNotice(t.meal.lookupFailed)
    }
  }

  const removeLog = async (id: string) => {
    const removed = await removeMealLog(id)
    if (!removed) return setNotice(t.meal.removeFailed)
    setLogs((prev) => prev?.filter((l) => l.id !== id) ?? null)
  }

  const toggleFavourite = async (logId: string) => {
    const log = logs?.find((l) => l.id === logId)
    if (!log) return
    const next = !log.isFavourite
    setLogs((prev) =>
      prev?.map((l) => (l.id === logId ? { ...l, isFavourite: next } : l)) ?? null
    )
    try {
      await setMealFavourite(logId, next)
    } catch {
      setLogs((prev) =>
        prev?.map((l) => (l.id === logId ? { ...l, isFavourite: !next } : l)) ?? null
      )
    }
  }

  const replayMeal = async (item: {
    slot: MealSlot
    items: { source: string; sourceId: string; grams: number }[]
  }) => {
    const ok = await copyMeal(item.slot, item.items)
    if (ok) {
      setToastMsg(t.copy.copied)
      void load()
    }
  }

  const handleMealCopied = () => {
    setToastMsg(t.copy.copied)
    void load()
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
            <div className="flex items-center justify-between">
              <p className="text-sm text-sproutine-muted">{dateLabel}</p>
              {hasLogs && (
                <button
                  type="button"
                  onClick={() => setShowShare(true)}
                  aria-label={t.share.title}
                  className="icon-btn h-9 w-9"
                >
                  <Icon name="ios_share" size={20} />
                </button>
              )}
            </div>
            <h1 className="font-display text-[34px] leading-[1.08] text-sproutine-text">
              {greeting}
            </h1>
          </div>

          <WaterRow gentle={gentle} />

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
              onSaved={() => { setScanned(null); void load() }}
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

          <QuickAddSection gentle={gentle} onReplay={replayMeal} />

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
                    <div className="flex items-center justify-between">
                      <h2 className="eyebrow">{t.meal.slots[slot]}</h2>
                      <button
                        type="button"
                        onClick={() => setCopySlot(slot)}
                        aria-label={t.copy.repeatSlot(t.meal.slots[slot])}
                        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-sproutine-accent hover:bg-sproutine-accent-soft"
                      >
                        <Icon name="repeat" size={14} />
                      </button>
                    </div>
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
                            onClick={() => toggleFavourite(log.id)}
                            aria-label="Favourite"
                            className="icon-btn -mt-1.5 h-10 w-10"
                          >
                            <Icon
                              name="favorite"
                              filled={!!log.isFavourite}
                              size={20}
                              className={log.isFavourite ? 'text-sproutine-accent' : ''}
                            />
                          </button>
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
                <Image src="/icons/sproutine.png" alt="" width={120} height={120} priority className="-mt-3.5 -mb-4" />
                <h2 className="font-display text-[22px] text-sproutine-text">{t.today.emptyTitle}</h2>
                <p className="max-w-[280px] text-[15px] leading-normal text-pretty text-sproutine-text-secondary">
                  {t.today.emptyBody}
                </p>
              </section>
            )
          )}

          <HabitsCard gentle={gentle} />

          <div className="flex gap-2.5">
            <Link href="/chat" className="btn-primary h-12 flex-1 px-5 text-[15px]">
              {t.today.talkToRosie}
              <Icon name="arrow_forward" size={20} />
            </Link>
            <button
              type="button"
              onClick={() => { setNotice(null); setScanning(true) }}
              className="btn-secondary h-12 px-5 text-[15px]"
            >
              <Icon name="barcode_scanner" size={20} />
              {t.meal.scanAction}
            </button>
          </div>
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
        {copySlot && (
          <MealCopySheet slot={copySlot} onClose={() => setCopySlot(null)} onCopy={handleMealCopied} />
        )}
        {showShare && logs && (
          <ShareSheet
            logs={logs.map((l) => ({ slot: l.slot, items: l.items.map((i) => ({ name: i.name })), totals: l.totals }))}
            gentle={gentle}
            onClose={() => setShowShare(false)}
          />
        )}
      </AnimatePresence>

      {toastMsg && <Toast message={toastMsg} icon="check_circle" onDone={() => setToastMsg(null)} />}
    </AppColumn>
  )
}
