import type {
  FoodRecord,
  MealLogProposal,
  MealPlan,
  MealSlot,
  Nutrients,
} from '@sproutine/food/client'
import { mealSlotAt, PLAN_SLOTS, RECIPES_BY_ID, weekStartOf } from '@sproutine/food/client'
import { supabase } from './supabase'

// ── Helpers ──────────────────────────────────────────────────────────────────

export function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function proposalForScan(food: FoodRecord): MealLogProposal {
  const grams = food.servingG ? Math.round(food.servingG) : 100
  return {
    slot: mealSlotAt(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone),
    source: 'barcode',
    items: [
      {
        query: food.name,
        match: food,
        alternatives: [],
        grams,
        portion: food.servingG
          ? { grams, basis: 'food-unit', confidence: 'medium' }
          : { grams, basis: 'generic-unit', confidence: 'low' },
      },
    ],
  }
}

// ── API calls ────────────────────────────────────────────────────────────────

export interface TodayLog {
  id: string
  eatenAt: string
  slot: MealSlot
  items: { name: string; brand: string | null; grams: number }[]
  totals?: Nutrients
  partial?: string[]
  isFavourite?: boolean
}

export async function fetchTodayMeals(since: string): Promise<{ logs: TodayLog[]; gentle: boolean }> {
  const res = await fetch(`/api/meals?since=${encodeURIComponent(since)}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function lookupBarcode(code: string): Promise<FoodRecord | null> {
  const res = await fetch(`/api/food/barcode/${encodeURIComponent(code)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const { food } = (await res.json()) as { food: FoodRecord }
  return food
}

export async function removeMealLog(id: string): Promise<boolean> {
  const { data, error } = await supabase.from('meal_logs').delete().eq('id', id).select('id')
  if (error || !data?.length) return false
  return true
}

export async function setMealFavourite(logId: string, isFavourite: boolean): Promise<void> {
  const res = await fetch('/api/meals/favourite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logId, isFavourite }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function copyMeal(
  slot: MealSlot,
  items: { source: string; sourceId: string; grams: number }[]
): Promise<boolean> {
  const res = await fetch('/api/meals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slot,
      source: 'copy',
      items: items.map((i) => ({ source: i.source, sourceId: i.sourceId, grams: i.grams })),
      eatenAt: new Date().toISOString(),
    }),
  })
  return res.ok
}

export interface StreakData {
  current: number
  best: number
  milestone: number | null
}

export async function fetchStreak(): Promise<StreakData> {
  const res = await fetch('/api/streaks')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export interface WeeklyReviewData {
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

export async function fetchWeeklyReview(weekStart: string): Promise<WeeklyReviewData> {
  const res = await fetch(`/api/weekly-review?weekStart=${encodeURIComponent(weekStart)}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

type PlannedMeals = Partial<Record<(typeof PLAN_SLOTS)[number], string>>

export async function fetchPlannedMeals(): Promise<PlannedMeals | null> {
  const today = new Date().toLocaleDateString('sv-SE')
  const res = await fetch(`/api/plans?week=${weekStartOf(new Date())}`)
  if (!res.ok) return null
  const body = (await res.json()) as { plan: { plan: MealPlan } | null }
  const day = body?.plan?.plan.days.find((d) => d.date === today)
  if (!day || !Object.keys(day.meals).length) return null
  return day.meals
}
