/**
 * Imports the BLS 4.0 Excel file into the `foods` table.
 *
 * Prerequisites:
 *   1. Download BLS_4_0_2025_DE.zip from https://blsdb.de/download
 *   2. Extract the .xlsx file into data/bls/ at the repo root
 *   3. Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY in .env.local
 *   4. Optionally set GEMINI_API_KEY for embedding generation
 *
 * Run:
 *   pnpm --filter @sproutine/food bls:import
 *
 * The script is idempotent: it upserts on (source, source_id).
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

// Load .env.local from project root (no dotenv dependency)
const envPath = resolve(import.meta.dirname, '../../../.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
import * as XLSX from 'xlsx'
import { assessQuality, kcalFromMacros } from '../src/nutrients'
import type { Nutrients } from '../src/types'
import { FOOD_PORTIONS } from '../src/portions'

// ── Config ──────────────────────────────────────────────────────────────────

const DATA_DIR = resolve(import.meta.dirname, '../../../data/bls')
const BATCH_SIZE = 200
const EMBED_BATCH_SIZE = 50
const EMBED_DELAY_MS = 1200 // Gemini free tier: ~60 req/min

const BLS_VERSION = '4.0'
const BLS_LICENSE = 'CC BY 4.0'
const BLS_ATTRIBUTION =
  'Max Rubner-Institut (2025): Bundeslebensmittelschluessel (BLS), Version 4.0. DOI: 10.25826/Data20251217-134202-0'

// ── Find the BLS file ───────────────────────────────────────────────────────

function findBlsFile(): string {
  // Try common file names
  const candidates = [
    'BLS_4_0_Daten_2025_DE.xlsx',
    'BLS_4_0_2025_DE.xlsx',
  ]
  for (const name of candidates) {
    const p = resolve(DATA_DIR, name)
    if (existsSync(p)) return p
  }
  // Fallback: first .xlsx in the directory
  if (!existsSync(DATA_DIR)) {
    throw new Error(`BLS data directory not found: ${DATA_DIR}\nDownload from https://blsdb.de/download and extract into data/bls/`)
  }
  const files = readdirSync(DATA_DIR).filter((f) => typeof f === 'string' && f.endsWith('.xlsx'))
  if (!files.length) {
    throw new Error(`No .xlsx files found in ${DATA_DIR}`)
  }
  return resolve(DATA_DIR, files[0]!)
}

// ── Column discovery ────────────────────────────────────────────────────────

/** BLS has 418 columns. We need to find nutrient columns by header name. */
interface BlsRow {
  code: string
  nameDe: string
  nameEn: string
  kcal: number | null
  kj: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
  fiber: number | null
  sugar: number | null
  salt: number | null
  sodium: number | null
}

/**
 * Discover column indices from the header row. BLS headers are in German;
 * we match by known patterns. The nutrient columns have 3 sub-columns each:
 * value, origin code, reference — we only need the value (first of the triple).
 */
