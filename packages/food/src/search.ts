import { fetchOffProduct, isValidBarcode, searchOff } from './off'
import { RateLimitedError } from './rateLimit'
import { searchUsda } from './usda'
import type { FoodRecord } from './types'

/** Persistent food cache (the `foods` table). Implemented in @sproutine/db. */
export interface FoodCache {
  findByBarcode(barcode: string): Promise<FoodRecord | null>
  /** Fuzzy name match over cached foods (trigram in Postgres). */
  search(query: string, limit: number): Promise<FoodRecord[]>
  upsert(foods: FoodRecord[]): Promise<void>
}

export interface SearchSources {
  searchOff: typeof searchOff
  searchUsda: typeof searchUsda
  fetchOffProduct: typeof fetchOffProduct
}

const LIVE_SOURCES: SearchSources = { searchOff, searchUsda, fetchOffProduct }

export interface SearchResult {
  foods: FoodRecord[]
  /** Which sources answered, for tracing. Skipped = rate limited or failed. */
  sources: { cache: number; off: number | 'skipped'; usda: number | 'skipped' }
}

/** Guards for the shared external-API budget. */
export interface ExternalGuards {
  /** Return false to stay cache-only (e.g. this user's external share is used up). */
  canCallExternal?: () => boolean
  /** Barcodes OFF recently didn't know, so they aren't looked up again. */
  unknownBarcodes?: { has(code: string): boolean; add(code: string): void }
}

/** Barcode scan: cache first, then Open Food Facts; caches what it finds. */
export async function lookupBarcode(
  barcode: string,
  cache: FoodCache,
  sources: Pick<SearchSources, 'fetchOffProduct'> = LIVE_SOURCES,
  { canCallExternal = () => true, unknownBarcodes }: ExternalGuards = {}
): Promise<FoodRecord | null> {
  const code = barcode.trim()
  if (!isValidBarcode(code)) return null
  const cached = await cache.findByBarcode(code)
  if (cached) return cached
  if (unknownBarcodes?.has(code)) return null
  if (!canCallExternal()) throw new RateLimitedError('openfoodfacts (per-user)')
  const food = await sources.fetchOffProduct(code)
  if (!food) unknownBarcodes?.add(code)
  // A cache write failure must not turn a successful lookup into an error.
  if (food) {
    await cache
      .upsert([food])
      .catch((e) => console.warn('[food cache upsert]', (e as Error).message))
  }
  return food
}

const normalise = (s: string) => s.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').trim()

/** Higher is better. Name match dominates; data quality breaks ties. */
export function rankFood(food: FoodRecord, query: string): number {
  const q = normalise(query)
  const names = [food.name, food.nameDe].filter((n): n is string => !!n).map(normalise)
  let score = 0
  if (names.some((n) => n === q)) score += 100
  else if (names.some((n) => n.startsWith(q))) score += 60
  else if (names.some((n) => n.includes(q))) score += 40
  else {
    const words = q.split(/\s+/).filter(Boolean)
    const hit = words.filter((w) => names.some((n) => n.includes(w))).length
    score += words.length ? (hit / words.length) * 30 : 0
  }
  if (food.quality === 'ok') score += 10
  else if (food.quality === 'inconsistent') score -= 30
  if (food.estimatedNutrients.length === 0) score += 3
  // Shorter names are usually the generic form of what was asked for.
  score -= Math.min(names[0]?.length ?? 0, 60) / 20
  return score
}

async function trySource(fn: () => Promise<FoodRecord[]>): Promise<FoodRecord[] | 'skipped'> {
  try {
    return await fn()
  } catch (e) {
    if (!(e instanceof RateLimitedError)) console.warn('[food search]', (e as Error).message)
    return 'skipped'
  }
}

/**
 * Name search across cache → Open Food Facts (German market) → USDA (generic
 * foods). The cache answers alone when it has enough good matches, which
 * keeps the external APIs (10 searches/min on OFF) for genuinely new foods.
 */
export async function searchFood(
  query: string,
  cache: FoodCache,
  {
    limit = 8,
    sources = LIVE_SOURCES,
    canCallExternal = () => true,
  }: { limit?: number; sources?: SearchSources } & Pick<ExternalGuards, 'canCallExternal'> = {}
): Promise<SearchResult> {
  const q = query.trim().slice(0, 120)
  if (!q) return { foods: [], sources: { cache: 0, off: 0, usda: 0 } }

  const cached = await cache.search(q, limit)
  const strongCached = cached.filter((f) => rankFood(f, q) >= 40 && f.quality !== 'inconsistent')
  if (strongCached.length >= Math.min(3, limit)) {
    return {
      foods: rank(cached, q).slice(0, limit),
      sources: { cache: cached.length, off: 'skipped', usda: 'skipped' },
    }
  }

  if (!canCallExternal()) {
    return {
      foods: rank(cached, q).slice(0, limit),
      sources: { cache: cached.length, off: 'skipped', usda: 'skipped' },
    }
  }

  const [off, usda] = await Promise.all([
    trySource(() => sources.searchOff(q, limit)),
    trySource(() => sources.searchUsda(q, limit)),
  ])
  const fresh = [...(off === 'skipped' ? [] : off), ...(usda === 'skipped' ? [] : usda)]
  if (fresh.length) {
    await cache
      .upsert(fresh)
      .catch((e) => console.warn('[food cache upsert]', (e as Error).message))
  }

  const seen = new Set<string>()
  const merged = [...cached, ...fresh].filter((f) => {
    const key = `${f.source}:${f.sourceId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return {
    foods: rank(merged, q).slice(0, limit),
    sources: {
      cache: cached.length,
      off: off === 'skipped' ? 'skipped' : off.length,
      usda: usda === 'skipped' ? 'skipped' : usda.length,
    },
  }
}

function rank(foods: FoodRecord[], q: string): FoodRecord[] {
  return foods
    .map((f) => ({ f, s: rankFood(f, q) }))
    .sort((a, b) => b.s - a.s)
    .map(({ f }) => f)
}
