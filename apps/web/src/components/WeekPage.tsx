'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AISLES,
  buildShoppingList,
  INGREDIENTS,
  PLAN_SLOTS,
  RECIPES_BY_ID,
  weekStartOf,
  type MealPlan,
  type PlanIssue,
  type PlanSlot,
} from '@sproutine/food/client'
import { AppColumn } from './AppColumn'
import { BottomNav } from './BottomNav'
import { TopBar } from './TopBar'
import { PageEnter } from './PageMotion'
import { Icon } from './Icon'
import { useLanguage } from '@/contexts/LanguageContext'

interface StoredPlan {
  id: string
  plan: MealPlan
  updatedAt: string
}

const euro = (cents: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)

const grams = (g: number) => (g >= 1000 ? `${(g / 1000).toLocaleString('en-GB')} kg` : `${g} g`)

function addWeeks(isoMonday: string, weeks: number): string {
  const d = new Date(`${isoMonday}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

/** Ticked shopping items, per plan, in this browser only. */
function useTicked(planId: string | undefined) {
  const key = planId ? `sproutine-shopping-${planId}` : null
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (!key) return
    try {
      const raw = localStorage.getItem(key)
      // Restoring a per-browser convenience after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTicked(new Set(raw ? (JSON.parse(raw) as string[]) : []))
    } catch {
      setTicked(new Set())
    }
  }, [key])
  const toggle = (id: string) =>
    setTicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        if (key) localStorage.setItem(key, JSON.stringify([...next]))
      } catch {
        // Storage unavailable (private mode): ticks last for this visit only.
      }
      return next
    })
  return { ticked, toggle }
}

export function WeekPage({ userId }: { userId: string }) {
  const { t, locale } = useLanguage()
  const thisWeek = weekStartOf(new Date())
  const [week, setWeek] = useState(thisWeek)
  const [tab, setTab] = useState<'meals' | 'shopping'>('meals')
  const [stored, setStored] = useState<StoredPlan | null | undefined>(undefined)
  const [issues, setIssues] = useState<PlanIssue[]>([])
  const [quickOnly, setQuickOnly] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const { ticked, toggle } = useTicked(stored?.id)

  // A load failure is not "no plan": offering "Plan my week" then would
  // silently replace a plan that exists.
  const [loadFailed, setLoadFailed] = useState(false)
  // The selected week, so a response that arrives after a switch is dropped.
  const weekRef = useRef(week)
  useEffect(() => {
    weekRef.current = week
  }, [week])

  const load = useCallback(async (weekStart: string) => {
    setStored(undefined)
    setLoadFailed(false)
    try {
      const res = await fetch(`/api/plans?week=${weekStart}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { plan } = (await res.json()) as { plan: StoredPlan | null }
      if (weekRef.current === weekStart) setStored(plan)
    } catch (e) {
      console.warn('[week] load failed:', e)
      if (weekRef.current === weekStart) setLoadFailed(true)
    }
  }, [])

  useEffect(() => {
    // Fetching on mount and on week change; state updates follow the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(week)
  }, [week, load])

  const plan = async () => {
    const forWeek = week
    setBusy('plan')
    setNotice(null)
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStart: week,
          // Mid-week, plan (and shop) only for the days still ahead.
          ...(week === thisWeek ? { fromDate: today } : {}),
          prefs: quickOnly ? { maxMinutes: 25 } : {},
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = (await res.json()) as { plan: StoredPlan; issues: PlanIssue[] }
      if (weekRef.current !== forWeek) return
      setStored(body.plan)
      setIssues(body.issues)
      setTab('meals')
    } catch (e) {
      console.warn('[week] plan failed:', e)
      setNotice(t.week.planFailed)
    } finally {
      setBusy(null)
    }
  }

  const swap = async (date: string, slot: PlanSlot) => {
    if (!stored) return
    const forWeek = week
    setBusy(`${date}:${slot}`)
    setNotice(null)
    try {
      const res = await fetch(`/api/plans/${stored.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, slot, updatedAt: stored.updatedAt }),
      })
      if (weekRef.current !== forWeek) return
      if (res.status === 409) {
        setNotice(t.week.planChanged)
        await load(forWeek)
        return
      }
      if (res.status === 422) return setNotice(t.week.nothingElse)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const updated = ((await res.json()) as { plan: StoredPlan }).plan
      if (weekRef.current === forWeek) setStored(updated)
    } catch (e) {
      console.warn('[week] swap failed:', e)
      setNotice(t.week.swapFailed)
    } finally {
      setBusy(null)
    }
  }

  const shopping = useMemo(
    () =>
      stored
        ? buildShoppingList(
            stored.plan.days.flatMap((d) =>
              PLAN_SLOTS.map((s) => d.meals[s]).filter((id): id is string => !!id)
            )
          )
        : null,
    [stored]
  )

  const dayLabel = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(locale === 'en' ? 'en-GB' : locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    })
  const today = new Date().toLocaleDateString('sv-SE')

  return (
    <AppColumn>
      <TopBar userId={userId} />
      <PageEnter className="flex min-h-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pt-3 pb-8">
          <h1 className="font-display text-[34px] leading-[1.08] text-sproutine-text">
            {t.week.title}
          </h1>

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
                onClick={() => {
                  setWeek(w)
                  setIssues([])
                  setNotice(null)
                }}
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
            <section className="card flex flex-col gap-3 px-5 py-6">
              <h2 className="font-display text-[22px] text-sproutine-text">{t.week.emptyTitle}</h2>
              <p className="text-[15px] leading-normal text-sproutine-text-secondary">
                {t.week.emptyBody}
              </p>
              <label className="flex items-center gap-2.5 text-[15px] text-sproutine-text">
                <input
                  type="checkbox"
                  checked={quickOnly}
                  onChange={(e) => setQuickOnly(e.target.checked)}
                  className="h-5 w-5 accent-sproutine-accent"
                />
                {t.week.quickOnly}
              </label>
              <button
                type="button"
                onClick={plan}
                disabled={!!busy}
                className="btn-primary mt-1 h-12"
              >
                <Icon name="calendar_view_week" size={20} />
                {busy === 'plan' ? t.week.planning : t.week.planWeek}
              </button>
            </section>
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

              {tab === 'meals' ? (
                <ol className="space-y-3">
                  {stored.plan.days.map((day, di) =>
                    day.date < today && Object.keys(day.meals).length === 0 ? null : (
                      <li
                        key={day.date}
                        className={`card px-4 py-3 ${day.date === today ? 'ring-2 ring-sproutine-accent' : ''}`}
                      >
                        <h2 className="eyebrow mb-1">{dayLabel(day.date)}</h2>
                        <ul className="divide-y divide-sproutine-border">
                          {PLAN_SLOTS.map((slot) => {
                            const recipe = day.meals[slot]
                              ? RECIPES_BY_ID[day.meals[slot]!]
                              : undefined
                            const key = `${day.date}:${slot}`
                            const leftovers =
                              slot === 'lunch' &&
                              di > 0 &&
                              stored.plan.days[di - 1]!.meals.dinner === day.meals.lunch
                            return (
                              <li key={slot} className="py-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setOpen(open === key ? null : key)}
                                    aria-expanded={open === key}
                                    disabled={!recipe}
                                    className="flex min-w-0 flex-1 flex-col items-start text-left"
                                  >
                                    <span className="text-xs text-sproutine-muted">
                                      {t.week.slots[slot]}
                                      {recipe ? ` · ${t.week.minutes(recipe.minutes)}` : ''}
                                      {leftovers ? ` · ${t.week.leftovers}` : ''}
                                    </span>
                                    <span className="text-[15px] font-medium text-sproutine-text">
                                      {recipe?.name ?? '–'}
                                    </span>
                                  </button>
                                  {recipe && (
                                    <button
                                      type="button"
                                      onClick={() => swap(day.date, slot)}
                                      disabled={!!busy}
                                      aria-label={t.week.swap(recipe.name)}
                                      className="icon-btn h-10 w-10"
                                    >
                                      <Icon
                                        name="refresh"
                                        size={20}
                                        className={
                                          busy === key ? 'motion-safe:animate-spin' : undefined
                                        }
                                      />
                                    </button>
                                  )}
                                </div>
                                {recipe && open === key && (
                                  <div className="mt-2 space-y-2 rounded-xl bg-sproutine-surface px-3 py-2.5 text-sm text-sproutine-text">
                                    <p className="text-sproutine-text-secondary">{recipe.how}</p>
                                    <p className="text-xs font-semibold text-sproutine-muted">
                                      {t.week.ingredients}
                                    </p>
                                    <ul className="space-y-0.5">
                                      {recipe.ingredients.map(({ id, grams: g }) => (
                                        <li key={id} className="flex gap-2">
                                          <span className="flex-1">
                                            {INGREDIENTS[id]?.name ?? id}
                                          </span>
                                          <span className="text-sproutine-text-secondary tabular-nums">
                                            {grams(g)}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      </li>
                    )
                  )}
                </ol>
              ) : (
                shopping && (
                  <section className="space-y-4">
                    <div>
                      <p className="text-[15px] font-semibold text-sproutine-text">
                        {t.week.estimateTotal(euro(shopping.totalCents))}
                      </p>
                      <p className="text-[13px] text-sproutine-muted">{t.week.estimateNote}</p>
                    </div>
                    {AISLES.filter((a) => shopping.items.some((i) => i.aisle === a)).map(
                      (aisle) => (
                        <div key={aisle} className="card px-4 py-3">
                          <h2 className="eyebrow mb-1">{t.week.aisles[aisle]}</h2>
                          <ul>
                            {shopping.items
                              .filter((i) => i.aisle === aisle)
                              .map((item) => (
                                <li key={item.ingredientId}>
                                  <label className="flex min-h-11 items-center gap-3 text-[15px]">
                                    <input
                                      type="checkbox"
                                      checked={ticked.has(item.ingredientId)}
                                      onChange={() => toggle(item.ingredientId)}
                                      className="h-5 w-5 shrink-0 accent-sproutine-accent"
                                    />
                                    <span
                                      className={`min-w-0 flex-1 ${
                                        ticked.has(item.ingredientId)
                                          ? 'text-sproutine-muted line-through'
                                          : 'text-sproutine-text'
                                      }`}
                                    >
                                      {item.name}
                                      <span className="block text-xs text-sproutine-muted">
                                        {item.nameDe} ·{' '}
                                        {t.week.packs(item.packs, grams(item.packGrams))}
                                      </span>
                                    </span>
                                    <span className="text-sm text-sproutine-text-secondary tabular-nums">
                                      {euro(item.cents)}
                                    </span>
                                  </label>
                                </li>
                              ))}
                          </ul>
                        </div>
                      )
                    )}
                    {shopping.pantry.length > 0 && (
                      <p className="text-sm text-sproutine-text-secondary">
                        <span className="font-semibold">{t.week.checkPantry}: </span>
                        {shopping.pantry.map((p) => p.name).join(', ')}
                      </p>
                    )}
                  </section>
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
        </main>
      </PageEnter>
      <BottomNav active="week" />
    </AppColumn>
  )
}