function discoverColumns(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {}
  const lower = headers.map((h) => (h ?? '').toString().toLowerCase().trim())

  // Identifier columns (first 3)
  const codePatterns = ['bls-code', 'bls code', 'code', 'schlüssel', 'schluessel']
  const nameDePatterns = ['lebensmittelbezeichnung', 'bezeichnung deutsch', 'name deutsch', 'deutscher name']
  const nameEnPatterns = ['food name', 'name english', 'englischer name', 'english name']

  for (let i = 0; i < lower.length; i++) {
    const h = lower[i]!
    if (!map.code && codePatterns.some((p) => h.includes(p))) map.code = i
    if (!map.nameDe && nameDePatterns.some((p) => h.includes(p))) map.nameDe = i
    if (!map.nameEn && nameEnPatterns.some((p) => h.includes(p))) map.nameEn = i
  }

  // Nutrient value columns — match by BLS header patterns.
  // BLS headers look like "ENERCC Energie (Kilokalorien) [kcal/100g]".
  // We match on the unit/descriptor part, and only take value columns
  // (those ending in a unit like [g/100g], [kcal/100g], etc.), not
  // the "Datenherkunft" or "Referenz" columns that follow each value.
  const isValueCol = (h: string) => h.includes('[') && h.includes('/100g]')
  const nutrientPatterns: [string, string[]][] = [
    ['kcal', ['kilokalorien', 'kcal']],
    ['kj', ['kilojoule', 'kj']],
    ['protein', ['protein']],
    ['fat', ['fett']],
    ['carbs', ['kohlenhydrate, verfügbar', 'kohlenhydrate verfügbar', 'kohlenhydrate']],
    ['fiber', ['ballaststoffe']],
    ['sugar', ['zucker (mono-', 'zucker, gesamt', 'sugar']],
    ['salt', ['salz (natriumchlorid)', 'nacl salz']],
    ['sodium', ['natrium [mg', 'na natrium']],
  ]

  for (const [key, patterns] of nutrientPatterns) {
    for (let i = 0; i < lower.length; i++) {
      const h = lower[i]!
      if (!isValueCol(h)) continue
      if (patterns.some((p) => h.includes(p))) {
        // Take only the first match per nutrient
        if (!map[key]) map[key] = i
      }
    }
  }

  // If column discovery by name fails, fall back to known positions:
  // Col 0: code, Col 1: German name, Col 2: English name
  if (map.code == null) map.code = 0
  if (map.nameDe == null) map.nameDe = 1
  if (map.nameEn == null) map.nameEn = 2

  return map
}

// ── Portion matching ────────────────────────────────────────────────────────

function defaultPortionForName(name: string): number | null {
  const text = name.toLowerCase()
  for (const p of FOOD_PORTIONS) {
    if (p.match.some((kw) => text.includes(kw))) return p.default
  }
  return null
}

// ── Supabase client ─────────────────────────────────────────────────────────

function createDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local')
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// ── Embedding helper ────────────────────────────────────────────────────────

