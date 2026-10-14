import { computeStreak, localTime, periodOf } from '@sproutine/nudges'
import type { HabitRow } from '@sproutine/db'

export interface HabitView {
  id: string
  title: string
  period: 'daily' | 'weekly'
  streak: number
  /** Checked in for the current day (daily) or week (weekly). */
  done: boolean
  /** Checked in today exactly (so a tap undoes it). */
  checkedToday: boolean
}

export function toHabitView(habit: HabitRow, today: string): HabitView {
  const current = periodOf(habit.period, today)
  return {
    id: habit.id,
    title: habit.title,
    period: habit.period,
    streak: computeStreak(habit.period, habit.checkins, today),
    done: habit.checkins.some((d) => periodOf(habit.period, d) === current),
    checkedToday: habit.checkins.includes(today),
  }
}

export const todayIn = (timeZone: string) => localTime(new Date(), timeZone).date
