'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildShoppingList,
  PLAN_SLOTS,
  weekStartOf,
  type MealPlan,
  type PlanIssue,
  type PlanSlot,
} from '@sproutine/food/client'
import { useLanguage } from '@/contexts/LanguageContext'
import { isPlannableWeek } from '@/lib/planProfile'

export interface StoredPlan {
  id: string
  plan: MealPlan
  updatedAt: string
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

export function useMealPlan(initialWeek?: string) {
  const { t } = useLanguage()
  const thisWeek = weekStartOf(new Date())
  const today = new Date().toLocaleDateString('sv-SE')

  // A week from a link (a Monday near now), else this week.
  const [week, setWeek] = useState(() =>
    // An old link (a week already over) opens this week instead.
    initialWeek && isPlannableWeek(initialWeek) && initialWeek >= thisWeek ? initialWeek : thisWeek
  )
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
      if (weekRef.current === forWeek) setNotice(t.week.planFailed)
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
      if (weekRef.current === forWeek) setNotice(t.week.swapFailed)
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

  const changeWeek = (w: string) => {
    setWeek(w)
    setIssues([])
    setNotice(null)
  }

  return {
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
  }
}
