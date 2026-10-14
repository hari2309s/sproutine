import type { MealPlan, PlanPreferences, PlanSlot } from '@sproutine/food'
import type { createServerClient } from './client'

type Db = ReturnType<typeof createServerClient>

export interface StoredPlan {
  id: string
  plan: MealPlan
  prefs: PlanPreferences
}

/** The active plan for a person's week, if there is one. */
export async function getActivePlan(
  db: Db,
  userId: string,
  weekStart: string
): Promise<StoredPlan | null> {
  const { data, error } = await db
    .from('meal_plans')
    .select('id, plan, prefs')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw new Error(`meal_plans.get: ${error.message}`)
  return data
    ? { id: data.id as string, plan: data.plan as MealPlan, prefs: data.prefs as PlanPreferences }
    : null
}

/** Stores a new active plan for the week, archiving the previous one. */
export async function saveActivePlan(
  db: Db,
  userId: string,
  plan: MealPlan,
  prefs: PlanPreferences
): Promise<string> {
  const { error: archiveError } = await db
    .from('meal_plans')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('week_start', plan.weekStart)
    .eq('status', 'active')
  if (archiveError) throw new Error(`meal_plans.archive: ${archiveError.message}`)
  const { data, error } = await db
    .from('meal_plans')
    .insert({ user_id: userId, week_start: plan.weekStart, plan, prefs })
    .select('id')
    .single()
  if (error) throw new Error(`meal_plans.insert: ${error.message}`)
  return data.id as string
}

/** Replaces a plan's meals after a swap and records what changed. */
export async function updatePlanMeals(
  db: Db,
  userId: string,
  planId: string,
  plan: MealPlan,
  diff: { date: string; slot: PlanSlot; from: string | null; to: string }
): Promise<void> {
  const { data, error } = await db
    .from('meal_plans')
    .update({ plan, updated_at: new Date().toISOString() })
    .eq('id', planId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .select('id')
  if (error) throw new Error(`meal_plans.update: ${error.message}`)
  if (!data?.length) throw new Error('meal_plans.update: no active plan')
  const { error: logError } = await db
    .from('plan_adjustments')
    .insert({ plan_id: planId, user_id: userId, reason: 'swap', diff })
  if (logError) console.warn('[plan_adjustments] insert failed:', logError.message)
}

/** Loads a plan by id, scoped to its owner (the service role bypasses RLS). */
export async function getPlanById(
  db: Db,
  userId: string,
  planId: string
): Promise<StoredPlan | null> {
  const { data, error } = await db
    .from('meal_plans')
    .select('id, plan, prefs')
    .eq('id', planId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw new Error(`meal_plans.getById: ${error.message}`)
  return data
    ? { id: data.id as string, plan: data.plan as MealPlan, prefs: data.prefs as PlanPreferences }
    : null
}
