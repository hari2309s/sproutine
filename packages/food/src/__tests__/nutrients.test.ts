import { describe, it, expect } from 'vitest'
import {
  assessQuality,
  computeNutrients,
  kcalFromMacros,
  roundForDisplay,
  scaleNutrients,
} from '../nutrients'
import type { FoodRecord, Nutrients } from '../types'

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
const food = (name: string, n: Partial<Nutrients>): FoodRecord => ({
  source: 'off',
  sourceId: name,
  barcode: null,
  name,
  nameDe: null,
  brand: null,
  per100g: per100g(n),
  estimatedNutrients: [],
  allergens: [],
  traces: [],
  servingG: null,
  quality: 'ok',
})

describe('scaleNutrients', () => {
  it('scales per-100 g values to the portion and keeps unknowns null', () => {
    expect(scaleNutrients(per100g({ kcal: 200, protein: 10 }), 50)).toMatchObject({
      kcal: 100,
      protein: 5,
      fat: null,
    })
  })
  it('rejects negative or non-finite portions', () => {
    expect(() => scaleNutrients(per100g({}), -1)).toThrow()
    expect(() => scaleNutrients(per100g({}), NaN)).toThrow()
  })
})

describe('computeNutrients', () => {
  const bread = food('Vollkornbrot', {
    kcal: 200,
    protein: 7,
    fat: 1.5,
    carbs: 38,
    fiber: 8,
    sugar: 3,
    salt: 1.1,
  })
  const cheese = food('Gouda', { kcal: 356, protein: 25, fat: 27, carbs: 0, sugar: 0, salt: 1.8 })

  it('sums items in code from unrounded values', () => {
    const { items, totals } = computeNutrients([
      { food: bread, grams: 90 },
      { food: cheese, grams: 30 },
    ])
    expect(items[0]!.nutrients.kcal).toBeCloseTo(180)
    expect(items[1]!.nutrients.kcal).toBeCloseTo(106.8)
    expect(totals.kcal).toBeCloseTo(286.8)
    expect(totals.protein).toBeCloseTo(6.3 + 7.5)
  })

  it('marks nutrients only some items know as partial', () => {
    const { totals, partial } = computeNutrients([
      { food: bread, grams: 90 },
      { food: cheese, grams: 30 },
    ])
    expect(partial).toEqual(['fiber'])
    expect(totals.fiber).toBeCloseTo(7.2)
  })

  it('returns null totals for an empty meal', () => {
    expect(computeNutrients([]).totals.kcal).toBeNull()
  })
})

describe('roundForDisplay', () => {
  it('handles values JavaScript prints in exponent form', () => {
    expect(roundForDisplay(per100g({ salt: 5e-7, kcal: 1e21 }))).toMatchObject({ salt: 0, kcal: 1e21 })
  })

  it('rounds kcal to whole, grams to one decimal, salt to two', () => {
    expect(roundForDisplay(per100g({ kcal: 286.8, protein: 13.84, salt: 1.035 }))).toMatchObject({
      kcal: 287,
      protein: 13.8,
      salt: 1.04,
    })
  })
})

describe('quality check', () => {
  it('uses EU factors (4/4/9, fibre 2)', () => {
    // Ritter Sport Marzipan label: 496 kcal; OFF computes 491.4 from these macros.
    expect(kcalFromMacros(per100g({ protein: 7, carbs: 52, fat: 27, fiber: 6.2 }))).toBeCloseTo(
      491.4
    )
  })
  it('accepts label kcal close to the macros', () => {
    expect(assessQuality(per100g({ kcal: 496, protein: 7, carbs: 52, fat: 27, fiber: 6.2 }))).toBe(
      'ok'
    )
  })
  it('flags kJ entered as kcal', () => {
    expect(assessQuality(per100g({ kcal: 2069, protein: 7, carbs: 52, fat: 27 }))).toBe(
      'inconsistent'
    )
  })
  it('tolerates small absolute gaps on low-energy foods', () => {
    expect(assessQuality(per100g({ kcal: 20, protein: 1, carbs: 2, fat: 0 }))).toBe('ok')
  })
  it('reports incomplete data', () => {
    expect(assessQuality(per100g({ kcal: 100 }))).toBe('incomplete')
  })
})
