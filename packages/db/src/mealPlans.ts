import type { MealPlan, PlanPreferences, PlanSlot } from '@sproutine/food'
import type { createServerClient } from './client'

type Db = ReturnType<typeof createServerClient>

export interface StoredPlan {
  id: string
  plan: MealPlan
  prefs: PlanPreferences
  /** Version for optimistic updates: a swap only applies to this version. */
  updatedAt: string
}

/** Someone else changed the plan first (another tab, a double tap). */
export class PlanConflictError extends Error {
  constructor() {
    super('meal plan changed since it was read')
    this.name = 'PlanConflictError'
  }
}

const PLAN_COLUMNS = 'id, plan, prefs, updated_at'
const toStored = (d: Record<string, unknown>): StoredPlan => ({
  id: d.id as string,
  plan: d.plan as MealPlan,
  prefs: d.prefs as PlanPreferences,
  updatedAt: d.updated_at as string,
})

/** The active plan for a person's week, if there is one. */
export async function getActivePlan(
  db: Db,
  userId: string,
  weekStart: string
): Promise<StoredPlan | null> {
  const { data, error } = await db
    .from('meal_plans')
    .select(PLAN_COLUMNS)
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw new Error(`meal_plans.get: ${error.message}`)
  return data ? toStored(data) : null
}

/**
 * Stores a new active plan for the week, archiving the previous one in the
 * same transaction (save_active_plan), so a failed save keeps the old plan.
 */
export async function saveActivePlan(
  db: Db,
  userId: string,
  plan: MealPlan,
  prefs: PlanPreferences
): Promise<string> {
  const { data, error } = await db.rpc('save_active_plan', {
    p_user: userId,
    p_week: plan.weekStart,
    p_plan: plan,
    p_prefs: prefs,
  })
  if (error) throw new Error(`meal_plans.save: ${error.message}`)
  return data as string
}

/** Replaces a plan's meals after a swap and records what changed. */
export async function updatePlanMeals(
  db: Db,
  userId: string,
  planId: string,
  plan: MealPlan,
  diff: { date: string; slot: PlanSlot; from: string | null; to: string },
  expectedUpdatedAt: string
): Promise<void> {
  // Applies only if nobody changed the plan since it was read; otherwise the
  // earlier swap would be silently overwritten.
  const { data, error } = await db
    .from('meal_plans')
    .update({ plan, updated_at: new Date().toISOString() })
    .eq('id', planId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('updated_at', expectedUpdatedAt)
    .select('id')
  if (error) throw new Error(`meal_plans.update: ${error.message}`)
  if (!data?.length) throw new PlanConflictError()
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
    .select(PLAN_COLUMNS)
    .eq('id', planId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw new Error(`meal_plans.getById: ${error.message}`)
  return data ? toStored(data) : null
}
