import { assessQuality, EMPTY_NUTRIENTS } from './nutrients'
import { RateLimitedError } from './rateLimit'
import type { FoodRecord, Nutrients } from './types'

// USDA FoodData Central — generic, unbranded foods (oats, apples, lentils)
// that OFF covers poorly. Public domain (CC0); credited in the app footer.
// Docs: https://fdc.nal.usda.gov/api-guide/ (checked 2026-10-14)

const BASE = 'https://api.nal.usda.gov/fdc/v1'

// Generic foods only; Branded duplicates what OFF does better for Germany.
const DATA_TYPES = ['Foundation', 'SR Legacy', 'Survey (FNDDS)']

// FDC nutrient ids. Foundation foods report energy as Atwater kcal (2047 /
// 2048) instead of 1008, so check all three in order.
const ID = {
  kcal: [1008, 2047, 2048],
  kj: 1062,
  protein: 1003,
  fat: 1004,
  carbs: 1005,
  fiber: 1079,
  sugar: [2000, 1063],
  sodiumMg: 1093,
} as const

interface FdcNutrient {
  nutrientId?: number
  value?: number
  amount?: number
  nutrient?: { id?: number }
}

interface FdcFood {
  fdcId: number
  description: string
  dataType?: string
  foodNutrients?: FdcNutrient[]
}

/** Free key from https://api.data.gov/signup (1,000 requests/hour). */
function apiKey(): string | null {
  // No DEMO_KEY fallback: in practice it allows ~10 requests before a
  // half-day block, which would fail silently in production.
  return process.env.USDA_API_KEY?.trim() || null
}

export function isUsdaConfigured(): boolean {
  return apiKey() != null
}

/** Search and detail endpoints shape nutrients differently; read both. */
function nutrientMap(food: FdcFood): Map<number, number> {
  const map = new Map<number, number>()
  for (const n of food.foodNutrients ?? []) {
    const id = n.nutrientId ?? n.nutrient?.id
    const value = n.value ?? n.amount
    if (id != null && typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      map.set(id, value)
    }
  }
  return map
}

export function normalizeUsdaFood(food: FdcFood): FoodRecord {
  const m = nutrientMap(food)
  const first = (ids: readonly number[]) => ids.map((id) => m.get(id)).find((v) => v != null) ?? null
  const per100g: Nutrients = { ...EMPTY_NUTRIENTS }
  per100g.kcal = first(ID.kcal)
  if (per100g.kcal == null && m.has(ID.kj)) per100g.kcal = m.get(ID.kj)! / 4.184
  per100g.protein = m.get(ID.protein) ?? null
  per100g.fat = m.get(ID.fat) ?? null
  per100g.carbs = m.get(ID.carbs) ?? null
  per100g.fiber = m.get(ID.fiber) ?? null
  per100g.sugar = first(ID.sugar)
  // FDC reports sodium in mg; EU labels use salt in g (salt = sodium × 2.5).
  per100g.salt = m.has(ID.sodiumMg) ? (m.get(ID.sodiumMg)! * 2.5) / 1000 : null

  return {
    source: 'usda',
    sourceId: String(food.fdcId),
    barcode: null,
    name: food.description,
    nameDe: null,
    brand: null,
    per100g,
    estimatedNutrients: [],
    // FDC generic foods carry no allergen declarations.
    allergens: [],
    traces: [],
    servingG: null,
    quality: assessQuality(per100g),
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const key = apiKey()
  if (!key) throw new RateLimitedError('usda (USDA_API_KEY not set)')
  // Key in a header (api.data.gov supports X-Api-Key) so it never lands in URLs/logs.
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...(init?.headers as Record<string, string>), 'X-Api-Key': key },
    signal: AbortSignal.timeout(8000),
  })
  if (res.status === 429) throw new RateLimitedError('usda')
  if (!res.ok) throw new Error(`USDA ${path.split('?')[0]}: HTTP ${res.status}`)
  return (await res.json()) as T
}

export async function searchUsda(query: string, limit = 10): Promise<FoodRecord[]> {
  const q = query.trim()
  if (!q) return []
  const body = await call<{ foods?: FdcFood[] }>('/foods/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, dataType: DATA_TYPES, pageSize: limit }),
  })
  return (body.foods ?? []).map(normalizeUsdaFood)
}

export async function fetchUsdaFood(fdcId: string): Promise<FoodRecord | null> {
  if (!/^\d+$/.test(fdcId)) throw new Error(`Invalid fdcId: ${fdcId}`)
  try {
    return normalizeUsdaFood(await call<FdcFood>(`/food/${fdcId}`))
  } catch (e) {
    if ((e as Error).message.includes('HTTP 404')) return null
    throw e
  }
}
