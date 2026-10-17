'use client'

import { Icon } from './Icon'
import { useLanguage } from '@/contexts/LanguageContext'

interface StreakRowProps {
  current: number
  best: number
  milestone: number | null
  gentle: boolean
  isFresh: boolean
}

export function StreakRow({ current, best, milestone, gentle, isFresh }: StreakRowProps) {
  const { t } = useLanguage()
  const isMilestone = milestone !== null

  // Fresh start state
  if (isFresh) {
    return (
      <div className="flex min-h-[60px] items-center gap-3 rounded-[20px] bg-sproutine-surface px-[14px] py-2">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sproutine-card">
          <Icon name="eco" size={22} className="text-green-500" />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-[19px] leading-tight">
            {t.streak.freshStart}
          </span>
          <span className="block text-[13px] text-sproutine-text-secondary">
            {t.streak.freshStartSub}
          </span>
        </span>
      </div>
    )
  }

  // Gentle mode state
  if (gentle) {
    return (
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sproutine-surface">
          <Icon name="eco" size={20} className="text-green-500" />
        </span>
        <span className="text-[15px] font-semibold">{t.streak.gentleLabel}</span>
        <span className="ml-1 flex items-center gap-1 rounded-full bg-sproutine-surface px-2.5 py-0.5 text-[12px] font-semibold text-sproutine-text-secondary">
          <Icon name="spa" size={13} className="text-sproutine-text-secondary" />
          {t.settings.gentleMode}
        </span>
      </div>
    )
  }

  // Active streak state
  return (
    <div className="flex items-center gap-2.5">
      {/* Icon circle */}
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isMilestone ? 'bg-sproutine-accent' : 'bg-sproutine-accent-soft'
        }`}
        style={
          isMilestone
            ? { boxShadow: '0 0 0 4px var(--t-accent-soft)' }
            : undefined
        }
      >
        <Icon
          name="eco"
          size={20}
          className={isMilestone ? 'text-sproutine-bg' : 'text-sproutine-accent'}
          filled
        />
      </span>

      {/* Count */}
      <span
        className={`font-display text-[28px] leading-none ${
          isMilestone ? 'text-sproutine-accent' : ''
        }`}
      >
        {current}
      </span>

      {/* Label */}
      <span className="text-[15px] text-sproutine-text-secondary">{t.streak.dayStreak}</span>

      {/* Spacer + right side */}
      <span className="flex-1" />
      {isMilestone ? (
        <span className="rounded-full bg-sproutine-accent px-2.5 py-0.5 text-[12px] font-semibold text-sproutine-bg">
          {t.streak.milestone}
        </span>
      ) : (
        <span className="text-[13px] text-sproutine-muted">{t.streak.best(best)}</span>
      )}
    </div>
  )
}
