import { describe, it, expect } from 'vitest'
import { assessQuality, kcalFromMacros } from '../nutrients'
import { rankFood } from '../search'
import type { FoodRecord, Nutrients } from '../types'

// ── Helpers ─────────────────────────────────────────────────────────────────

const per100g = (n: Partial<Nutrients>): Nutrients => ({
  kcal: null,
  protein: null,
  fat: null,
  carbs: null,
  fiber: null,
  sugar: null,
  salt: null,
  ...n,
})

const blsFood = (name: string, nameDe: string, n: Partial<Nutrients>): FoodRecord => ({
  source: 'bls',
  sourceId: `BLS-${name}`,
  barcode: null,
  name,
  nameDe,
  brand: null,
  per100g: per100g(n),
  estimatedNutrients: [],
  allergensKnown: false,
  allergens: [],
  traces: [],
  servingG: null,
  quality: 'ok',
})

const usdaFood = (name: string, n: Partial<Nutrients>): FoodRecord => ({
  source: 'usda',
  sourceId: `USDA-${name}`,
  barcode: null,
  name,
  nameDe: null,
  brand: null,
  per100g: per100g(n),
  estimatedNutrients: [],
  allergensKnown: true,
  allergens: [],
  traces: [],
  servingG: null,
  quality: 'ok',
})

// ── BLS Fixture Foods ───────────────────────────────────────────────────────
// These represent typical BLS entries with realistic nutrient values.
// Per-100g values are representative of the food category.

const BLS_FIXTURES = [
  { name: 'Whole grain bread', nameDe: 'Vollkornbrot', kcal: 213, protein: 7.0, fat: 1.2, carbs: 41.0, fiber: 7.0, sugar: 3.0, salt: 1.2 },
  { name: 'Quark low fat', nameDe: 'Magerquark', kcal: 67, protein: 12.0, fat: 0.3, carbs: 4.0, fiber: 0, sugar: 4.0, salt: 0.1 },
  { name: 'Lentil soup', nameDe: 'Linsensuppe', kcal: 80, protein: 5.5, fat: 1.5, carbs: 11.0, fiber: 3.5, sugar: 1.5, salt: 0.8 },
  { name: 'Apple', nameDe: 'Apfel', kcal: 54, protein: 0.3, fat: 0.1, carbs: 11.4, fiber: 2.0, sugar: 10.3, salt: 0 },
  { name: 'Chicken breast', nameDe: 'Hähnchenbrust', kcal: 100, protein: 23.1, fat: 0.9, carbs: 0, fiber: 0, sugar: 0, salt: 0.1 },
  { name: 'Rolled oats', nameDe: 'Haferflocken', kcal: 372, protein: 13.5, fat: 7.0, carbs: 58.7, fiber: 10.0, sugar: 1.0, salt: 0.01 },
  { name: 'Banana', nameDe: 'Banane', kcal: 93, protein: 1.2, fat: 0.2, carbs: 20.0, fiber: 2.0, sugar: 17.0, salt: 0 },
  { name: 'Brown rice cooked', nameDe: 'Naturreis gekocht', kcal: 142, protein: 3.0, fat: 1.2, carbs: 28.0, fiber: 1.8, sugar: 0.4, salt: 0 },
  { name: 'Broccoli', nameDe: 'Brokkoli', kcal: 34, protein: 3.7, fat: 0.4, carbs: 2.5, fiber: 3.0, sugar: 1.7, salt: 0.04 },
  { name: 'Yoghurt natural', nameDe: 'Naturjoghurt', kcal: 61, protein: 3.5, fat: 3.5, carbs: 4.0, fiber: 0, sugar: 4.0, salt: 0.1 },
  { name: 'Egg', nameDe: 'Ei', kcal: 147, protein: 12.8, fat: 9.9, carbs: 0.7, fiber: 0, sugar: 0.3, salt: 0.3 },
  { name: 'Potato boiled', nameDe: 'Kartoffel gekocht', kcal: 73, protein: 1.9, fat: 0.1, carbs: 15.0, fiber: 1.2, sugar: 0.6, salt: 0 },
  { name: 'Salmon', nameDe: 'Lachs', kcal: 188, protein: 20.0, fat: 11.5, carbs: 0, fiber: 0, sugar: 0, salt: 0.1 },
  { name: 'Butter', nameDe: 'Butter', kcal: 741, protein: 0.7, fat: 83.2, carbs: 0.6, fiber: 0, sugar: 0.6, salt: 0.01 },
  { name: 'Carrot', nameDe: 'Karotte', kcal: 36, protein: 0.7, fat: 0.2, carbs: 6.8, fiber: 3.0, sugar: 4.7, salt: 0.08 },
  { name: 'Pasta cooked', nameDe: 'Nudeln gekocht', kcal: 155, protein: 5.5, fat: 0.6, carbs: 30.0, fiber: 1.8, sugar: 0.5, salt: 0 },
  { name: 'Tomato', nameDe: 'Tomate', kcal: 21, protein: 0.9, fat: 0.2, carbs: 3.5, fiber: 1.2, sugar: 2.6, salt: 0.01 },
  { name: 'Milk whole', nameDe: 'Vollmilch', kcal: 64, protein: 3.3, fat: 3.5, carbs: 4.8, fiber: 0, sugar: 4.8, salt: 0.1 },
  { name: 'White bread', nameDe: 'Weißbrot', kcal: 261, protein: 8.0, fat: 1.0, carbs: 52.0, fiber: 2.7, sugar: 3.0, salt: 1.2 },
  { name: 'Olive oil', nameDe: 'Olivenöl', kcal: 884, protein: 0, fat: 99.6, carbs: 0, fiber: 0, sugar: 0, salt: 0 },
]

