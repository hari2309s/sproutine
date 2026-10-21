'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { mealSlotAt, type MealLogProposal, type MealSlot } from '@sproutine/food/client'
import { AppColumn } from './AppColumn'
import { BottomNav } from './BottomNav'
import { TopBar } from './TopBar'
import { PageEnter } from './PageMotion'
import { Icon } from './Icon'
import { BarcodeScanner } from './BarcodeScanner'
import { MealLogCard } from './MealLogCard'
import { MealLogSection } from './MealLogSection'
import { HabitsCard } from './HabitsCard'
import { WaterRow } from './WaterRow'
import { QuickAddSection } from './QuickAddSection'
import { MealCopySheet } from './MealCopySheet'
import { ShareSheet } from './ShareSheet'
import { Toast } from './Toast'
import { StreakRow } from './StreakRow'
import { StreakMilestone } from './StreakMilestone'
import { GoalRings } from './GoalRings'
import { WeeklyReviewCard } from './WeeklyReviewCard'
import { WeeklyReviewSheet } from './WeeklyReviewSheet'
import { CalendarInsightsCard } from './CalendarInsightsCard'
import { OnThisDayCard } from './OnThisDayCard'
import { OnTheMenuCard } from './OnTheMenuCard'
import { FoodSearchSheet } from './FoodSearchSheet'
import { PlanNotices } from './PlanNotices'
import { useLanguage } from '@/contexts/LanguageContext'
import { fetchOwnProfile } from '@/lib/profile'
import {
  type TodayLog,
  type StreakData,
  type WeeklyReviewData,
  startOfToday,
  proposalForScan,
  fetchTodayMeals,
  lookupBarcode,
  removeMealLog,
  setMealFavourite,
  copyMeal,
  fetchStreak,
  fetchWeeklyReview,
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
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [showMilestone, setShowMilestone] = useState<number | null>(null)
  const [goals, setGoals] = useState<{ kcal: number | null; protein: number | null; carbs: number | null; fat: number | null }>({ kcal: null, protein: null, carbs: null, fat: null })
  const [weeklyReview, setWeeklyReview] = useState<WeeklyReviewData | null>(null)
  const [showWeeklyReview, setShowWeeklyReview] = useState(false)

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
    void load()
    fetchStreak().then((s) => {
      setStreak(s)
      if (s.milestone && !localStorage.getItem(`milestone-${s.milestone}`)) setShowMilestone(s.milestone)
    }).catch(() => {})
    fetchOwnProfile(userId).then((p) => {
      if (p) setGoals({ kcal: p.kcalGoal, protein: p.proteinGoalG, carbs: p.carbsGoalG, fat: p.fatGoalG })
    }).catch(() => {})
    // Check if it's Monday and load weekly review
    const now = new Date()
    if (now.getDay() === 1) {
      const lastMon = new Date(now)
      lastMon.setDate(lastMon.getDate() - 7)
      const ws = lastMon.toISOString().slice(0, 10)
      fetchWeeklyReview(ws).then(setWeeklyReview).catch(() => {})
    }
  }, [load, userId])

  const [searchSlot, setSearchSlot] = useState<MealSlot | null>(null)
  const openSearch = (slot?: MealSlot) =>
    setSearchSlot(slot ?? mealSlotAt(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone))
  const handleSearchSaved = (slot: MealSlot) => {
    setSearchSlot(null)
    setToastMsg(t.search.saved(t.meal.slots[slot]))
    void load()
  }
  // The Pro gate's "Search instead" lands here with ?search=1.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('search') !== '1') return
    url.searchParams.delete('search')
    window.history.replaceState(null, '', url)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchSlot(mealSlotAt(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone))
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

          <PlanNotices />

          {streak && (
            <StreakRow
              current={streak.current}
              best={streak.best}
              milestone={streak.milestone}
              gentle={gentle}
              isFresh={streak.current === 0}
            />
          )}

          {weeklyReview && !showWeeklyReview && (
            <WeeklyReviewCard
              weekRange={weeklyReview.dailyKcal.length ? `${weeklyReview.dailyKcal[0]!.day.slice(5)}–${weeklyReview.dailyKcal.at(-1)!.day.slice(5)}` : ''}
              onClick={() => setShowWeeklyReview(true)}
            />
          )}

          <CalendarInsightsCard gentle={gentle} onTapCalendar={() => router.push('/week')} />

          <OnThisDayCard gentle={gentle} onReplay={() => void load()} />

          {!gentle && (
            <GoalRings
              goals={goals}
              totals={{
                kcal: logs?.reduce((a, l) => a + (l.totals?.kcal ?? 0), 0) ?? 0,
                protein: logs?.reduce((a, l) => a + (l.totals?.protein ?? 0), 0) ?? 0,
                carbs: logs?.reduce((a, l) => a + (l.totals?.carbs ?? 0), 0) ?? 0,
                fat: logs?.reduce((a, l) => a + (l.totals?.fat ?? 0), 0) ?? 0,
              }}
              gentle={gentle}
            />
          )}

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

          <OnTheMenuCard />

          <QuickAddSection gentle={gentle} onReplay={replayMeal} />

          <MealLogSection
            logs={logs}
            gentle={gentle}
            dayKcal={dayKcal}
            onCopySlot={setCopySlot}
            onAddToSlot={openSearch}
            onToggleFavourite={toggleFavourite}
            onRemoveLog={removeLog}
          />

          <HabitsCard gentle={gentle} />

          <div className="flex gap-2.5">
            <Link href="/chat" className="btn-primary h-12 flex-1 px-5 text-[15px]">
              {t.today.talkToRosie}
              <Icon name="arrow_forward" size={20} />
            </Link>
            <button
              type="button"
              onClick={() => openSearch()}
              className="btn-secondary h-12 px-5 text-[15px]"
            >
              <Icon name="search" size={20} />
              {t.search.title}
            </button>
          </div>
        </main>
      </PageEnter>

      <BottomNav active="today" gentle={gentle} />

      <AnimatePresence>
        {showMilestone && (
          <StreakMilestone
            milestone={showMilestone}
            name={name}
            onClose={() => {
              localStorage.setItem(`milestone-${showMilestone}`, '1')
              setShowMilestone(null)
            }}
          />
        )}
        {showWeeklyReview && weeklyReview && (
          <WeeklyReviewSheet
            stats={weeklyReview}
            streak={streak?.current ?? 0}
            gentle={gentle}
            weekRange={weeklyReview.dailyKcal.length ? `${weeklyReview.dailyKcal[0]!.day.slice(5)}–${weeklyReview.dailyKcal.at(-1)!.day.slice(5)}` : ''}
            onClose={() => setShowWeeklyReview(false)}
          />
        )}
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
        {searchSlot && (
          <FoodSearchSheet
            slot={searchSlot}
            gentle={gentle}
            onClose={() => setSearchSlot(null)}
            onSaved={handleSearchSaved}
            onScan={() => { setSearchSlot(null); setNotice(null); setScanning(true) }}
          />
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
