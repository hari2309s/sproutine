'use client'

import {
  INGREDIENTS,
  PLAN_SLOTS,
  RECIPES_BY_ID,
  type PlanSlot,
} from '@sproutine/food/client'
import { Icon } from './Icon'
import { useLanguage } from '@/contexts/LanguageContext'
import type { StoredPlan } from '@/hooks/useMealPlan'

const grams = (g: number) => (g >= 1000 ? `${(g / 1000).toLocaleString('en-GB')} kg` : `${g} g`)

interface WeekPlanViewProps {
  stored: StoredPlan
  today: string
  busy: string | null
  open: string | null
  setOpen: (key: string | null) => void
  swap: (date: string, slot: PlanSlot) => void
}

export function WeekPlanView({ stored, today, busy, open, setOpen, swap }: WeekPlanViewProps) {
  const { t, locale } = useLanguage()

  const dayLabel = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(locale === 'en' ? 'en-GB' : locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    })

  return (
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
                          {recipe?.name ?? '\u2013'}
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
  )
}
