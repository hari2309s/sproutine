import type { createServerClient } from './client'
import { midnightInTz } from './tzHelpers'

type Db = ReturnType<typeof createServerClient>

export interface OnThisDayMeal {
  mealLogId: string
  slot: string
  items: { name: string }[]
  monthsAgo: number
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

/** Subtracts N months from a YYYY-MM-DD date, clamping to valid day-of-month. */
function subtractMonths(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number) as [number, number, number]
  const target = new Date(Date.UTC(y, m - 1 - n, 1))
  const maxDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(d, maxDay))
  return target.toISOString().slice(0, 10)
}

/** Returns the Monday (ISO week start) for a given YYYY-MM-DD date. */
function weekStartFor(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  const dow = d.getUTCDay() // 0=Sun
  const offset = dow === 0 ? -6 : 1 - dow
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

/**
 * Returns an "On This Day" meal suggestion, or null if conditions aren't met.
 *
 * Conditions:
 * - User has at least 30 days of meal_logs.
 * - No dismissal recorded for this ISO week.
 *
 * Preference order for the target date: 1, 3, 6, or 12 months ago.
 * Within each target date, prefers favourited meals, then meals whose items
 * have been logged more than once overall.
 */
export async function getOnThisDayMeal(
  db: Db,
  userId: string,
  tz: string
): Promise<OnThisDayMeal | null> {
  const todayStr = toLocalDate(new Date().toISOString(), tz)
  const thisWeekStart = weekStartFor(todayStr)

  // Check for a dismissal this week
  const { data: dismissals, error: dismissError } = await db
    .from('on_this_day_dismissals')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', `${thisWeekStart}T00:00:00Z`)
    .limit(1)
  if (dismissError) throw new Error(`onThisDay.getOnThisDayMeal (dismissals): ${dismissError.message}`)
  if (dismissals && dismissals.length > 0) return null

  // Check the user has 30+ distinct days of logging
  const { data: countData, error: countError } = await db
    .from('meal_logs')
    .select('eaten_at')
    .eq('user_id', userId)
    .order('eaten_at', { ascending: false })
    .limit(3650)
  if (countError) throw new Error(`onThisDay.getOnThisDayMeal (count): ${countError.message}`)

  const uniqueDates = new Set<string>()
  for (const row of (countData ?? []) as { eaten_at: string }[]) {
    uniqueDates.add(toLocalDate(row.eaten_at, tz))
    if (uniqueDates.size >= 30) break // early exit once threshold met
  }
  if (uniqueDates.size < 30) return null

  // Try each month-offset in order of preference
  const offsets = [1, 3, 6, 12]

  for (const monthsAgo of offsets) {
    const targetDate = subtractMonths(todayStr, monthsAgo)
    const nextDate = (() => {
      const d = new Date(`${targetDate}T00:00:00Z`)
      d.setUTCDate(d.getUTCDate() + 1)
      return d.toISOString().slice(0, 10)
    })()

    const rangeStart = midnightInTz(new Date(`${targetDate}T12:00:00Z`), tz)
    const rangeEnd = midnightInTz(new Date(`${nextDate}T12:00:00Z`), tz)

    const { data: meals, error: mealError } = await db
      .from('meal_logs')
      .select('id, meal_slot, items, is_favourite')
      .eq('user_id', userId)
      .gte('eaten_at', rangeStart)
      .lt('eaten_at', rangeEnd)
      .order('is_favourite', { ascending: false })
    if (mealError) throw new Error(`onThisDay.getOnThisDayMeal (meals): ${mealError.message}`)

    const mealRows = (meals ?? []) as {
      id: string
      meal_slot: string
      items: { name: string }[]
      is_favourite: boolean
    }[]

    if (mealRows.length === 0) continue

    // Prefer favourited meals first (already sorted by is_favourite desc)
    const best = mealRows[0]!

    return {
      mealLogId: best.id,
      slot: best.meal_slot,
      items: (best.items ?? []).map((item) => ({ name: item.name })),
      monthsAgo,
    }
  }

  return null
}

/**
 * Records that the user acted on the "On This Day" prompt.
 * `action` is 'logged' if they re-logged it, 'dismissed' if they skipped it.
 */
export async function recordDismissal(
  db: Db,
  userId: string,
  mealLogId: string | null,
  action: 'logged' | 'dismissed'
): Promise<void> {
  const { error } = await db
    .from('on_this_day_dismissals')
    .insert({
      user_id: userId,
      meal_log_id: mealLogId,
      action,
    })
  if (error) throw new Error(`onThisDay.recordDismissal: ${error.message}`)
}
