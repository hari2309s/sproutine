import type { Allergen } from '@sproutine/types'
import type { FoodCache, FoodRecord, NutrientKey, Nutrients } from '@sproutine/food'
import type { createServerClient } from './client'

type Db = ReturnType<typeof createServerClient>

export interface FoodRow {
  source: FoodRecord['source']
  source_id: string
  barcode: string | null
  name: string
  name_de: string | null
  brand: string | null
  per_100g: Nutrients
  estimated_nutrients: NutrientKey[]
  allergens_known: boolean
  allergens: Allergen[]
  traces: Allergen[]
  serving_g: number | null
  quality: FoodRecord['quality']
}

export const FOOD_COLUMNS =
  'source, source_id, barcode, name, name_de, brand, per_100g, estimated_nutrients, allergens_known, allergens, traces, serving_g, quality'

export function rowToFood(r: FoodRow): FoodRecord {
  return {
    source: r.source,
    sourceId: r.source_id,
    barcode: r.barcode,
    name: r.name,
    nameDe: r.name_de,
    brand: r.brand,
    per100g: r.per_100g,
    estimatedNutrients: r.estimated_nutrients ?? [],
    allergensKnown: r.allergens_known === true,
    allergens: r.allergens ?? [],
    traces: r.traces ?? [],
    servingG: r.serving_g == null ? null : Number(r.serving_g),
    quality: r.quality,
  }
}

function foodToRow(f: FoodRecord): FoodRow & { fetched_at: string } {
  return {
    source: f.source,
    source_id: f.sourceId,
    barcode: f.barcode,
    name: f.name.slice(0, 300),
    name_de: f.nameDe,
    brand: f.brand,
    per_100g: f.per100g,
    estimated_nutrients: f.estimatedNutrients,
    allergens_known: f.allergensKnown,
    allergens: f.allergens,
    traces: f.traces,
    serving_g: f.servingG,
    quality: f.quality,
    fetched_at: new Date().toISOString(),
  }
}

/**
 * The `foods` table as a FoodCache. Uses the service-role client: only the
 * server writes foods. `userId` lets search include that user's own
 * corrected entries (others' stay private).
 */
export function createFoodCache(db: Db, userId?: string): FoodCache {
  return {
    async findByBarcode(barcode) {
      const { data, error } = await db
        .from('foods')
        .select(FOOD_COLUMNS)
        .eq('barcode', barcode)
        .neq('source', 'user')
        .limit(1)
        .maybeSingle()
      if (error) throw new Error(`foods.findByBarcode: ${error.message}`)
      return data ? rowToFood(data as FoodRow) : null
    },

    async search(query, limit) {
      const { data, error } = await db.rpc('search_foods', {
        p_query: query,
        p_limit: limit,
        p_user: userId ?? null,
      })
      if (error) throw new Error(`foods.search: ${error.message}`)
      return ((data ?? []) as FoodRow[]).map(rowToFood)
    },

    async upsert(foods) {
      // User entries are created through their own route, never via the cache.
      const rows = foods.filter((f) => f.source !== 'user').map(foodToRow)
      if (!rows.length) return
      const { error } = await db.from('foods').upsert(rows, { onConflict: 'source,source_id' })
      if (error) throw new Error(`foods.upsert: ${error.message}`)
    },
  }
}
