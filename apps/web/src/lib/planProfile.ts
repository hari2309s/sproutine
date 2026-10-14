import type { Profile } from '@sproutine/types'
import type { PlanProfile } from '@sproutine/food'

/** The parts of a profile the planner uses. */
export function toPlanProfile(profile: Profile): PlanProfile {
  return {
    diet: profile.diet,
    allergies: profile.allergies,
    dislikes: profile.dislikes,
    budgetWeeklyCents: profile.budgetWeeklyCents,
  }
}

/** A Monday no more than a week back or two weeks ahead, as YYYY-MM-DD. */
export function isPlannableWeek(weekStart: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return false
  const d = new Date(`${weekStart}T00:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.getUTCDay() !== 1) return false
  const days = (d.getTime() - now.getTime()) / 86_400_000
  return days > -14 && days < 21
}
