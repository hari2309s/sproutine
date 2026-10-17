'use client'

import { Icon } from './Icon'

interface WeeklyReviewCardProps {
  weekRange: string
  onClick: () => void
}

export function WeeklyReviewCard({ weekRange, onClick }: WeeklyReviewCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-[64px] items-center gap-3 rounded-[20px] bg-sproutine-accent-soft p-2 pr-3 pl-3 transition-opacity active:opacity-70"
    >
      {/* Icon circle */}
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sproutine-card text-sproutine-accent">
        <Icon name="auto_stories" size={22} />
      </span>

      {/* Text */}
      <span className="flex flex-1 flex-col items-start text-left">
        <span className="text-[15px] font-semibold text-sproutine-text">
          Your week in review is ready
        </span>
        <span className="text-[13px] text-sproutine-text-secondary">{weekRange}</span>
      </span>

      {/* Chevron */}
      <Icon name="chevron_right" size={24} className="shrink-0 text-sproutine-accent" />
    </button>
  )
}
