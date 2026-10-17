import type { createServerClient } from './client'
import { midnightInTz } from './tzHelpers'

type Db = ReturnType<typeof createServerClient>

export interface WeeklyStats {
  avgKcal: number
  totalMeals: number
  avgWaterGlasses: number
  streak: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  dailyKcal: { day: string; kcal: number }[]
  bestDay: { day: string; reason: string } | null
  missedDays: string[]
}

type MealRow = {
  eaten_at: string
  totals: {
    kcal?: number
    protein?: number
    carbs?: number
    fat?: number
  } | null
}

type WaterRow = {
  logged_at: string
  ml: number
}

/** Returns the ISO date string for the day in the user's timezone. */
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

/** Adds N days to a YYYY-MM-DD string and returns the result. */
function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * Computes aggregate stats for a 7-day period starting at weekStart (inclusive).
 * weekStart must be a YYYY-MM-DD string.
 *
 * `glassMl` is the user's configured glass size (defaults to 250 ml).
 *
 * Note: `streak` is always returned as 0 — the caller should populate it from
 * the streak API (getStreak) to avoid a duplicate DB round-trip.
 */
export async function getWeeklyStats(
  db: Db,
  userId: string,
  tz: string,
  weekStart: string,
  glassMl = 250
): Promise<WeeklyStats> {
  // Build the 7 days of the window
  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    days.push(addDays(weekStart, i))
  }
  const weekEnd = addDays(weekStart, 7) // exclusive upper bound

  // To get the correct UTC boundary for "midnight on weekStart in tz", we must
  // give midnightInTz a Date that represents that calendar day — using noon UTC
  // ensures the timezone conversion always lands on the intended calendar date
  // regardless of UTC offset direction.
  const rangeStart = midnightInTz(new Date(`${weekStart}T12:00:00Z`), tz)
  const rangeEnd = midnightInTz(new Date(`${weekEnd}T12:00:00Z`), tz)

  // Fetch meal_logs and water_logs in parallel
  const [mealResult, waterResult] = await Promise.all([
    db
      .from('meal_logs')
      .select('eaten_at, totals')
      .eq('user_id', userId)
      .gte('eaten_at', rangeStart)
      .lt('eaten_at', rangeEnd),
    db
      .from('water_logs')
      .select('logged_at, ml')
      .eq('user_id', userId)
      .gte('logged_at', rangeStart)
      .lt('logged_at', rangeEnd),
  ])

  if (mealResult.error) {
    throw new Error(`weeklyStats.getWeeklyStats (meals): ${mealResult.error.message}`)
  }
  if (waterResult.error) {
    throw new Error(`weeklyStats.getWeeklyStats (water): ${waterResult.error.message}`)
  }

  const mealRows = (mealResult.data ?? []) as MealRow[]
  const waterRows = (waterResult.data ?? []) as WaterRow[]

  // ── Per-day aggregations ────────────────────────────────────────────────
  const dayKcal: Record<string, number> = {}
  const dayMeals: Record<string, number> = {}
  const dayProtein: Record<string, number> = {}
  const dayCarbs: Record<string, number> = {}
  const dayFat: Record<string, number> = {}

  for (const day of days) {
    dayKcal[day] = 0
    dayMeals[day] = 0
    dayProtein[day] = 0
    dayCarbs[day] = 0
    dayFat[day] = 0
  }

  for (const row of mealRows) {
    const day = toLocalDate(row.eaten_at, tz)
    if (!(day in dayKcal)) continue // outside window (shouldn't happen)
    dayKcal[day]! += row.totals?.kcal ?? 0
    dayProtein[day]! += row.totals?.protein ?? 0
    dayCarbs[day]! += row.totals?.carbs ?? 0
    dayFat[day]! += row.totals?.fat ?? 0
    dayMeals[day]! += 1
  }

  // ── Water aggregation ───────────────────────────────────────────────────
  const dayWaterMl: Record<string, number> = {}
  for (const day of days) dayWaterMl[day] = 0
  for (const row of waterRows) {
    const day = toLocalDate(row.logged_at, tz)
    if (day in dayWaterMl) dayWaterMl[day]! += row.ml
  }

  const totalWaterGlasses = Object.values(dayWaterMl).reduce(
    (sum, ml) => sum + ml / glassMl,
    0
  )

  // ── Totals & averages ───────────────────────────────────────────────────
  const totalMeals = Object.values(dayMeals).reduce((s, n) => s + n, 0)
  const totalKcal = Object.values(dayKcal).reduce((s, n) => s + n, 0)
  const totalProtein = Object.values(dayProtein).reduce((s, n) => s + n, 0)
  const totalCarbs = Object.values(dayCarbs).reduce((s, n) => s + n, 0)
  const totalFat = Object.values(dayFat).reduce((s, n) => s + n, 0)

  // Average over days that had at least one meal (don't dilute with missed days)
  const daysWithMeals = days.filter((d) => dayMeals[d]! > 0).length
  const avgKcal = daysWithMeals > 0 ? totalKcal / daysWithMeals : 0
  const avgWaterGlasses = totalWaterGlasses / 7

  // ── Daily kcal array ────────────────────────────────────────────────────
  const dailyKcal = days.map((day) => ({ day, kcal: dayKcal[day]! }))

  // ── Missed days ─────────────────────────────────────────────────────────
  const missedDays = days.filter((d) => dayMeals[d] === 0)

  // ── Best day ────────────────────────────────────────────────────────────
  // Among days with at least one meal, find the most balanced by macro ratio.
  // "Balance" = highest minimum share among protein/carbs/fat.
  let bestDay: { day: string; reason: string } | null = null
  let bestScore = -1

  for (const day of days) {
    if (dayMeals[day] === 0) continue
    const kcal = dayKcal[day]!
    if (kcal <= 0) continue

    const proteinShare = (dayProtein[day]! * 4) / kcal
    const carbShare = (dayCarbs[day]! * 4) / kcal
    const fatShare = (dayFat[day]! * 9) / kcal

    const score = Math.min(proteinShare, carbShare, fatShare)
    if (score > bestScore) {
      bestScore = score
      bestDay = {
        day,
        reason: 'Most balanced macros',
      }
    }
  }

  // Fall back to the day with most meals if no kcal data
  if (bestDay === null) {
    let maxMeals = 0
    for (const day of days) {
      if ((dayMeals[day] ?? 0) > maxMeals) {
        maxMeals = dayMeals[day]!
        bestDay = { day, reason: 'Most meals logged' }
      }
    }
  }

  return {
    avgKcal: Math.round(avgKcal),
    totalMeals,
    avgWaterGlasses: Math.round(avgWaterGlasses * 10) / 10,
    streak: 0,
    totalProtein: Math.round(totalProtein),
    totalCarbs: Math.round(totalCarbs),
    totalFat: Math.round(totalFat),
    dailyKcal,
    bestDay,
    missedDays,
  }
}
