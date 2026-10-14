'use client'

import { useCallback, useEffect, useState } from 'react'
import { Icon } from './Icon'
import { useLanguage } from '@/contexts/LanguageContext'
import type { HabitView } from '@/lib/habitsView'

/** Today's habits: tap to check off, add one, remove one. */
export function HabitsCard({ gentle }: { gentle: boolean }) {
  const { t } = useLanguage()
  const [habits, setHabits] = useState<HabitView[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/habits')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setHabits(((await res.json()) as { habits: HabitView[] }).habits)
    } catch (e) {
      console.warn('[habits] load failed:', e)
      setHabits((prev) => prev ?? [])
    }
  }, [])

  useEffect(() => {
    // Fetching on mount; state updates follow the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const run = async (key: string, fn: () => Promise<Response>) => {
    setBusy(key)
    setError(null)
    try {
      const res = await fn()
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res
    } catch (e) {
      console.warn('[habits]', e)
      setError(t.today.habitFailed)
      return null
    } finally {
      setBusy(null)
    }
  }

  const toggle = async (habit: HabitView) => {
    const res = await run(habit.id, () =>
      fetch(`/api/habits/${habit.id}/checkin`, { method: 'POST' })
    )
    if (!res) return
    const { habit: updated } = (await res.json()) as { habit: HabitView }
    setHabits((prev) => prev?.map((h) => (h.id === updated.id ? updated : h)) ?? null)
  }

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const res = await run('add', () =>
      fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), period }),
      })
    )
    if (!res) return
    setTitle('')
    setAdding(false)
    void load()
  }

  const remove = async (habit: HabitView) => {
    const res = await run(`rm:${habit.id}`, () =>
      fetch(`/api/habits/${habit.id}`, { method: 'DELETE' })
    )
    if (res) setHabits((prev) => prev?.filter((h) => h.id !== habit.id) ?? null)
  }

  if (habits === null) return null

  const status = (h: HabitView) => {
    if (h.streak === 0) return h.period === 'weekly' ? t.today.weekly : t.today.daily
    // Gentle mode: no counting.
    if (gentle) return t.today.keptUp
    return h.period === 'daily' ? t.today.streakDays(h.streak) : t.today.streakWeeks(h.streak)
  }

  return (
    <section className="card space-y-2 px-4 py-3">
      <div className="flex items-center justify-between">
        <h2 className="eyebrow">{t.today.habitsTitle}</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-9 items-center gap-1 rounded-full px-2 text-sm font-semibold text-sproutine-accent"
          >
            <Icon name="add" size={18} />
            {t.today.addHabit}
          </button>
        )}
      </div>

      {habits.length === 0 && !adding && (
        <p className="text-[15px] text-sproutine-text-secondary">{t.today.habitsEmpty}</p>
      )}

      <ul className="divide-y divide-sproutine-border">
        {habits.map((h) => {
          // A weekly habit done earlier this week shows as done, but only
          // today's check-in can be undone with a tap.
          const lockedDone = h.done && !h.checkedToday
          return (
            <li key={h.id} className="flex items-center gap-2 py-1.5">
              <button
                type="button"
                onClick={() => toggle(h)}
                disabled={!!busy || lockedDone}
                aria-pressed={h.done}
                aria-label={t.today.checkHabit(h.title)}
                className="icon-btn h-11 w-11 shrink-0"
              >
                <Icon
                  name={h.done ? 'check_circle' : 'radio_button_unchecked'}
                  filled={h.done}
                  size={26}
                  className={h.done ? 'text-sproutine-accent' : 'text-sproutine-muted'}
                />
              </button>
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[15px] ${h.done ? 'text-sproutine-text-secondary' : 'text-sproutine-text'}`}
                >
                  {h.title}
                </span>
                <span className="block text-xs text-sproutine-muted">
                  {lockedDone ? t.today.doneThisWeek : status(h)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove(h)}
                disabled={!!busy}
                aria-label={t.today.removeHabit(h.title)}
                className="icon-btn h-10 w-10 shrink-0"
              >
                <Icon name="close" size={18} />
              </button>
            </li>
          )
        })}
      </ul>

      {adding && (
        <form onSubmit={add} className="flex flex-col gap-2 pt-1">
          <label htmlFor="habit-title" className="sr-only">
            {t.today.addHabit}
          </label>
          <input
            id="habit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.today.habitPlaceholder}
            maxLength={60}
            autoFocus
            className="field bg-sproutine-bg"
          />
          <div role="group" aria-label={t.today.addHabit} className="flex gap-1.5">
            {(['daily', 'weekly'] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
                className={`h-9 rounded-full px-3 text-sm ${
                  period === p
                    ? 'bg-sproutine-accent font-semibold text-sproutine-bg'
                    : 'bg-sproutine-surface font-medium text-sproutine-text-secondary'
                }`}
              >
                {p === 'daily' ? t.today.daily : t.today.weekly}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!title.trim() || !!busy}
              className="btn-primary h-10 flex-1"
            >
              {t.today.add}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false)
                setTitle('')
              }}
              className="btn-ghost h-10 px-4"
            >
              {t.today.cancel}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-sproutine-red">
          {error}
        </p>
      )}
    </section>
  )
}