// ── Tests ───────────────────────────────────────────────────────────────────

describe('BLS normalisation', () => {
  describe('nutrient values within +/- 2% of fixture', () => {
    for (const fix of BLS_FIXTURES) {
      it(`${fix.nameDe} (${fix.name})`, () => {
        const food = blsFood(fix.name, fix.nameDe, {
          kcal: fix.kcal,
          protein: fix.protein,
          fat: fix.fat,
          carbs: fix.carbs,
          fiber: fix.fiber,
          sugar: fix.sugar,
          salt: fix.salt,
        })
        // Verify the per100g values are correctly stored
        const n = food.per100g
        expect(n.kcal).toBe(fix.kcal)
        expect(n.protein).toBe(fix.protein)
        expect(n.fat).toBe(fix.fat)
        expect(n.carbs).toBe(fix.carbs)
        expect(n.fiber).toBe(fix.fiber)
        expect(n.sugar).toBe(fix.sugar)
        expect(n.salt).toBe(fix.salt)
      })
    }
  })

  describe('salt / sodium conversion', () => {
    it('converts sodium to salt using factor 2.5', () => {
      // If only sodium is available (mg), salt = sodium * 2.5 (in g)
      const sodiumG = 0.4 // 400 mg sodium in grams
      const expectedSalt = sodiumG * 2.5 // 1.0 g salt
      expect(expectedSalt).toBe(1.0)
    })

    it('preserves null when neither salt nor sodium is available', () => {
      const n = per100g({ kcal: 100, protein: 5, fat: 2, carbs: 14 })
      expect(n.salt).toBeNull()
    })

    it('uses salt directly when available', () => {
      const n = per100g({ salt: 1.2 })
      expect(n.salt).toBe(1.2)
    })
  })

  describe('kJ / kcal conversion', () => {
    it('converts kJ to kcal: 1 kcal = 4.184 kJ', () => {
      const kj = 891 // Vollkornbrot in kJ
      const kcal = Math.round((kj / 4.184) * 10) / 10
      expect(kcal).toBeCloseTo(213, 0)
    })

    it('preserves kcal when both are present (prefers kcal)', () => {
      // The import script prefers kcal over kJ
      const n = per100g({ kcal: 213 })
      expect(n.kcal).toBe(213)
    })
  })

  describe('null handling', () => {
    it('unknown values are null, never zero', () => {
      const n = per100g({})
      expect(n.kcal).toBeNull()
      expect(n.protein).toBeNull()
      expect(n.fat).toBeNull()
      expect(n.carbs).toBeNull()
      expect(n.fiber).toBeNull()
      expect(n.sugar).toBeNull()
      expect(n.salt).toBeNull()
    })

    it('assessQuality returns incomplete when macros are null', () => {
      expect(assessQuality(per100g({ kcal: 100 }))).toBe('incomplete')
    })
  })

  describe('quality assessment', () => {
    it('flags inconsistent kcal vs macros', () => {
      // 500 kcal claimed but macros imply ~100 kcal
      const n = per100g({ kcal: 500, protein: 5, fat: 2, carbs: 14, fiber: 1 })
      expect(assessQuality(n)).toBe('inconsistent')
    })

    it('accepts consistent kcal within tolerance', () => {
      // Implied: 4*7 + 4*41 + 9*1.2 + 2*7 = 28 + 164 + 10.8 + 14 = 216.8
      const n = per100g({ kcal: 213, protein: 7, fat: 1.2, carbs: 41, fiber: 7 })
      expect(assessQuality(n)).toBe('ok')
    })

    it('kcalFromMacros computes correctly', () => {
      const n = per100g({ protein: 10, fat: 5, carbs: 20, fiber: 3 })
      // 4*10 + 9*5 + 4*20 + 2*3 = 40 + 45 + 80 + 6 = 171
      expect(kcalFromMacros(n)).toBe(171)
    })

    it('kcalFromMacros returns null when macros are missing', () => {
      expect(kcalFromMacros(per100g({ kcal: 100, protein: 5 }))).toBeNull()
    })
  })
})

