import { describe, it, expect } from 'vitest'
import { buildMealLog, mealSlotAt, proposeMealLog } from '../meal'
import type { FoodCache, SearchSources } from '../search'
import type { FoodRecord } from '../types'

const record = (name: string, extra: Partial<FoodRecord> = {}): FoodRecord => ({
  source: 'usda',
  sourceId: name,
  barcode: null,
  name,
  nameDe: null,
  brand: null,
  per100g: { kcal: 200, protein: 10, fat: 5, carbs: 28, fiber: 2, sugar: 3, salt: 1 },
  estimatedNutrients: [],
  allergensKnown: true,
  allergens: [],
  traces: [],
  servingG: null,
  quality: 'ok',
  ...extra,
})

const cacheOf = (foods: FoodRecord[]): FoodCache => ({
  findByBarcode: async () => null,
  search: async (q) => foods.filter((f) => f.name.toLowerCase().includes(q.toLowerCase())),
  upsert: async () => {},
})

const noExternal: SearchSources = {
  searchOff: async () => [],
  searchUsda: async () => [],
  fetchOffProduct: async () => null,
}

describe('mealSlotAt', () => {
  it('uses Berlin local time', () => {
    // 07:30 UTC in summer is 09:30 in Berlin.
    expect(mealSlotAt(new Date('2026-07-01T07:30:00Z'))).toBe('breakfast')
    expect(mealSlotAt(new Date('2026-07-01T10:30:00Z'))).toBe('lunch')
    expect(mealSlotAt(new Date('2026-07-01T17:00:00Z'))).toBe('dinner')
    expect(mealSlotAt(new Date('2026-07-01T13:30:00Z'))).toBe('snack')
    expect(mealSlotAt(new Date('2026-07-01T23:30:00Z'))).toBe('snack')
  })
})

describe('proposeMealLog', () => {
  it('matches each item and estimates its portion', async () => {
    const cache = cacheOf([record('Vollkornbrot'), record('Gouda')])
    const proposal = await proposeMealLog(
      {
        slot: 'breakfast',
        source: 'text',
        items: [{ name: 'Vollkornbrot', quantity: 2, unit: 'slice' }, { name: 'Gouda' }],
      },
      cache,
      { sources: noExternal }
    )
    expect(proposal.items.map((i) => [i.match?.name, i.grams])).toEqual([
      ['Vollkornbrot', 90],
      ['Gouda', 30],
    ])
  })

  it('never picks an inconsistent food and reports no match honestly', async () => {
    const cache = cacheOf([record('Mystery bar', { quality: 'inconsistent' })])
    const { items } = await proposeMealLog(
      { slot: 'snack', source: 'text', items: [{ name: 'Mystery bar' }, { name: 'Unicorn' }] },
      cache,
      { sources: noExternal }
    )
    expect(items.map((i) => i.match)).toEqual([null, null])
    expect(items[1]!.query).toBe('Unicorn')
  })

  it('caps the number of items and skips empty names', async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ name: i === 0 ? '  ' : `food ${i}` }))
    const { items } = await proposeMealLog(
      { slot: 'lunch', source: 'text', items: many },
      cacheOf([]),
      { sources: noExternal }
    )
    expect(items).toHaveLength(7)
  })
})

describe('buildMealLog', () => {
  it('snapshots per-item nutrients and sums totals in code', () => {
    const log = buildMealLog([
      { food: record('Bread'), grams: 50 },
      { food: record('Cheese', { per100g: { ...record('x').per100g, salt: null } }), grams: 150 },
    ])
    expect(log.items[0]).toMatchObject({ name: 'Bread', grams: 50 })
    expect(log.items[0]!.nutrients.kcal).toBe(100)
    expect(log.totals.kcal).toBe(400)
    expect(log.totals.salt).toBe(0.5)
    expect(log.partial).toEqual(['salt'])
  })
})
