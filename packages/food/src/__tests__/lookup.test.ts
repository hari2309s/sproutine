import { describe, it, expect, vi } from 'vitest'
import { allergensFromOffTags } from '../allergens'
import { escapeLucene, isValidBarcode, normalizeOffProduct } from '../off'
import { estimatePortion } from '../portions'
import { createRateLimiter, RateLimitedError } from '../rateLimit'
import { lookupBarcode, rankFood, searchFood, type FoodCache } from '../search'
import type { FoodRecord } from '../types'

const record = (name: string, extra: Partial<FoodRecord> = {}): FoodRecord => ({
  source: 'off',
  sourceId: name,
  barcode: null,
  name,
  nameDe: null,
  brand: null,
  per100g: { kcal: 100, protein: 5, fat: 2, carbs: 14, fiber: 1, sugar: 1, salt: 0.1 },
  estimatedNutrients: [],
  allergens: [],
  traces: [],
  servingG: null,
  quality: 'ok',
  ...extra,
})

function memoryCache(initial: FoodRecord[] = []): FoodCache & { stored: FoodRecord[] } {
  const stored = [...initial]
  return {
    stored,
    findByBarcode: async (b) => stored.find((f) => f.barcode === b) ?? null,
    search: async (q) => stored.filter((f) => f.name.toLowerCase().includes(q.toLowerCase())),
    upsert: async (foods) => void stored.push(...foods),
  }
}

describe('allergens', () => {
  it('maps OFF tags to EU-14 codes and ignores the rest', () => {
    expect(
      allergensFromOffTags([
        'en:milk',
        'en:sesame-seeds',
        'en:sulphur-dioxide-and-sulphites',
        'en:kiwi',
        'en:milk',
      ])
    ).toEqual(['milk', 'sesame', 'sulphites'])
  })
})

describe('normalizeOffProduct', () => {
  it('reads legacy nutriments, derives kcal from kJ and salt from sodium', () => {
    const food = normalizeOffProduct({
      code: '4000000000000',
      product_name: 'Test',
      nutriments: {
        'energy-kj_100g': 418.4,
        proteins_100g: 5,
        fat_100g: 1,
        carbohydrates_100g: 14,
        sodium_100g: 0.4,
      },
      allergens_tags: ['en:gluten'],
      traces_tags: ['en:nuts'],
    })!
    expect(food.per100g.kcal).toBeCloseTo(100)
    expect(food.per100g.salt).toBeCloseTo(1)
    expect(food.allergens).toEqual(['gluten'])
    expect(food.traces).toEqual(['nuts'])
  })

  it('flags nutrients the source estimated', () => {
    const food = normalizeOffProduct({
      code: '4000000000000',
      product_name: 'Test',
      nutrition: {
        aggregated_set: {
          nutrients: {
            'energy-kcal': { value: 100, source: 'packaging', source_per: '100g' },
            fiber: { value: 2, source: 'estimate', source_per: '100g' },
          },
        },
      },
    })!
    expect(food.estimatedNutrients).toEqual(['fiber'])
  })

  it('rejects products with no name or barcode', () => {
    expect(normalizeOffProduct({ code: '4000000000000' })).toBeNull()
  })
})

describe('input handling', () => {
  it('validates barcodes', () => {
    expect(isValidBarcode('4000417025005')).toBe(true)
    expect(isValidBarcode('40897677')).toBe(true)
    expect(isValidBarcode('12345')).toBe(false)
    expect(isValidBarcode('40004170250ab')).toBe(false)
  })
  it('escapes Lucene syntax in user text', () => {
    expect(escapeLucene('käse AND (gouda)')).toBe('käse AND \\(gouda\\)')
    expect(escapeLucene('a:b "c"')).toBe('a\\:b \\"c\\"')
  })
})

