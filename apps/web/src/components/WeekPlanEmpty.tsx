'use client'

import { Icon } from './Icon'
import { useLanguage } from '@/contexts/LanguageContext'

interface WeekPlanEmptyProps {
  quickOnly: boolean
  onQuickOnlyChange: (value: boolean) => void
  onPlan: () => void
  busy: string | null
}

export function WeekPlanEmpty({ quickOnly, onQuickOnlyChange, onPlan, busy }: WeekPlanEmptyProps) {
  const { t } = useLanguage()

  return (
    <section className="card flex flex-col gap-3 px-5 py-6">
      <h2 className="font-display text-[22px] text-sproutine-text">{t.week.emptyTitle}</h2>
      <p className="text-[15px] leading-normal text-sproutine-text-secondary">
        {t.week.emptyBody}
      </p>
      <label className="flex items-center gap-2.5 text-[15px] text-sproutine-text">
        <input
          type="checkbox"
          checked={quickOnly}
          onChange={(e) => onQuickOnlyChange(e.target.checked)}
          className="h-5 w-5 accent-sproutine-accent"
        />
        {t.week.quickOnly}
      </label>
      <button
        type="button"
        onClick={onPlan}
        disabled={!!busy}
        className="btn-primary mt-1 h-12"
      >
        <Icon name="calendar_view_week" size={20} />
        {busy === 'plan' ? t.week.planning : t.week.planWeek}
      </button>
    </section>
  )
}
