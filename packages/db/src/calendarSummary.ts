import type { createServerClient } from './client'
import { midnightInTz } from './tzHelpers'

type Db = ReturnType<typeof createServerClient>

export interface DaySummary {
  date: string
  logged: boolean
  mealCount: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  waterMl: number
  waterGoalMet: boolean
  goalsHit: boolean
}

export interface DayDetail extends DaySummary {
  meals: {
    id: string
    slot: string
    items: unknown[]
    totals: { kcal?: number; protein?: number; carbs?: number; fat?: number } | null
    isFavourite: boolean
  }[]
  waterEntries: { id: string; ml: number }[]
  plannedMeals: { slot: string; foods: unknown[] }[] | null
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

/** Returns the number of days in a given YYYY-MM month string. */
function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number) as [number, number]
  return new Date(y, m, 0).getDate()
}

/**
 * Returns a DaySummary for each day of the given month.
 * `month` must be in YYYY-MM format (e.g. '2026-10').
 */
export async function getMonthSummary(
  db: Db,
  userId: string,
  tz: string,
  month: string
): Promise<DaySummary[]> {
  const numDays = daysInMonth(month)
  const firstDay = `${month}-01`
  const dayAfterLast = (() => {
    const [y, m] = month.split('-').map(Number) as [number, number]
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
    return `${next}-01`
  })()

  const rangeStart = midnightInTz(new Date(`${firstDay}T12:00:00Z`), tz)
  const rangeEnd = midnightInTz(new Date(`${dayAfterLast}T12:00:00Z`), tz)

  // Fetch meals, water, and profile in parallel
  const [mealResult, waterResult, profileResult] = await Promise.all([
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
    db
      .from('profiles')
      .select('water_goal_ml, kcal_goal, protein_goal_g, carbs_goal_g, fat_goal_g')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  if (mealResult.error) throw new Error(`calendarSummary.getMonthSummary (meals): ${mealResult.error.message}`)
  if (waterResult.error) throw new Error(`calendarSummary.getMonthSummary (water): ${waterResult.error.message}`)
  if (profileResult.error) throw new Error(`calendarSummary.getMonthSummary (profile): ${profileResult.error.message}`)

  const profile = profileResult.data as {
    water_goal_ml: number | null
    kcal_goal: number | null
    protein_goal_g: number | null
    carbs_goal_g: number | null
    fat_goal_g: number | null
  } | null

  const waterGoalMl = profile?.water_goal_ml ?? 2000
  const kcalGoal = profile?.kcal_goal ?? null
  const proteinGoal = profile?.protein_goal_g ?? null
  const carbsGoal = profile?.carbs_goal_g ?? null
  const fatGoal = profile?.fat_goal_g ?? null

  type MealRow = { eaten_at: string; totals: { kcal?: number; protein?: number; carbs?: number; fat?: number } | null }
  type WaterRow = { logged_at: string; ml: number }

  const mealRows = (mealResult.data ?? []) as MealRow[]
  const waterRows = (waterResult.data ?? []) as WaterRow[]

  // Build per-day accumulators
  const days: string[] = []
  for (let i = 1; i <= numDays; i++) {
    days.push(`${month}-${String(i).padStart(2, '0')}`)
  }

  const dayData: Record<string, { meals: number; kcal: number; protein: number; carbs: number; fat: number; waterMl: number }> = {}
  for (const day of days) {
    dayData[day] = { meals: 0, kcal: 0, protein: 0, carbs: 0, fat: 0, waterMl: 0 }
  }

  for (const row of mealRows) {
    const day = toLocalDate(row.eaten_at, tz)
    const acc = dayData[day]
    if (!acc) continue
    acc.meals += 1
    acc.kcal += row.totals?.kcal ?? 0
    acc.protein += row.totals?.protein ?? 0
    acc.carbs += row.totals?.carbs ?? 0
    acc.fat += row.totals?.fat ?? 0
  }

  for (const row of waterRows) {
    const day = toLocalDate(row.logged_at, tz)
    const acc = dayData[day]
    if (acc) acc.waterMl += row.ml
  }

  return days.map((date) => {
    const d = dayData[date]!
    const waterGoalMet = d.waterMl >= waterGoalMl
    const goalsHit =
      kcalGoal !== null &&
      proteinGoal !== null &&
      carbsGoal !== null &&
      fatGoal !== null &&
      d.kcal >= kcalGoal &&
      d.protein >= proteinGoal &&
      d.carbs >= carbsGoal &&
      d.fat >= fatGoal
    return {
      date,
      logged: d.meals > 0,
      mealCount: d.meals,
      kcal: Math.round(d.kcal),
      protein: Math.round(d.protein),
      carbs: Math.round(d.carbs),
      fat: Math.round(d.fat),
      waterMl: Math.round(d.waterMl),
      waterGoalMet,
      goalsHit,
    }
  })
}

/**
 * Returns full detail for a single day, including individual meals,
 * water entries, and any planned meals from the meal_plans table.
 */
export async function getDayDetail(
  db: Db,
  userId: string,
  tz: string,
  date: string
): Promise<DayDetail> {
  const nextDate = (() => {
    const d = new Date(`${date}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + 1)
    return d.toISOString().slice(0, 10)
  })()

  const rangeStart = midnightInTz(new Date(`${date}T12:00:00Z`), tz)
  const rangeEnd = midnightInTz(new Date(`${nextDate}T12:00:00Z`), tz)

  // Determine the week_start (Monday) for this date to look up meal plans
  const dateObj = new Date(`${date}T00:00:00Z`)
  const dayOfWeek = dateObj.getUTCDay() // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStartDate = new Date(dateObj)
  weekStartDate.setUTCDate(dateObj.getUTCDate() + mondayOffset)
  const weekStart = weekStartDate.toISOString().slice(0, 10)

  const [mealResult, waterResult, planResult, profileResult] = await Promise.all([
    db
      .from('meal_logs')
      .select('id, meal_slot, items, totals, is_favourite, eaten_at')
      .eq('user_id', userId)
      .gte('eaten_at', rangeStart)
      .lt('eaten_at', rangeEnd)
      .order('eaten_at', { ascending: true }),
    db
      .from('water_logs')
      .select('id, ml')
      .eq('user_id', userId)
      .gte('logged_at', rangeStart)
      .lt('logged_at', rangeEnd)
      .order('logged_at', { ascending: true }),
    db
      .from('meal_plans')
      .select('plan')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .eq('status', 'active')
      .maybeSingle(),
    db
      .from('profiles')
      .select('water_goal_ml, kcal_goal, protein_goal_g, carbs_goal_g, fat_goal_g')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  if (mealResult.error) throw new Error(`calendarSummary.getDayDetail (meals): ${mealResult.error.message}`)
  if (waterResult.error) throw new Error(`calendarSummary.getDayDetail (water): ${waterResult.error.message}`)
  if (planResult.error) throw new Error(`calendarSummary.getDayDetail (plan): ${planResult.error.message}`)
  if (profileResult.error) throw new Error(`calendarSummary.getDayDetail (profile): ${profileResult.error.message}`)

  type MealRow = {
    id: string
    meal_slot: string
    items: unknown[]
    totals: { kcal?: number; protein?: number; carbs?: number; fat?: number } | null
    is_favourite: boolean
    eaten_at: string
  }
  type WaterRow = { id: string; ml: number }

  const mealRows = (mealResult.data ?? []) as MealRow[]
  const waterRows = (waterResult.data ?? []) as WaterRow[]

  const profile = profileResult.data as {
    water_goal_ml: number | null
    kcal_goal: number | null
    protein_goal_g: number | null
    carbs_goal_g: number | null
    fat_goal_g: number | null
  } | null

  const waterGoalMl = profile?.water_goal_ml ?? 2000
  const kcalGoal = profile?.kcal_goal ?? null
  const proteinGoal = profile?.protein_goal_g ?? null
  const carbsGoal = profile?.carbs_goal_g ?? null
  const fatGoal = profile?.fat_goal_g ?? null

  // Aggregate totals
  let kcal = 0, protein = 0, carbs = 0, fat = 0
  for (const row of mealRows) {
    kcal += row.totals?.kcal ?? 0
    protein += row.totals?.protein ?? 0
    carbs += row.totals?.carbs ?? 0
    fat += row.totals?.fat ?? 0
  }
  const waterMl = waterRows.reduce((sum, r) => sum + r.ml, 0)

  const waterGoalMet = waterMl >= waterGoalMl
  const goalsHit =
    kcalGoal !== null &&
    proteinGoal !== null &&
    carbsGoal !== null &&
    fatGoal !== null &&
    kcal >= kcalGoal &&
    protein >= proteinGoal &&
    carbs >= carbsGoal &&
    fat >= fatGoal

  // Extract planned meals for this specific date from the plan JSON
  let plannedMeals: { slot: string; foods: unknown[] }[] | null = null
  if (planResult.data) {
    const plan = (planResult.data as { plan: Record<string, unknown> }).plan
    // MealPlan typically has a `days` map keyed by date with slot entries
    const dayPlan = (plan as { days?: Record<string, { slot: string; foods: unknown[] }[]> })?.days?.[date]
    if (dayPlan && Array.isArray(dayPlan)) {
      plannedMeals = dayPlan.map((entry) => ({
        slot: entry.slot,
        foods: entry.foods ?? [],
      }))
    }
  }

  return {
    date,
    logged: mealRows.length > 0,
    mealCount: mealRows.length,
    kcal: Math.round(kcal),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    waterMl: Math.round(waterMl),
    waterGoalMet,
    goalsHit,
    meals: mealRows.map((r) => ({
      id: r.id,
      slot: r.meal_slot,
      items: r.items,
      totals: r.totals,
      isFavourite: r.is_favourite,
    })),
    waterEntries: waterRows.map((r) => ({ id: r.id, ml: r.ml })),
    plannedMeals,
  }
}