describe('estimatePortion', () => {
  it('is exact for grams and ml', () => {
    expect(estimatePortion('Haferflocken', 60, 'g')).toEqual({
      grams: 60,
      basis: 'exact',
      confidence: 'high',
    })
  })
  it('uses food-specific units (German and English names)', () => {
    expect(estimatePortion('Vollkornbrot', 2, 'slice')).toMatchObject({
      grams: 90,
      basis: 'food-unit',
    })
    expect(estimatePortion('rye bread', 2, 'slice').grams).toBe(90)
    expect(estimatePortion('Brezel', 1).grams).toBe(85)
  })
  it('matches whole words only (no "brot" inside "Vollkornbrot" confusion)', () => {
    expect(estimatePortion('Toastbrot', 2, 'slice').grams).toBe(50)
  })
  it('falls back to household measures at low confidence', () => {
    expect(estimatePortion('mystery stew of things', 1, 'tbsp')).toMatchObject({
      grams: 15,
      confidence: 'low',
    })
  })
  it('rejects nonsense quantities', () => {
    expect(() => estimatePortion('apple', 0)).toThrow()
  })
})

describe('rate limiter', () => {
  it('allows N per minute, then frees slots as the window slides', () => {
    let t = 0
    const rl = createRateLimiter(2, () => t)
    expect(rl.tryAcquire()).toBe(true)
    expect(rl.tryAcquire()).toBe(true)
    expect(rl.tryAcquire()).toBe(false)
    t = 60_000
    expect(rl.tryAcquire()).toBe(true)
  })
})

describe('searchFood', () => {
  it('answers from the cache alone when it has enough good matches', async () => {
    const cache = memoryCache([
      record('Haferflocken'),
      record('Haferflocken zart'),
      record('Haferflocken kernig'),
    ])
    const sources = { searchOff: vi.fn(), searchUsda: vi.fn(), fetchOffProduct: vi.fn() }
    const res = await searchFood('haferflocken', cache, { sources })
    expect(res.foods).toHaveLength(3)
    expect(sources.searchOff).not.toHaveBeenCalled()
  })

  it('falls through to OFF and USDA, caches results, and survives a rate-limited source', async () => {
    const cache = memoryCache()
    const sources = {
      searchOff: vi.fn().mockRejectedValue(new RateLimitedError('openfoodfacts-search')),
      searchUsda: vi.fn().mockResolvedValue([record('Lentils, cooked', { source: 'usda' })]),
      fetchOffProduct: vi.fn(),
    }
    const res = await searchFood('lentils', cache, { sources })
    expect(res.sources).toEqual({ cache: 0, off: 'skipped', usda: 1 })
    expect(res.foods[0]!.name).toBe('Lentils, cooked')
    expect(cache.stored).toHaveLength(1)
  })

  it('ranks exact names above partial ones and penalises inconsistent data', () => {
    expect(rankFood(record('Quark'), 'quark')).toBeGreaterThan(
      rankFood(record('Quarkkeulchen'), 'quark')
    )
    expect(rankFood(record('Quark'), 'quark')).toBeGreaterThan(
      rankFood(record('Quark', { quality: 'inconsistent' }), 'quark')
    )
  })
})

describe('lookupBarcode', () => {
  it('serves from cache, otherwise fetches from OFF and caches', async () => {
    const cache = memoryCache()
    const fetchOffProduct = vi
      .fn()
      .mockResolvedValue(record('Nutella', { barcode: '4008400404127' }))
    expect((await lookupBarcode('4008400404127', cache, { fetchOffProduct }))?.name).toBe('Nutella')
    expect((await lookupBarcode('4008400404127', cache, { fetchOffProduct }))?.name).toBe('Nutella')
    expect(fetchOffProduct).toHaveBeenCalledTimes(1)
  })
  it('ignores invalid barcodes without calling OFF', async () => {
    const fetchOffProduct = vi.fn()
    expect(await lookupBarcode('abc', memoryCache(), { fetchOffProduct })).toBeNull()
    expect(fetchOffProduct).not.toHaveBeenCalled()
  })
})
