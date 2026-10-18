import type { SupabaseClient } from '@supabase/supabase-js'

export const TZ = 'Europe/Berlin'

/** Today's date (YYYY-MM-DD) in Berlin, which is the demo profile's timezone. */
export function berlinToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** ISO timestamp on `date` at a UTC hour. Hours 5–20 UTC stay on the same Berlin day. */
export function at(date: string, hourUtc: number, minute = 0): string {
  const h = String(Math.floor(hourUtc)).padStart(2, '0')
  const m = String(minute + Math.round((hourUtc % 1) * 60)).padStart(2, '0')
  return `${date}T${h}:${m}:00.000Z`
}

export function mondayOf(date: string): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

/** Same month arithmetic as packages/db/src/onThisDay.ts, so the anchors line up. */
export function subtractMonths(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const target = new Date(Date.UTC(y, m - 1 - n, 1))
  const maxDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(d, maxDay))
  return target.toISOString().slice(0, 10)
}

/** Deterministic PRNG so the demo looks the same after every nightly reset. */
export function rng(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Food = [name: string, grams: number, kcal: number, protein: number, fat: number, carbs: number]

export function item([name, grams, kcal, protein, fat, carbs]: Food) {
  return {
    source: 'demo',
    sourceId: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    grams,
    nutrients: { kcal, protein, fat, carbs, fiber: null, sugar: null, salt: null },
  }
}

export type MealItem = ReturnType<typeof item>

export function totals(items: MealItem[]) {
  return items.reduce(
    (acc, i) => ({
      ...acc,
      kcal: acc.kcal + i.nutrients.kcal,
      protein: acc.protein + i.nutrients.protein,
      fat: acc.fat + i.nutrients.fat,
      carbs: acc.carbs + i.nutrients.carbs,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: null, sugar: null, salt: null }
  )
}

export async function insertChunks(
  db: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  size = 500
): Promise<void> {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await db.from(table).insert(rows.slice(i, i + size))
    if (error) console.warn(`  ⚠ ${table}: ${error.message}`)
  }
}
