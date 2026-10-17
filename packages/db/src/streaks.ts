import { createServerClient } from './client'

type Db = ReturnType<typeof createServerClient>

const MILESTONES = [7, 14, 30, 60, 100] as const

export interface StreakInfo {
  current: number
  best: number
  milestone: number | null
}

/** Converts any ISO timestamp to a YYYY-MM-DD local date string in `tz`. */
function toLocalDate(iso: string, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso))
  const y = parts.find((p) => p.type === 'year')!.value
  const m = parts.find((p) => p.type === 'month')!.value
  const d = parts.find((p) => p.type === 'day')!.value
  return `${y}-${m}-${d}`
}

/** Adds (or subtracts) N days from a YYYY-MM-DD string. */
function shiftDate(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * Computes the current and best streak for a user based on meal_logs.
 * A streak is the number of consecutive days (going back from today) on
 * which at least one meal was logged.
 *
 * We query distinct local dates rather than raw rows to avoid a 1 000-row
 * cap silently truncating long-term users.  Supabase JS doesn't expose
 * `SELECT DISTINCT`, so we query only `eaten_at` with a high limit that
 * covers years of daily data (one row per distinct date is sufficient after
 * dedup in JS, and 3 650 covers 10 years at 1 meal/day — adjust if needed).
 */
export async function getStreak(
  db: Db,
  userId: string,
  tz: string
): Promise<StreakInfo> {
  // 3 650 distinct-date entries covers 10 years of daily logging.
  const { data, error } = await db
    .from('meal_logs')
    .select('eaten_at')
    .eq('user_id', userId)
    .order('eaten_at', { ascending: false })
    .limit(3650)

  if (error) throw new Error(`streaks.getStreak: ${error.message}`)

  const rows = (data ?? []) as { eaten_at: string }[]

  // Deduplicate into sorted-descending unique local date strings
  const dateSet = new Set<string>()
  for (const row of rows) {
    dateSet.add(toLocalDate(row.eaten_at, tz))
  }
  const dates = Array.from(dateSet).sort((a, b) => (a > b ? -1 : 1))

  if (dates.length === 0) {
    return { current: 0, best: 0, milestone: null }
  }

  // Today in the user's timezone — use toLocalDate directly to avoid the
  // double-conversion that would arise from round-tripping through midnightInTz.
  const todayStr = toLocalDate(new Date().toISOString(), tz)

  // Compute current streak — walk back from today
  let current = 0
  let expected = todayStr
  for (const d of dates) {
    if (d === expected) {
      current++
      expected = shiftDate(expected, -1)
    } else if (d < expected) {
      // Gap — streak is broken
      break
    }
    // d > expected: future entry (clock skew?) — skip
  }

  // Compute best streak — walk all unique dates in ascending order
  const datesAsc = Array.from(dates).sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const d of datesAsc) {
    if (prev === null) {
      run = 1
    } else if (d === shiftDate(prev, 1)) {
      run++
    } else {
      run = 1
    }
    if (run > best) best = run
    prev = d
  }
  // Ensure best is at least current
  if (current > best) best = current

  const milestone = (MILESTONES as readonly number[]).includes(current)
    ? current
    : null

  return { current, best, milestone }
}
