import type { Allergen } from '@sproutine/types'

/** Core label nutrients, always per 100 g (or 100 ml for drinks). null = unknown. */
export interface Nutrients {
  kcal: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
  fiber: number | null
  sugar: number | null
  /** Salt in grams (EU labels use salt, not sodium). */
  salt: number | null
}

export const NUTRIENT_KEYS = ['kcal', 'protein', 'fat', 'carbs', 'fiber', 'sugar', 'salt'] as const
export type NutrientKey = (typeof NUTRIENT_KEYS)[number]

export type FoodSource = 'off' | 'usda' | 'user'

/**
 * A food normalised from any source. This is the shape stored in the `foods`
 * cache table and the only shape the rest of the app sees.
 */
export interface FoodRecord {
  source: FoodSource
  /** Barcode for OFF, fdcId for USDA, row id for user entries. */
  sourceId: string
  barcode: string | null
  name: string
  nameDe: string | null
  brand: string | null
  per100g: Nutrients
  /** Nutrients whose value was estimated by the source rather than read from a label. */
  estimatedNutrients: NutrientKey[]
  /**
   * Whether the source actually analysed allergens. When false, an empty
   * `allergens` list means "unknown", not "none" — callers must treat the
   * food as unsafe for anyone with allergies.
   */
  allergensKnown: boolean
  /** Allergens the food contains (EU-14 codes). Only meaningful if allergensKnown. */
  allergens: Allergen[]
  /** "May contain traces of" — kept separate so plans can treat them strictly. */
  traces: Allergen[]
  /** Pack-declared serving size in grams, when the source has one. */
  servingG: number | null
  /** Set when kcal disagrees with the macros by more than the tolerance. */
  quality: 'ok' | 'inconsistent' | 'incomplete'
}

export interface FoodItem {
  food: FoodRecord
  grams: number
}

export interface ItemNutrients {
  food: FoodRecord
  grams: number
  nutrients: Nutrients
}
