import { allergensFromOffTags } from './allergens'
import { assessQuality, EMPTY_NUTRIENTS } from './nutrients'
import { createRateLimiter, RateLimitedError } from './rateLimit'
import type { FoodRecord, NutrientKey, Nutrients } from './types'

// Open Food Facts — best coverage for German packaged food, looked up by
// barcode first. Data is ODbL; attribution is shown in the app footer.
// Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/ (checked 2026-10-14)

const PRODUCT_URL = 'https://world.openfoodfacts.org/api/v3.6/product'
// Full-text search moved to Search-a-licious; the v2 /search endpoint has no
// text search and the same 10/min limit.
const SEARCH_URL = 'https://search.openfoodfacts.org/search'

// Per-IP limits from the OFF docs: 15/min product reads, 10/min search.
// Stay a little under.
const productLimiter = createRateLimiter(12)
const searchLimiter = createRateLimiter(8)

/**
 * OFF asks every client to identify itself as "AppName/Version (contact)".
 * Set OFF_CONTACT to a project email or URL for production.
 */
function userAgent(): string {
  const contact = process.env.OFF_CONTACT?.trim() || 'contact not configured'
  return `Sproutine/0.1 (${contact})`
}

const NUTRIENT_IDS: Record<NutrientKey, string> = {
  kcal: 'energy-kcal',
  protein: 'proteins',
  fat: 'fat',
  carbs: 'carbohydrates',
  fiber: 'fiber',
  sugar: 'sugars',
  salt: 'salt',
}

type AggregatedNutrient = { value?: number; unit?: string; source?: string; source_per?: string }

interface OffProduct {
  code?: string
  product_name?: string
  product_name_de?: string
  brands?: string | string[]
  allergens_tags?: string[]
  traces_tags?: string[]
  /** Number of parsed ingredients; > 0 means allergens were analysed. */
  ingredients_n?: number
  states_tags?: string[]
  serving_quantity?: number | string
  /** v3.6 product reads. */
  nutrition?: { aggregated_set?: { nutrients?: Record<string, AggregatedNutrient> } }
  /** Legacy shape, still used by Search-a-licious hits. */
  nutriments?: Record<string, number | string | undefined>
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null
}

/** Reads per-100 g nutrients from either OFF nutrition shape. */
function readNutrients(p: OffProduct): { per100g: Nutrients; estimated: NutrientKey[] } {
  const per100g = { ...EMPTY_NUTRIENTS }
  const estimated: NutrientKey[] = []
  const agg = p.nutrition?.aggregated_set?.nutrients

  for (const key of Object.keys(NUTRIENT_IDS) as NutrientKey[]) {
    const id = NUTRIENT_IDS[key]
    const entry = agg?.[id]
    if (
      entry &&
      (entry.source_per === '100g' || entry.source_per === '100ml' || !entry.source_per)
    ) {
      per100g[key] = num(entry.value)
      if (per100g[key] != null && entry.source === 'estimate') estimated.push(key)
    } else if (p.nutriments) {
      per100g[key] = num(p.nutriments[`${id}_100g`])
    }
  }

  // Fallbacks: energy given only in kJ, sodium instead of salt.
  if (per100g.kcal == null) {
    const kj = num(agg?.['energy-kj']?.value) ?? num(p.nutriments?.['energy-kj_100g'])
    if (kj != null) per100g.kcal = kj / 4.184
  }
  if (per100g.salt == null) {
    const sodium = num(agg?.sodium?.value) ?? num(p.nutriments?.sodium_100g)
    if (sodium != null) per100g.salt = sodium * 2.5
  }
  return { per100g, estimated }
}

/** Allergens are only known once OFF has the ingredient list. */
function allergensKnown(p: OffProduct): boolean {
  return (p.ingredients_n ?? 0) > 0 || (p.states_tags ?? []).includes('en:ingredients-completed')
}

