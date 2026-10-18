import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays, at, insertChunks, mondayOf, rng } from './util'

const GLASS_ML = 250

/** Sixty days of water, one row per glass. 8+ glasses meets the 2 L goal. */
export function buildWaterRows(userId: string, today: string) {
  const rand = rng(7)
  const rows: Record<string, unknown>[] = []
  for (let d = 0; d < 60; d++) {
    const date = addDays(today, -d)
    const glasses = d === 0 ? 3 : 5 + Math.floor(rand() * 5)
    for (let g = 0; g < glasses; g++) {
      const loggedAt = at(date, 6 + g * 1.5)
      rows.push({ user_id: userId, ml: GLASS_ML, logged_at: loggedAt, created_at: loggedAt })
    }
  }
  return rows
}

/** A weigh-in every three days for four months, drifting gently down. */
export function buildWeightRows(userId: string, today: string) {
  const rand = rng(42)
  const rows: Record<string, unknown>[] = []
  for (let d = 120; d >= 0; d -= 3) {
    const kg = 82.6 - (120 - d) * 0.022 + (rand() - 0.5) * 0.6
    rows.push({ user_id: userId, weight_kg: Math.round(kg * 10) / 10, logged_at: addDays(today, -d) })
  }
  return rows
}

const BREAKFASTS = ['overnight-oats', 'bread-egg', 'yoghurt-muesli', 'scrambled-eggs', 'apple-porridge', 'bread-cheese', 'quark-berries']
const LUNCHES = ['greek-salad', 'couscous-salad', 'hummus-wrap', 'tomato-soup', 'bulgur-salad', 'chicken-wrap', 'shakshuka']
const DINNERS = ['lentil-soup', 'spaghetti-bolognese', 'chicken-curry', 'bean-chili', 'egg-fried-rice', 'oven-veg-feta', 'potato-soup', 'salmon-potatoes', 'tofu-stir-fry', 'kaesespaetzle', 'red-lentil-dal', 'sprouts-potatoes-egg', 'tuna-pasta', 'veg-curry']

/** Active plans for this week and next, so the calendar shows planned days ahead. */
export async function seedPlans(db: SupabaseClient, userId: string, today: string) {
  for (const [w, weekStart] of [mondayOf(today), addDays(mondayOf(today), 7)].entries()) {
    const days = Array.from({ length: 7 }, (_, i) => ({
      date: addDays(weekStart, i),
      meals: {
        breakfast: BREAKFASTS[(i + w * 3) % BREAKFASTS.length],
        lunch: LUNCHES[(i + w * 2) % LUNCHES.length],
        dinner: DINNERS[i + w * 7],
      },
    }))
    const { error } = await db.from('meal_plans').insert({
      user_id: userId,
      week_start: weekStart,
      plan: { weekStart, days },
      prefs: { maxMinutes: 30 },
      status: 'active',
    })
    if (error) console.warn(`  ⚠ meal_plan: ${error.message}`)
  }
}

const HABITS = [
  { title: 'Drink 2L water', period: 'daily', checkins: [0, 1, 2, 3, 4, 5, 6] },
  { title: 'Eat 5 portions of veg', period: 'daily', checkins: [0, 1, 2, 3, 5] },
  { title: 'Cook from scratch', period: 'weekly', checkins: [3, 10] },
  { title: 'No phone at meals', period: 'daily', checkins: [0, 1, 2] },
  { title: 'Try a new recipe', period: 'weekly', checkins: [5] },
]

export async function seedHabits(db: SupabaseClient, userId: string, today: string) {
  for (const h of HABITS) {
    const { data, error } = await db
      .from('goals_habits')
      .insert({ user_id: userId, title: h.title, period: h.period })
      .select('id')
      .single()
    if (error) {
      console.warn(`  ⚠ habit: ${error.message}`)
      continue
    }
    await insertChunks(
      db,
      'habit_checkins',
      h.checkins.map((d) => ({ habit_id: data.id, user_id: userId, date: addDays(today, -d) }))
    )
  }
  return HABITS.length
}
