'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { type PlanIssue } from '@sproutine/food/client'
import { AppColumn } from './AppColumn'
import { BottomNav } from './BottomNav'
import { TopBar } from './TopBar'
import { PageEnter } from './PageMotion'
import { Icon } from './Icon'
import { ShoppingList } from './ShoppingList'
import { WeekPlanEmpty } from './WeekPlanEmpty'
import { WeekPlanView } from './WeekPlanView'
import { CalendarMonthView } from './CalendarMonthView'
import { CalendarDaySheet } from './CalendarDaySheet'
import { useLanguage } from '@/contexts/LanguageContext'
import { useMealPlan } from '@/hooks/useMealPlan'
import { fetchOwnProfile } from '@/lib/profile'

const euro = (cents: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)

function addWeeks(isoMonday: string, weeks: number): string {
  const d = new Date(`${isoMonday}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

function IssueList({ issues }: { issues: PlanIssue[] }) {
  const { t } = useLanguage()
  return (
    <>
      {issues.map((issue, i) => (
        <p
          key={i}
          className="rounded-2xl bg-sproutine-surface px-4 py-3 text-sm text-sproutine-text-secondary"
        >
          {issue.kind === 'no-recipe'
            ? t.week.noRecipe(t.week.slots[issue.slot].toLowerCase())
            : t.week.overBudget(euro(issue.costCents), euro(issue.budgetCents))}
        </p>
      ))}
    </>
  )
}

export function WeekPage({ userId, initialWeek }: { userId: string; initialWeek?: string }) {
  const { t } = useLanguage()
  const [view, setView] = useState<'week' | 'month'>('week')
  const [daySheetDate, setDaySheetDate] = useState<string | null>(null)
  const [gentle, setGentle] = useState(true)

  const loadProfile = useCallback(async () => {
    const p = await fetchOwnProfile(userId).catch(() => null)
    if (p) setGentle(p.safetyMode ?? false)
  }, [userId])
  useEffect(() => { void loadProfile() }, [loadProfile])
  const {
    thisWeek,
    today,
    week,
    changeWeek,
    tab,
    setTab,
    stored,
    issues,
    quickOnly,
    setQuickOnly,
    busy,
    notice,
    open,
    setOpen,
    ticked,
    toggle,
    loadFailed,
    load,
    plan,
    swap,
    shopping,
  } = useMealPlan(initialWeek)

  return (
    <AppColumn>
      <TopBar userId={userId} />
      <PageEnter className="flex min-h-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pt-3 pb-8">
          <h1 className="font-display text-[34px] leading-[1.08] text-sproutine-text">
            {t.week.title}
          </h1>

          {/* Week/Month toggle */}
          <div
            role="group"
            aria-label="View mode"
            className="flex gap-1 rounded-full bg-sproutine-surface p-1"
          >
            {(['week', 'month'] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`h-10 flex-1 rounded-full text-sm ${
                  view === v
                    ? 'bg-sproutine-card font-semibold text-sproutine-text shadow-soft'
                    : 'font-medium text-sproutine-text-secondary hover:text-sproutine-text'
                }`}
              >
                {v === 'week' ? t.week.title : 'Month'}
              </button>
            ))}
          </div>

          {view === 'month' ? (
            <CalendarMonthView
              month={today.slice(0, 7)}
              onDayTap={setDaySheetDate}
              gentle={gentle}
            />
          ) : (
          <>
          {/* Week selector */}
          <div
            role="group"
            aria-label={t.week.title}
            className="flex gap-1 rounded-full bg-sproutine-surface p-1"
          >
            {[thisWeek, addWeeks(thisWeek, 1)].map((w, i) => (
              <button
                key={w}
                type="button"
                aria-pressed={week === w}
                onClick={() => changeWeek(w)}
                className={`h-10 flex-1 rounded-full text-sm ${
                  week === w
                    ? 'bg-sproutine-card font-semibold text-sproutine-text shadow-soft'
                    : 'font-medium text-sproutine-text-secondary hover:text-sproutine-text'
                }`}
              >
                {i === 0 ? t.week.thisWeek : t.week.nextWeek}
              </button>
            ))}
          </div>

          {notice && (
            <p
              role="status"
              className="rounded-2xl bg-sproutine-surface px-4 py-3 text-[15px] text-sproutine-text"
            >
              {notice}
            </p>
          )}

          {loadFailed ? (
            <section className="card flex flex-col gap-3 px-5 py-6">
              <p role="alert" className="text-[15px] text-sproutine-text">
                {t.week.loadFailed}
              </p>
              <button type="button" onClick={() => void load(week)} className="btn-secondary h-11">
                <Icon name="refresh" size={18} />
                {t.week.retry}
              </button>
            </section>
          ) : stored === undefined ? (
            <div className="h-40 animate-pulse rounded-[22px] bg-sproutine-surface" aria-hidden />
          ) : stored === null ? (
            <WeekPlanEmpty
              quickOnly={quickOnly}
              onQuickOnlyChange={setQuickOnly}
              onPlan={plan}
              busy={busy}
            />
          ) : (
            <>
              <div role="group" aria-label={t.week.title} className="flex gap-2">
                {(['meals', 'shopping'] as const).map((x) => (
                  <button
                    key={x}
                    type="button"
                    aria-pressed={tab === x}
                    onClick={() => setTab(x)}
                    className={`flex h-10 items-center gap-1.5 rounded-full px-4 text-sm ${
                      tab === x
                        ? 'bg-sproutine-accent font-semibold text-sproutine-bg'
                        : 'bg-sproutine-surface font-medium text-sproutine-text-secondary'
                    }`}
                  >
                    <Icon name={x === 'meals' ? 'restaurant' : 'shopping_basket'} size={18} />
                    {x === 'meals' ? t.week.meals : t.week.shopping}
                  </button>
                ))}
              </div>

              <IssueList issues={issues} />

              {tab === 'meals' ? (
                <WeekPlanView
                  stored={stored}
                  today={today}
                  busy={busy}
                  open={open}
                  setOpen={setOpen}
                  swap={swap}
                />
              ) : (
                shopping && (
                  <ShoppingList shopping={shopping} ticked={ticked} toggle={toggle} />
                )
              )}

              <button
                type="button"
                onClick={() => {
                  if (window.confirm(t.week.newPlanConfirm)) void plan()
                }}
                disabled={!!busy}
                className="btn-secondary h-11 w-full"
              >
                <Icon name="refresh" size={18} />
                {busy === 'plan' ? t.week.planning : t.week.newPlan}
              </button>
            </>
          )}
          </>
          )}
        </main>
      </PageEnter>
      <BottomNav active="week" />

      <AnimatePresence>
        {daySheetDate && (
          <CalendarDaySheet
            date={daySheetDate}
            onClose={() => setDaySheetDate(null)}
            gentle={gentle}
          />
        )}
      </AnimatePresence>
    </AppColumn>
  )
}
