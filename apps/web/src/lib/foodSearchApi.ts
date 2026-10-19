import {
  EMPTY_NUTRIENTS,
  type FoodRecord,
  type LoggedItem,
  type MealSlot,
  type Nutrients,
} from '@sproutine/food/client'

export type PickSource = FoodRecord['source']

/** What the search sheet needs about a food, from a search result or a past log. */
export interface PickedFood {
  source: PickSource
  sourceId: string
  name: string
  nameDe: string | null
  brand: string | null
  per100g: Nutrients
  servingG: number | null
  /** Recent foods only: when and in which meal it was last logged. */
  lastSlot?: MealSlot
  lastAt?: string
}

const SOURCES: PickSource[] = ['bls', 'off', 'usda', 'user']

export function pickFromRecord(f: FoodRecord): PickedFood {
  return {
    source: f.source,
    sourceId: f.sourceId,
    name: f.name,
    nameDe: f.nameDe,
    brand: f.brand,
    per100g: f.per100g,
    servingG: f.servingG,
  }
}

export async function searchFoods(q: string, signal?: AbortSignal): Promise<PickedFood[]> {
  const res = await fetch(`/api/food/search?q=${encodeURIComponent(q)}`, { signal })
  if (res.status === 429) throw new Error('rate-limited')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const { foods } = (await res.json()) as { foods: FoodRecord[] }
  return foods.map(pickFromRecord)
}

/** Distinct foods from the last 30 days of logs, most recent first. */
export async function fetchRecentFoods(limit = 8): Promise<PickedFood[]> {
  const res = await fetch('/api/meals/recent?days=30')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const { meals } = (await res.json()) as {
    meals: Record<string, { eaten_at: string; meal_slot: MealSlot; items: LoggedItem[] }[]>
  }
  const logs = Object.values(meals)
    .flat()
    .sort((a, b) => b.eaten_at.localeCompare(a.eaten_at))
  const seen = new Set<string>()
  const out: PickedFood[] = []
  for (const log of logs) {
    for (const item of log.items ?? []) {
      const key = `${item.source}:${item.sourceId}`
      // Seeded or legacy items without a real source can't be re-logged.
      if (seen.has(key) || !SOURCES.includes(item.source) || !(item.grams > 0)) continue
      seen.add(key)
      const per100g = { ...EMPTY_NUTRIENTS }
      for (const k of Object.keys(per100g) as (keyof Nutrients)[]) {
        const v = item.nutrients?.[k]
        per100g[k] = v == null ? null : (v / item.grams) * 100
      }
      out.push({
        source: item.source,
        sourceId: item.sourceId,
        name: item.name,
        nameDe: null,
        brand: item.brand,
        per100g,
        servingG: null,
        lastSlot: log.meal_slot,
        lastAt: log.eaten_at,
      })
      if (out.length >= limit) return out
    }
  }
  return out
}

/** Logs one food. The server looks the food up again and computes the nutrients. */
export async function logPickedFood(
  food: PickedFood,
  grams: number,
  slot: MealSlot
): Promise<boolean> {
  const res = await fetch('/api/meals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slot,
      source: 'search',
      items: [{ source: food.source, sourceId: food.sourceId, grams: Math.round(grams) }],
      eatenAt: new Date().toISOString(),
    }),
  })
  return res.ok
}
