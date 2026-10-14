import type { FoodRecord, MealLogRecord, MealSlot, MealSource } from '@sproutine/food'
import { rowToFood, FOOD_COLUMNS, type FoodRow } from './foodCache'
import type { createServerClient } from './client'

type Db = ReturnType<typeof createServerClient>

export interface FoodKey {
  source: FoodRecord['source']
  sourceId: string
}

const keyOf = (k: FoodKey) => `${k.source}:${k.sourceId}`

/**
 * Loads foods by (source, sourceId) for a user: public OFF/USDA rows plus that
 * user's own entries. Returns a map keyed `source:sourceId`; missing keys are
 * foods that don't exist or that the user may not see.
 */
export async function getFoodsByKeys(
  db: Db,
  keys: FoodKey[],
  userId: string
): Promise<Map<string, FoodRecord>> {
  const found = new Map<string, FoodRecord>()
  const bySource = new Map<FoodKey['source'], string[]>()
  for (const k of keys) bySource.set(k.source, [...(bySource.get(k.source) ?? []), k.sourceId])
  for (const [source, ids] of bySource) {
    let query = db.from('foods').select(FOOD_COLUMNS).eq('source', source).in('source_id', ids)
    // The service role bypasses RLS, so scope user entries here.
    if (source === 'user') query = query.eq('created_by', userId)
    const { data, error } = await query
    if (error) throw new Error(`foods.getByKeys: ${error.message}`)
    for (const row of (data ?? []) as FoodRow[]) {
      const food = rowToFood(row)
      found.set(keyOf(food), food)
    }
  }
  return found
}

export { keyOf as foodKey }

export async function insertMealLog(
  db: Db,
  log: MealLogRecord & {
    userId: string
    slot: MealSlot
    source: MealSource
    eatenAt: Date
    isEstimate: boolean
    traceId: string | null
  }
): Promise<string> {
  const { data, error } = await db
    .from('meal_logs')
    .insert({
      user_id: log.userId,
      eaten_at: log.eatenAt.toISOString(),
      meal_slot: log.slot,
      items: log.items,
      totals: log.totals,
      partial: log.partial,
      source: log.source,
      is_estimate: log.isEstimate,
      trace_id: log.traceId,
    })
    .select('id')
    .single()
  if (error) throw new Error(`meal_logs.insert: ${error.message}`)
  return data.id as string
}
