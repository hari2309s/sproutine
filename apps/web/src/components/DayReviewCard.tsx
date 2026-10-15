'use client'

import { Icon } from './Icon'
import { useLanguage } from '@/contexts/LanguageContext'

export interface ReviewMeal {
  slot: string
  names: string
  time: string
}

export interface DayReview {
  date: string
  meals: ReviewMeal[]
  /** Macro totals — omitted in gentle mode. */
  totals?: { kcal?: number; protein?: number; carbs?: number; fat?: number }
  gentle: boolean
}

/**
 * Kitchen-notebook daily review card: a margin line, meal rows with slot pills,
 * dashed dividers, serif macro totals, and a scalloped receipt edge at the bottom.
 */
export function DayReviewCard({ review }: { review: DayReview }) {
  const { t } = useLanguage()
  const slots = ['breakfast', 'lunch', 'snack', 'dinner'] as const

  return (
    <div className="flex flex-col">
      <div className="overflow-hidden rounded-t-[24px] border border-sproutine-border bg-sproutine-card shadow-soft">
        {/* ── Header strip ── */}
        <div className="flex min-h-12 items-center gap-2 bg-sproutine-surface px-4 py-2">
          <Icon name="calendar_today" size={20} className="text-sproutine-accent" />
          <span className="text-[15px] font-semibold">{t.nav.today}</span>
          <span className="text-[13px] text-sproutine-muted">{review.date}</span>
          <span className="flex-1" />
          {review.gentle && (
            <span className="flex h-7 items-center gap-1 rounded-full border border-sproutine-border-strong px-2.5 text-xs font-semibold text-sproutine-text-secondary">
              <Icon name="spa" size={16} />
              {t.settings.gentleMode}
            </span>
          )}
        </div>

        {/* ── Meal rows with margin line ── */}
        <div className="relative py-1 pl-7 pr-4">
          {/* Terracotta margin line */}
          <span className="absolute left-4 top-0 bottom-0 w-[1.5px] bg-sproutine-accent-soft" />

          {slots.map((slot, i) => {
            const meal = review.meals.find((m) => m.slot === slot)
            return (
              <div
                key={slot}
                className={`grid min-h-[44px] grid-cols-[82px_1fr_auto] items-center gap-2 ${
                  i > 0 ? 'border-t border-dashed border-sproutine-border' : ''
                }`}
              >
                <span
                  className={`justify-self-start rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    meal
                      ? 'bg-sproutine-surface'
                      : 'border border-dashed border-sproutine-border-strong text-sproutine-muted'
                  }`}
                >
                  {t.meal.slots[slot as keyof typeof t.meal.slots] ?? slot}
                </span>
                <span
                  className={`text-sm leading-snug ${meal ? '' : 'text-sproutine-muted'}`}
                >
                  {meal ? meal.names : t.today.noMealLogged}
                </span>
                <span className="text-xs text-sproutine-muted">{meal?.time ?? ''}</span>
              </div>
            )
          })}
        </div>

        {/* ── Macro totals (hidden in gentle mode) ── */}
        {!review.gentle && review.totals && (
          <div className="mx-3 grid grid-cols-4 border-t-[1.5px] border-dashed border-sproutine-border px-1 py-2.5">
            {review.totals.kcal != null && (
              <span className="flex flex-col">
                <span className="font-display text-xl">{review.totals.kcal.toLocaleString()}</span>
                <span className="text-xs text-sproutine-text-secondary">{t.meal.kcal}</span>
              </span>
            )}
            {review.totals.protein != null && (
              <span className="flex flex-col">
                <span className="font-display text-xl">{Math.round(review.totals.protein)} g</span>
                <span className="text-xs text-sproutine-text-secondary">{t.meal.protein}</span>
              </span>
            )}
            {review.totals.carbs != null && (
              <span className="flex flex-col">
                <span className="font-display text-xl">{Math.round(review.totals.carbs)} g</span>
                <span className="text-xs text-sproutine-text-secondary">{t.meal.carbs}</span>
              </span>
            )}
            {review.totals.fat != null && (
              <span className="flex flex-col">
                <span className="font-display text-xl">{Math.round(review.totals.fat)} g</span>
                <span className="text-xs text-sproutine-text-secondary">{t.meal.fat}</span>
              </span>
            )}
          </div>
        )}
      </div>
      {/* ── Scalloped receipt edge ── */}
      <div
        className="h-2.5 border-x border-sproutine-border bg-sproutine-card"
        style={{
          maskImage: 'radial-gradient(circle at 10px 0, transparent 9.5px, black 10px)',
          WebkitMaskImage: 'radial-gradient(circle at 10px 0, transparent 9.5px, black 10px)',
          maskSize: '20px 10px',
          WebkitMaskSize: '20px 10px',
          maskRepeat: 'repeat-x',
          WebkitMaskRepeat: 'repeat-x',
        }}
      />
    </div>
  )
}
