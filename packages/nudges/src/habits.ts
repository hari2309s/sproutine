import { addDays, isoWeek, mondayOf } from './time'

export const HABIT_PERIODS = ['daily', 'weekly'] as const
export type HabitPeriod = (typeof HABIT_PERIODS)[number]

/** Streak lengths worth a little celebration. */
export const STREAK_MILESTONES = [3, 7, 14, 30] as const

/** The period a check-in date counts toward: the day, or its ISO week. */
export function periodOf(period: HabitPeriod, isoDate: string): string {
  return period === 'daily' ? isoDate : isoWeek(isoDate)
}

/**
 * Consecutive periods with a check-in, counted back from today's period.
 * An unchecked current period doesn't break the streak until it is over:
 * at 9 am, yesterday's run still counts.
 */
export function computeStreak(period: HabitPeriod, checkinDates: string[], today: string): number {
  const done = new Set(checkinDates.map((d) => periodOf(period, d)))
  const step = (d: string) => (period === 'daily' ? addDays(d, -1) : addDays(mondayOf(d), -7))
  let cursor = done.has(periodOf(period, today)) ? today : step(today)
  let streak = 0
  while (done.has(periodOf(period, cursor))) {
    streak++
    cursor = step(cursor)
  }
  return streak
}

/** The milestone a check-in just reached, if any (only on the way up). */
export function milestoneReached(before: number, after: number): number | null {
  return STREAK_MILESTONES.find((m) => before < m && after >= m) ?? null
}
