/**
 * Records raw API responses for the Phase 1 food fixture: the 15 most-scanned
 * German products on Open Food Facts plus 15 generic USDA foods. Tests then
 * check our normalisation against these files offline.
 *
 * Run (slow on purpose — respects OFF's 15 reads/min and USDA's DEMO_KEY):
 *   pnpm --filter @sproutine/food fixtures:record
 *
 * Set OFF_CONTACT to identify the client to OFF. USDA needs USDA_API_KEY
 * (free: https://api.data.gov/signup); without it the USDA half is skipped.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { trimOffProduct, trimUsdaFood } from './trim'

const OUT = resolve(import.meta.dirname, '../fixtures')
const UA = `Sproutine/0.1 (${process.env.OFF_CONTACT?.trim() || 'contact not configured'})`
const USDA_KEY = process.env.USDA_API_KEY?.trim()
// --only=off or --only=usda re-records one half.
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1]
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const GENERIC = [
  'oats rolled',
  'banana raw',
  'apple raw with skin',
  'lentils mature seeds cooked boiled',
  'chickpeas mature seeds cooked boiled',
  'broccoli raw',
  'brussels sprouts raw',
  'egg whole raw fresh',
  'milk whole 3.25%',
  'rice white long-grain cooked',
  'potatoes flesh and skin baked',
  'fish salmon atlantic farmed raw',
  'chicken breast meat only raw',
  'nuts almonds',
  'carrots raw',
]

async function json(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`${url.split('?')[0]} → HTTP ${res.status}`)
  return res.json()
}

async function recordOff() {
  await mkdir(resolve(OUT, 'off'), { recursive: true })
  const params = new URLSearchParams({
    // German-language products sold in Germany, not global brands that
    // happen to carry a Germany tag.
    q: 'countries_tags:"en:germany" AND lang:de AND completeness:[0.8 TO 1]',
    sort_by: '-unique_scans_n',
    page_size: '40',
    fields: 'code,product_name',
  })
  const search = (await json(`https://search.openfoodfacts.org/search?${params}`, {
    headers: { 'User-Agent': UA },
  })) as { hits: { code: string; product_name?: string }[] }

  let saved = 0
  for (const hit of search.hits) {
    if (saved >= 15) break
    if (!/^\d{8}$|^\d{13}$/.test(hit.code) || !hit.product_name?.trim()) continue
    await sleep(5000) // 12/min, under OFF's 15/min product-read limit
    const body = (await json(`https://world.openfoodfacts.org/api/v3.6/product/${hit.code}.json`, {
      headers: { 'User-Agent': UA },
    })) as { product?: Record<string, unknown> }
    const nutrients = (body.product?.nutrition as { aggregated_set?: { nutrients?: object } })
      ?.aggregated_set?.nutrients
    if (!body.product || !nutrients || !('energy-kcal' in nutrients)) continue
    await writeFile(resolve(OUT, 'off', `${hit.code}.json`), JSON.stringify(trimOffProduct(body.product), null, 2) + '\n')
    saved++
    console.log(`OFF ${saved}/15 ${hit.code} ${hit.product_name ?? ''}`)
  }
}

async function recordUsda() {
  if (!USDA_KEY) {
    console.warn('USDA_API_KEY not set — skipping USDA (get a free key at https://api.data.gov/signup)')
    return
  }
  await mkdir(resolve(OUT, 'usda'), { recursive: true })
  for (const [i, query] of GENERIC.entries()) {
    await sleep(2500)
    const body = (await json('https://api.nal.usda.gov/fdc/v1/foods/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': USDA_KEY },
      body: JSON.stringify({ query, dataType: ['Foundation', 'SR Legacy'], pageSize: 8 }),
    })) as { foods?: { fdcId: number; description: string }[] }
    // FDC relevance is loose ("oats rolled" → "Rolls, dinner, oat bran"):
    // keep the candidate whose description contains the most query words.
    const words = query.toLowerCase().split(/\s+/)
    const food = (body.foods ?? [])
      .map((f) => ({ f, hits: words.filter((w) => f.description.toLowerCase().includes(w)).length }))
      .sort((a, b) => b.hits - a.hits)[0]?.f
    if (!food) {
      console.warn(`USDA: no result for "${query}"`)
      continue
    }
    await writeFile(resolve(OUT, 'usda', `${food.fdcId}.json`), JSON.stringify(trimUsdaFood(food as Parameters<typeof trimUsdaFood>[0]), null, 2) + '\n')
    console.log(`USDA ${i + 1}/15 ${food.fdcId} ${food.description}`)
  }
}

if (ONLY !== 'usda') await recordOff()
if (ONLY !== 'off') await recordUsda()