/** Alcohol and polyols, only for the kcal sanity check. */
function extraEnergy(p: OffProduct) {
  const agg = p.nutrition?.aggregated_set?.nutrients
  const alcoholVol = num(agg?.alcohol?.value) ?? num(p.nutriments?.alcohol_100g)
  return {
    // OFF stores alcohol as % vol; ethanol is ~0.789 g/ml.
    alcoholG: alcoholVol == null ? null : alcoholVol * 0.789,
    polyolsG: num(agg?.polyols?.value) ?? num(p.nutriments?.polyols_100g),
  }
}

export function normalizeOffProduct(p: OffProduct): FoodRecord | null {
  const code = p.code?.trim()
  const name = (p.product_name_de || p.product_name || '').trim()
  if (!code || !name) return null
  const { per100g, estimated } = readNutrients(p)
  const brands = Array.isArray(p.brands) ? p.brands : (p.brands ?? '').split(',')
  return {
    source: 'off',
    sourceId: code,
    // OFF has some non-standard codes; only real barcodes are stored as such.
    barcode: isValidBarcode(code) ? code : null,
    name,
    nameDe: p.product_name_de?.trim() || null,
    brand: brands.map((b) => b.trim()).filter(Boolean)[0] ?? null,
    per100g,
    estimatedNutrients: estimated,
    allergensKnown: allergensKnown(p),
    allergens: allergensFromOffTags(p.allergens_tags),
    traces: allergensFromOffTags(p.traces_tags),
    servingG: num(p.serving_quantity),
    quality: assessQuality(per100g, extraEnergy(p)),
  }
}

/** EAN-8, UPC-A (12), EAN-13 and GTIN-14. */
export function isValidBarcode(code: string): boolean {
  return /^\d{8}$|^\d{12,14}$/.test(code)
}

export async function fetchOffProduct(barcode: string): Promise<FoodRecord | null> {
  if (!isValidBarcode(barcode)) throw new Error(`Invalid barcode: ${barcode}`)
  if (!productLimiter.tryAcquire()) throw new RateLimitedError('openfoodfacts')
  const res = await fetch(`${PRODUCT_URL}/${barcode}.json`, {
    headers: { 'User-Agent': userAgent() },
    signal: AbortSignal.timeout(8000),
  })
  if (res.status === 404) return null
  if (res.status === 429 || res.status === 503) throw new RateLimitedError('openfoodfacts')
  if (!res.ok) throw new Error(`OFF product ${barcode}: HTTP ${res.status}`)
  const body = (await res.json()) as { status?: string; product?: OffProduct }
  if (body.status === 'failure' || !body.product) return null
  return normalizeOffProduct({ ...body.product, code: body.product.code ?? barcode })
}

// Lucene special characters; user text must not turn into query syntax.
const LUCENE_SPECIAL = /[+\-!(){}[\]^"~*?:\\/&|]/g

export function escapeLucene(text: string): string {
  return text.replace(LUCENE_SPECIAL, '\\$&')
}

export async function searchOff(query: string, limit = 10): Promise<FoodRecord[]> {
  const q = query.trim()
  if (!q) return []
  if (!searchLimiter.tryAcquire()) throw new RateLimitedError('openfoodfacts-search')
  const params = new URLSearchParams({
    // German market first: the app's users shop at German supermarkets.
    // Lucene's default operator is OR, so the market filter must be ANDed.
    q: `(${escapeLucene(q)}) AND countries_tags:"en:germany"`,
    langs: 'de,en',
    page_size: String(limit),
    fields:
      'code,product_name,product_name_de,brands,nutriments,allergens_tags,traces_tags,ingredients_n,states_tags,serving_quantity',
  })
  const res = await fetch(`${SEARCH_URL}?${params}`, {
    headers: { 'User-Agent': userAgent() },
    signal: AbortSignal.timeout(8000),
  })
  if (res.status === 429 || res.status === 503) throw new RateLimitedError('openfoodfacts-search')
  if (!res.ok) throw new Error(`OFF search: HTTP ${res.status}`)
  const body = (await res.json()) as { hits?: OffProduct[] }
  return (body.hits ?? []).map(normalizeOffProduct).filter((f): f is FoodRecord => f != null)
}
