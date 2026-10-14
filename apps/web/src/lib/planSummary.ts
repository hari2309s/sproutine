import {
  buildShoppingList,
  PLAN_SLOTS,
  RECIPES_BY_ID,
  type MealPlan,
  type PlanIssue,
} from '@sproutine/food/client'

/** What the chat card shows for a new plan: dinners by day and the estimate. */
export interface MealPlanSummary {
  weekStart: string
  /** The plan is for next week (affects the card's title). */
  nextWeek: boolean
  /** An existing plan shown as-is rather than a new one. */
  existing?: boolean
  /** This week's wishes ruled out too much, so the plan ignores them. */
  droppedWishes?: boolean
  dinners: { date: string; name: string }[]
  totalCents: number
  issues: PlanIssue[]
}

export function summarisePlan(
  plan: MealPlan,
  issues: PlanIssue[],
  nextWeek: boolean,
  existing = false
): MealPlanSummary {
  const ids = plan.days.flatMap((d) =>
    PLAN_SLOTS.map((s) => d.meals[s]).filter((id): id is string => !!id)
  )
  return {
    weekStart: plan.weekStart,
    nextWeek,
    dinners: plan.days
      .filter((d) => d.meals.dinner)
      .map((d) => ({
        date: d.date,
        name: RECIPES_BY_ID[d.meals.dinner!]?.name ?? d.meals.dinner!,
      })),
    totalCents: buildShoppingList(ids).totalCents,
    issues,
    ...(existing ? { existing: true } : {}),
  }
}

/** Which week "plan my week" means, by Berlin weekday: Fri–Sun plan next week. */
export function weekToPlan(now = new Date()): {
  weekStart: string
  fromDate?: string
  nextWeek: boolean
} {
  const today = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })
  const d = new Date(`${today}T00:00:00Z`)
  const weekday = (d.getUTCDay() + 6) % 7 // Monday = 0
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() - weekday)
  if (weekday >= 4) {
    monday.setUTCDate(monday.getUTCDate() + 7)
    return { weekStart: monday.toISOString().slice(0, 10), nextWeek: true }
  }
  return { weekStart: monday.toISOString().slice(0, 10), fromDate: today, nextWeek: false }
}
