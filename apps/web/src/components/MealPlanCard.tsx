'use client'

import Link from 'next/link'
import { Icon } from './Icon'
import { useLanguage } from '@/contexts/LanguageContext'
import type { MealPlanSummary } from '@/lib/planSummary'

const euro = (cents: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)

/** A new weekly plan in chat: dinners by day, the estimate, and a way in. */
export function MealPlanCard({ summary }: { summary: MealPlanSummary }) {
  const { t, locale } = useLanguage()
  const day = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(locale === 'en' ? 'en-GB' : locale, {
      weekday: 'short',
    })

  return (
    <section className="card flex w-full max-w-[420px] flex-col gap-3 self-start p-4">
      <h3 className="eyebrow">{summary.nextWeek ? t.week.cardTitleNext : t.week.cardTitle}</h3>
      <ul className="space-y-1.5">
        {summary.dinners.map((d) => (
          <li key={d.date} className="flex gap-3 text-[15px]">
            <span className="w-9 shrink-0 font-semibold text-sproutine-text-secondary">
              {day(d.date)}
            </span>
            <span className="text-sproutine-text">{d.name}</span>
          </li>
        ))}
      </ul>
      {summary.droppedWishes && (
        <p className="text-sm text-sproutine-text-secondary">{t.week.droppedWishes}</p>
      )}
      {summary.issues.map((issue, i) => (
        <p key={i} className="text-sm text-sproutine-text-secondary">
          {issue.kind === 'no-recipe'
            ? t.week.noRecipe(t.week.slots[issue.slot].toLowerCase())
            : t.week.overBudget(euro(issue.costCents), euro(issue.budgetCents))}
        </p>
      ))}
      <p className="text-sm text-sproutine-text-secondary">
        {t.week.shopping}: {t.week.estimateTotal(euro(summary.totalCents)).toLowerCase()}
      </p>
      {/* The exact week, not "next": the server and this browser may disagree
          on which week is current around midnight. */}
      <Link href={`/week?week=${summary.weekStart}`} className="btn-primary h-11">
        <Icon name="calendar_view_week" size={20} />
        {t.week.openWeek}
      </Link>
    </section>
  )
}
