import type { MealSlot, Nutrients } from '@sproutine/food'
import type { createServerClient } from './client'
import { midnightInTz } from './tzHelpers'

type Db = ReturnType<typeof createServerClient>

export interface FavouriteMeal {
  id: string
  slot: MealSlot
  items: { name: string; brand: string | null; grams: number; source: string; sourceId: string }[]
  totals: Nutrients
  eatenAt: string
}

export async function setFavourite(
  db: Db,
  userId: string,
  logId: string,
  isFavourite: boolean
): Promise<void> {
  const { error } = await db
    .from('meal_logs')
    .update({ is_favourite: isFavourite })
    .eq('id', logId)
    .eq('user_id', userId)
  if (error) throw new Error(`favourites.setFavourite: ${error.message}`)
}

export async function getFavourites(
  db: Db,
  userId: string,
  limit = 20
): Promise<FavouriteMeal[]> {
  const { data, error } = await db
    .from('meal_logs')
    .select('id, meal_slot, items, totals, eaten_at')
    .eq('user_id', userId)
    .eq('is_favourite', true)
    .order('eaten_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`favourites.getFavourites: ${error.message}`)
  return ((data ?? []) as {
    id: string
    meal_slot: MealSlot
    items: FavouriteMeal['items']
    totals: Nutrients
    eaten_at: string
  }[]).map((r) => ({
    id: r.id,
    slot: r.meal_slot,
    items: r.items,
    totals: r.totals,
    eatenAt: r.eaten_at,
  }))
}

/**
 * Returns meals logged yesterday for a given slot (for "repeat yesterday" feature).
 */
export async function getYesterdayMeals(
  db: Db,
  userId: string,
  slot: MealSlot,
  timezone: string
): Promise<FavouriteMeal[]> {
  const now = new Date()
  const todayMidnight = midnightInTz(now, timezone)
  const yesterdayMidnight = midnightInTz(new Date(now.getTime() - 86_400_000), timezone)

  const { data, error } = await db
    .from('meal_logs')
    .select('id, meal_slot, items, totals, eaten_at')
    .eq('user_id', userId)
    .eq('meal_slot', slot)
    .gte('eaten_at', yesterdayMidnight)
    .lt('eaten_at', todayMidnight)
    .order('eaten_at', { ascending: true })
  if (error) throw new Error(`favourites.getYesterdayMeals: ${error.message}`)
  return ((data ?? []) as {
    id: string
    meal_slot: MealSlot
    items: FavouriteMeal['items']
    totals: Nutrients
    eaten_at: string
  }[]).map((r) => ({
    id: r.id,
    slot: r.meal_slot,
    items: r.items,
    totals: r.totals,
    eatenAt: r.eaten_at,
  }))
}
