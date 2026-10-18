// ── Types ───────────────────────────────────────────────────────────────────

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
  /** True if at least one planned meal exists for this day. */
  planned?: boolean
}

export interface DayMealSlot {
  id: string
  slot: string
  items: { name: string; brand?: string }[]
  kcal: number
  planned: boolean
}

export interface DayDetail extends DaySummary {
  meals: DayMealSlot[]
  waterEntries: { id: string; ml: number }[]
  plannedMeals: { slot: string; foods: string }[] | null
}

export interface OnThisDayData {
  mealLogId: string
  slot: string
  items: { name: string }[]
  monthsAgo: number
}

// ── API calls ───────────────────────────────────────────────────────────────

export async function fetchMonthSummary(month: string): Promise<{ days: DaySummary[] }> {
  const res = await fetch(`/api/calendar/month?month=${encodeURIComponent(month)}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchDayDetail(date: string): Promise<DayDetail> {
  const res = await fetch(`/api/calendar/day?date=${encodeURIComponent(date)}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function copyDay(
  fromDate: string,
  toDate: string,
  slot?: string
): Promise<number> {
  const res = await fetch('/api/calendar/day/copy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromDate, toDate, slot }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const { copied } = (await res.json()) as { copied: number }
  return copied
}

export async function fetchOnThisDay(): Promise<OnThisDayData | null> {
  const res = await fetch('/api/calendar/on-this-day')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function dismissOnThisDay(
  action: 'logged' | 'dismissed',
  mealLogId?: string
): Promise<void> {
  const res = await fetch('/api/calendar/on-this-day', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, mealLogId }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}
