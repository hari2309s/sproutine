import { NUTRIENT_KEYS, type FoodItem, type ItemNutrients, type Nutrients } from './types'

// "Model reasons, database supplies numbers": every nutrient figure the app
// shows comes from these functions, never from an LLM.

export const EMPTY_NUTRIENTS: Nutrients = {
  kcal: null,
  protein: null,
  fat: null,
  carbs: null,
  fiber: null,
  sugar: null,
  salt: null,
}

/** Scales per-100 g values to a portion. Unknown stays unknown. */
export function scaleNutrients(per100g: Nutrients, grams: number): Nutrients {
  if (!Number.isFinite(grams) || grams < 0) throw new Error(`Invalid portion: ${grams} g`)
  const factor = grams / 100
  const out = { ...EMPTY_NUTRIENTS }
  for (const key of NUTRIENT_KEYS) {
    const v = per100g[key]
    out[key] = v == null ? null : v * factor
  }
  return out
}

/**
 * Per-item and total nutrients for a meal. Totals are summed from unrounded
 * item values; a total is null only if no item knows that nutrient, and
 * `partial` lists nutrients that some (not all) items were missing, so the UI
 * can say "at least".
 */
export function computeNutrients(items: FoodItem[]): {
  items: ItemNutrients[]
  totals: Nutrients
  partial: (keyof Nutrients)[]
} {
  const perItem = items.map(({ food, grams }) => ({
    food,
    grams,
    nutrients: scaleNutrients(food.per100g, grams),
  }))
  const totals = { ...EMPTY_NUTRIENTS }
  const partial: (keyof Nutrients)[] = []
  for (const key of NUTRIENT_KEYS) {
    const known = perItem.map((i) => i.nutrients[key]).filter((v): v is number => v != null)
    totals[key] = known.length ? known.reduce((a, b) => a + b, 0) : null
    if (known.length > 0 && known.length < perItem.length) partial.push(key)
  }
  return { items: perItem, totals, partial }
}

/** Display rounding: whole kcal, one decimal for grams, two for salt. */
export function roundForDisplay(n: Nutrients): Nutrients {
  // Round half up on the decimal value: 1.035 is stored as 1.03499…, so a
  // plain Math.round(v * 100) would show 1.03.
  const r = (v: number | null, dp: number) => {
    if (v == null) return null
    // Tiny values print in exponent form ("5e-7"), which the shift can't parse.
    if (String(v).includes('e')) return Math.round(v * 10 ** dp) / 10 ** dp
    return Number(`${Math.round(Number(`${v}e${dp}`))}e-${dp}`)
  }
  return {
    kcal: r(n.kcal, 0),
    protein: r(n.protein, 1),
    fat: r(n.fat, 1),
    carbs: r(n.carbs, 1),
    fiber: r(n.fiber, 1),
    sugar: r(n.sugar, 1),
    salt: r(n.salt, 2),
  }
}

// EU Regulation 1169/2011 Annex XIV conversion factors (kcal per gram).
const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9, fiber: 2, alcohol: 7, polyols: 2.4 } as const

/** Energy sources outside the core label set, used only by the quality check. */
export interface ExtraEnergy {
  /** Grams of alcohol per 100 g (OFF gives % vol; ~0.789 g per % vol). */
  alcoholG?: number | null
  polyolsG?: number | null
}
const QUALITY_TOLERANCE = 0.15

/** Energy implied by the macros, using the factors EU labels are built from. */
export function kcalFromMacros(n: Nutrients, extra: ExtraEnergy = {}): number | null {
  if (n.protein == null || n.carbs == null || n.fat == null) return null
  return (
    n.protein * KCAL_PER_G.protein +
    n.carbs * KCAL_PER_G.carbs +
    n.fat * KCAL_PER_G.fat +
    (n.fiber ?? 0) * KCAL_PER_G.fiber +
    (extra.alcoholG ?? 0) * KCAL_PER_G.alcohol +
    (extra.polyolsG ?? 0) * KCAL_PER_G.polyols
  )
}

/**
 * Flags source data whose stated kcal disagrees with its macros by more than
 * 15% (typos, kJ entered as kcal, per-serving values in per-100 g fields).
 * Small absolute differences on low-energy foods are tolerated.
 */
export function assessQuality(
  n: Nutrients,
  extra: ExtraEnergy = {}
): 'ok' | 'inconsistent' | 'incomplete' {
  if (n.kcal == null || n.protein == null || n.carbs == null || n.fat == null) return 'incomplete'
  // Alcohol (7 kcal/g) and polyols (2.4) carry energy beer, wine and
  // sugar-free products would otherwise be flagged for.
  const implied = kcalFromMacros(n, extra)!
  const diff = Math.abs(n.kcal - implied)
  if (diff <= 15) return 'ok'
  return diff / Math.max(n.kcal, implied) <= QUALITY_TOLERANCE ? 'ok' : 'inconsistent'
}
