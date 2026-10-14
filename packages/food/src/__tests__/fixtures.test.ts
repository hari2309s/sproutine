import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { normalizeOffProduct } from '../off'
import { normalizeUsdaFood } from '../usda'
import { NUTRIENT_KEYS, type Nutrients } from '../types'

// Phase 1 exit criterion: looked-up nutrients match the source within ±2%.
// Expected values are read straight from the recorded raw responses here,
// independently of the normalisers under test. Re-record with
// `pnpm --filter @sproutine/food fixtures:record`.

const DIR = resolve(import.meta.dirname, '../../fixtures')
const load = (sub: string) =>
  readdirSync(resolve(DIR, sub))
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ file: f, data: JSON.parse(readFileSync(resolve(DIR, sub, f), 'utf8')) }))

function expectWithin2pct(actual: Nutrients, expected: Partial<Nutrients>, label: string) {
  for (const key of NUTRIENT_KEYS) {
    const want = expected[key]
    if (want == null) continue
    const got = actual[key]
    expect(got, `${label} ${key}`).not.toBeNull()
    // ±2%, with a small absolute floor for near-zero values (0.04 g salt etc.)
    expect(Math.abs(got! - want), `${label} ${key}: ${got} vs ${want}`).toBeLessThanOrEqual(
      Math.max(Math.abs(want) * 0.02, 0.05)
    )
  }
}

const OFF_IDS = {
  kcal: 'energy-kcal',
  protein: 'proteins',
  fat: 'fat',
  carbs: 'carbohydrates',
  fiber: 'fiber',
  sugar: 'sugars',
  salt: 'salt',
} as const

describe('Open Food Facts fixture (German packaged foods)', () => {
  const products = load('off')

  it('has 15 recorded products', () => {
    expect(products.length).toBe(15)
  })

  it.each(products.map((p) => [p.file, p.data] as const))('%s matches the label', (file, raw) => {
    const food = normalizeOffProduct(raw)
    expect(food, file).not.toBeNull()
    const agg = raw.nutrition.aggregated_set.nutrients as Record<
      string,
      { value: number; source_per?: string }
    >
    const expected: Partial<Nutrients> = {}
    for (const key of NUTRIENT_KEYS) {
      const entry = agg[OFF_IDS[key]]
      if (entry && (entry.source_per ?? '100g').startsWith('100')) expected[key] = entry.value
    }
    expectWithin2pct(food!.per100g, expected, `${file} ${food!.name}`)
    expect(food!.barcode).toBe(raw.code)
  })
})

describe('USDA fixture (generic foods)', () => {
  const foods = load('usda')

  it('has recorded foods', () => {
    // 15 once recorded with a USDA_API_KEY; DEMO_KEY allowed only 9.
    expect(foods.length).toBeGreaterThanOrEqual(9)
  })

  it.each(foods.map((f) => [f.file, f.data] as const))('%s matches FDC', (file, raw) => {
    const food = normalizeUsdaFood(raw)
    const byId = new Map<number, number>(
      raw.foodNutrients.map((n: { nutrientId: number; value: number }) => [n.nutrientId, n.value])
    )
    const kcal = byId.get(1008) ?? byId.get(2047) ?? byId.get(2048)
    const sodium = byId.get(1093)
    expectWithin2pct(
      food.per100g,
      {
        kcal,
        protein: byId.get(1003),
        fat: byId.get(1004),
        // EU convention: carbs exclude fibre (FDC's 1005 includes it).
        carbs: byId.has(1005) ? Math.max(0, byId.get(1005)! - (byId.get(1079) ?? 0)) : undefined,
        fiber: byId.get(1079),
        sugar: byId.get(2000) ?? byId.get(1063),
        salt: sodium != null ? (sodium * 2.5) / 1000 : undefined,
      },
      `${file} ${food.name}`
    )
  })
})