async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini embed error: ${await res.text()}`)
  const json = (await res.json()) as { embedding: { values: number[] } }
  return json.embedding?.values ?? []
}

// ── Parsing ─────────────────────────────────────────────────────────────────

function parseNumeric(val: unknown): number | null {
  if (val == null || val === '' || val === '-' || val === 'n.b.' || val === 'Sp.') return null
  const n = Number(val)
  return Number.isFinite(n) ? n : null
}

function parseRow(row: unknown[], cols: Record<string, number>): BlsRow | null {
  const code = String(row[cols.code!] ?? '').trim()
  const nameDe = String(row[cols.nameDe!] ?? '').trim()
  const nameEn = String(row[cols.nameEn!] ?? '').trim()
  if (!code || !nameDe) return null

  return {
    code,
    nameDe,
    nameEn: nameEn || nameDe,
    kcal: cols.kcal != null ? parseNumeric(row[cols.kcal]) : null,
    kj: cols.kj != null ? parseNumeric(row[cols.kj]) : null,
    protein: cols.protein != null ? parseNumeric(row[cols.protein]) : null,
    fat: cols.fat != null ? parseNumeric(row[cols.fat]) : null,
    carbs: cols.carbs != null ? parseNumeric(row[cols.carbs]) : null,
    fiber: cols.fiber != null ? parseNumeric(row[cols.fiber]) : null,
    sugar: cols.sugar != null ? parseNumeric(row[cols.sugar]) : null,
    salt: cols.salt != null ? parseNumeric(row[cols.salt]) : null,
    sodium: cols.sodium != null ? parseNumeric(row[cols.sodium]) : null,
  }
}

function toNutrients(r: BlsRow): Nutrients {
  // Prefer kcal; if only kJ is available, convert (1 kcal = 4.184 kJ)
  let kcal = r.kcal
  if (kcal == null && r.kj != null) {
    kcal = Math.round((r.kj / 4.184) * 10) / 10
  }

  // BLS should provide salt directly; fall back to sodium * 2.5 if needed.
  // Note: BLS sodium is in mg/100g, so convert to g first.
  let salt = r.salt
  if (salt == null && r.sodium != null) {
    const sodiumG = r.sodium / 1000
    salt = Math.round(sodiumG * 2.5 * 100) / 100
  }

  return {
    kcal,
    protein: r.protein,
    fat: r.fat,
    carbs: r.carbs,
    fiber: r.fiber,
    sugar: r.sugar,
    salt,
  }
}

// ── BLS food group from code prefix ─────────────────────────────────────────

function foodGroupFromCode(code: string): string {
  // BLS codes start with a letter indicating the food group
  const prefix = code.charAt(0).toUpperCase()
  const groups: Record<string, string> = {
    A: 'Cereals & cereal products',
    B: 'Vegetables & vegetable products',
    C: 'Fruits & fruit products',
    D: 'Nuts & seeds',
    E: 'Milk & dairy products',
    F: 'Eggs & egg products',
    G: 'Meat & meat products',
    H: 'Fish & fish products',
    I: 'Fats & oils',
    J: 'Beverages',
    K: 'Alcoholic beverages',
    L: 'Spices & condiments',
    M: 'Sugars & sweets',
    N: 'Soups & sauces',
    P: 'Prepared dishes',
    Q: 'Infant & toddler foods',
    R: 'Diet products',
    S: 'Fast food & snacks',
    T: 'Mixed dishes',
    U: 'Supplements',
    V: 'Other',
  }
  return groups[prefix] ?? 'Unknown'
}

// ── Main ────────────────────────────────────────────────────────────────────

interface ImportStats {
  read: number
  upserted: number
  updated: number
  flagged: number
  skipped: number
  embedded: number
  flaggedByGroup: Record<string, number>
}

async function main() {
  const args = process.argv.slice(2)
  const skipEmbed = args.includes('--skip-embed')
  const dryRun = args.includes('--dry-run')

  console.log('=== BLS 4.0 Import ===')
  console.log(`Data dir: ${DATA_DIR}`)

  const filePath = findBlsFile()
  console.log(`File: ${filePath}`)

  // Read the Excel file
  const wb = XLSX.read(readFileSync(filePath), { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]!]!
  const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  if (rawData.length < 2) throw new Error('Excel file appears empty')

  const headers = (rawData[0] as string[]).map((h) => String(h ?? ''))
  console.log(`Columns: ${headers.length}`)
  console.log(`Rows (incl. header): ${rawData.length}`)

  const cols = discoverColumns(headers)
  console.log('Discovered columns:', Object.entries(cols).map(([k, v]) => `${k}=${v} (${headers[v]})`).join(', '))

  // Check we found critical columns
  if (cols.kcal == null && cols.kj == null) {
    console.warn('WARNING: Neither kcal nor kJ column found. Energy will be null for all rows.')
  }
  if (cols.protein == null) console.warn('WARNING: Protein column not found.')
  if (cols.fat == null) console.warn('WARNING: Fat column not found.')
  if (cols.carbs == null) console.warn('WARNING: Carbohydrate column not found.')

  const stats: ImportStats = {
    read: 0,
    upserted: 0,
    updated: 0,
    flagged: 0,
    skipped: 0,
    embedded: 0,
    flaggedByGroup: {},
  }

  const db = dryRun ? null : createDb()
  const batch: Record<string, unknown>[] = []
  const embedQueue: { code: string; text: string }[] = []

  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i] as unknown[]
    const parsed = parseRow(row, cols)
    if (!parsed) {
      stats.skipped++
      continue
    }
    stats.read++

    const nutrients = toNutrients(parsed)
    const quality = assessQuality(nutrients)
    // BLS 'inconsistent' is escalated to 'flagged': reference data with a
    // kcal/macro mismatch is excluded from search, unlike OFF/USDA where
    // 'inconsistent' still appears with a lower rank.
    const isFlagged = quality === 'inconsistent'

    if (isFlagged) {
      stats.flagged++
      const group = foodGroupFromCode(parsed.code)
      stats.flaggedByGroup[group] = (stats.flaggedByGroup[group] ?? 0) + 1
    }

    const portion = defaultPortionForName(parsed.nameDe) ?? defaultPortionForName(parsed.nameEn)

    const dbRow = {
      source: 'bls',
      source_id: parsed.code,
      barcode: null,
      name: parsed.nameEn || parsed.nameDe,
      name_de: parsed.nameDe,
      brand: null,
      per_100g: nutrients,
      estimated_nutrients: [] as string[],
      allergens_known: false,
      allergens: [] as string[],
      traces: [] as string[],
      serving_g: portion,
      quality: isFlagged ? 'flagged' : quality,
      source_version: BLS_VERSION,
      license: BLS_LICENSE,
      attribution: BLS_ATTRIBUTION,
      fetched_at: new Date().toISOString(),
    }

    batch.push(dbRow)
    embedQueue.push({
      code: parsed.code,
      text: `${parsed.nameDe} / ${parsed.nameEn}`,
    })

    if (batch.length >= BATCH_SIZE) {
      if (db) {
        const { error, count } = await db
          .from('foods')
          .upsert(batch, { onConflict: 'source,source_id', count: 'exact' })
        if (error) throw new Error(`Upsert failed at row ${i}: ${error.message}`)
        stats.upserted += count ?? batch.length
      } else {
        stats.upserted += batch.length
      }
      process.stdout.write(`\r  Upserted ${stats.upserted} rows...`)
      batch.length = 0
    }
  }

  // Flush remaining batch
  if (batch.length > 0) {
    if (db) {
      const { error, count } = await db
        .from('foods')
        .upsert(batch, { onConflict: 'source,source_id', count: 'exact' })
      if (error) throw new Error(`Upsert failed (final batch): ${error.message}`)
      stats.upserted += count ?? batch.length
    } else {
      stats.upserted += batch.length
    }
  }

  console.log(`\n  Rows read: ${stats.read}`)
  console.log(`  Upserted:  ${stats.upserted}`)
  console.log(`  Flagged:   ${stats.flagged}`)
  console.log(`  Skipped:   ${stats.skipped}`)

  if (Object.keys(stats.flaggedByGroup).length > 0) {
    console.log('\n  Flagged by food group:')
    for (const [group, count] of Object.entries(stats.flaggedByGroup).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${group}: ${count}`)
    }
  }

  // ── Embeddings ──────────────────────────────────────────────────────────
  if (!skipEmbed && process.env.GEMINI_API_KEY && db) {
    console.log(`\n  Generating embeddings for ${embedQueue.length} foods...`)
    for (let i = 0; i < embedQueue.length; i += EMBED_BATCH_SIZE) {
      const chunk = embedQueue.slice(i, i + EMBED_BATCH_SIZE)
      for (const item of chunk) {
        try {
          const embedding = await embedText(item.text)
          if (embedding.length === 768) {
            await db
              .from('foods')
              .update({ embedding: JSON.stringify(embedding) })
              .eq('source', 'bls')
              .eq('source_id', item.code)
            stats.embedded++
          }
        } catch (e) {
          console.warn(`    Embed failed for ${item.code}: ${(e as Error).message}`)
        }
      }
      process.stdout.write(`\r  Embedded ${stats.embedded} / ${embedQueue.length}...`)
      // Respect Gemini free-tier rate limits
      if (i + EMBED_BATCH_SIZE < embedQueue.length) {
        await new Promise((r) => setTimeout(r, EMBED_DELAY_MS))
      }
    }
    console.log(`\n  Embeddings generated: ${stats.embedded}`)
  } else if (skipEmbed) {
    console.log('\n  Embeddings skipped (--skip-embed)')
  } else if (!process.env.GEMINI_API_KEY) {
    console.log('\n  Embeddings skipped (GEMINI_API_KEY not set)')
  }

  console.log('\n=== Import complete ===')
  if (dryRun) console.log('  (dry run — no data written)')
}

main().catch((e) => {
  console.error('Import failed:', e)
  process.exit(1)
})