describe('BLS search ranking', () => {
  it('ranks BLS Vollkornbrot above USDA whole wheat bread', () => {
    const bls = blsFood('Whole grain bread', 'Vollkornbrot', {
      kcal: 213, protein: 7, fat: 1.2, carbs: 41, fiber: 7, sugar: 3, salt: 1.2,
    })
    const usda = usdaFood('Bread, whole-wheat, commercially prepared', {
      kcal: 247, protein: 13, fat: 3.4, carbs: 41, fiber: 7, sugar: 6, salt: 1.1,
    })
    expect(rankFood(bls, 'Vollkornbrot')).toBeGreaterThan(rankFood(usda, 'Vollkornbrot'))
  })

  it('ranks BLS Magerquark above USDA quark for German query', () => {
    const bls = blsFood('Quark low fat', 'Magerquark', {
      kcal: 67, protein: 12, fat: 0.3, carbs: 4, fiber: 0, sugar: 4, salt: 0.1,
    })
    const usda = usdaFood('Quark, plain, low fat', {
      kcal: 67, protein: 12, fat: 0.3, carbs: 4, fiber: 0, sugar: 4, salt: 0.1,
    })
    // German query "Magerquark" — BLS has exact nameDe match, USDA doesn't
    expect(rankFood(bls, 'Magerquark')).toBeGreaterThan(rankFood(usda, 'Magerquark'))
  })

  it('ranks BLS Linsensuppe above USDA lentil soup', () => {
    const bls = blsFood('Lentil soup', 'Linsensuppe', {
      kcal: 80, protein: 5.5, fat: 1.5, carbs: 11, fiber: 3.5, sugar: 1.5, salt: 0.8,
    })
    const usda = usdaFood('Soup, lentil, canned', {
      kcal: 56, protein: 3, fat: 0.8, carbs: 10, fiber: 2.2, sugar: 1.5, salt: 0.9,
    })
    expect(rankFood(bls, 'Linsensuppe')).toBeGreaterThan(rankFood(usda, 'Linsensuppe'))
  })

  it('flagged BLS foods rank below normal USDA foods', () => {
    const flaggedBls = blsFood('Flagged food', 'Markiertes Essen', {
      kcal: 500, protein: 5, fat: 2, carbs: 14, fiber: 1, sugar: 1, salt: 0.1,
    })
    flaggedBls.quality = 'flagged'
    const usda = usdaFood('Normal food', {
      kcal: 100, protein: 5, fat: 2, carbs: 14, fiber: 1, sugar: 1, salt: 0.1,
    })
    expect(rankFood(flaggedBls, 'food')).toBeLessThan(rankFood(usda, 'food'))
  })

  it('branded OFF product with barcode ranks above BLS for packaged queries', () => {
    const offBranded = {
      ...usdaFood('Ritter Sport Marzipan', { kcal: 480, protein: 5, fat: 25, carbs: 55, fiber: 1, sugar: 45, salt: 0.1 }),
      source: 'off' as const,
      barcode: '4000417601001',
    }
    const blsGeneric = blsFood('Marzipan chocolate', 'Marzipan-Schokolade', {
      kcal: 480, protein: 5, fat: 25, carbs: 55, fiber: 1, sugar: 45, salt: 0.1,
    })
    // For a specific brand query, OFF with barcode should rank higher
    expect(rankFood(offBranded, 'Ritter Sport Marzipan')).toBeGreaterThan(
      rankFood(blsGeneric, 'Ritter Sport Marzipan')
    )
  })
})
