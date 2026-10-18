#!/usr/bin/env npx tsx
/**
 * Seeds (or resets) the demo account with data covering every feature:
 * profile and goals, chat history, ~6 months of meals (streak, month calendar,
 * On This Day), favourites, water, weight, two weeks of meal plans, habits and
 * a weekly nudge. Run via:
 *
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SECRET_KEY=... npx tsx scripts/seed-demo.ts
 *
 * A GitHub Action (demo-reset.yml) runs this nightly.
 */

import { createClient } from '@supabase/supabase-js'
import { buildMessages, weeklyNudge } from './demo/chat'
import { buildMealRows, lastWeekStats } from './demo/meals'
import { buildWaterRows, buildWeightRows, seedHabits, seedPlans } from './demo/tracking'
import { berlinToday, insertChunks, TZ } from './demo/util'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SECRET_KEY!
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY')
  process.exit(1)
}

const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'demo@sproutine.app'
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'sproutine-demo'
const DEMO_NAME = 'Hari'

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Children before parents; `foods` is keyed by created_by.
const USER_TABLES = [
  'on_this_day_dismissals',
  'calendar_feed_tokens',
  'chat_messages',
  'habit_checkins',
  'goals_habits',
  'plan_adjustments',
  'meal_plans',
  'meal_logs',
  'water_logs',
  'weight_logs',
  'push_subscriptions',
  'user_usage',
  'foods',
  'profiles',
] as const

async function findOrCreateUser(): Promise<string> {
  const { data: existing } = await db.auth.admin.listUsers({ perPage: 1000 })
  const userId = existing?.users?.find((u) => u.email === DEMO_EMAIL)?.id

  if (userId) {
    console.log('  Resetting existing demo user...')
    for (const table of USER_TABLES) {
      const col = table === 'foods' ? 'created_by' : 'user_id'
      const { error } = await db.from(table).delete().eq(col, userId)
      if (error) console.warn(`  ⚠ ${table}: ${error.message}`)
    }
    return userId
  }

  console.log('  Creating demo user...')
  const { data, error } = await db.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: DEMO_NAME },
  })
  if (error) throw error
  return data.user.id
}

async function main() {
  console.log(`🌱 Seeding demo account for ${DEMO_NAME}...`)
  const today = berlinToday()
  const userId = await findOrCreateUser()

  console.log('  Profile and goals...')
  const { error: profileError } = await db.from('profiles').upsert({
    user_id: userId,
    display_name: DEMO_NAME,
    diet: 'omnivore',
    allergies: ['peanuts'],
    dislikes: ['olives', 'anchovies'],
    budget_weekly_cents: 6000,
    goals: ['eat more vegetables', 'cook more at home', 'drink more water'],
    locale: 'en',
    voice_id: 'rosie',
    safety_mode: false,
    consent_health_at: new Date().toISOString(),
    timezone: TZ,
    water_goal_ml: 2000,
    water_glass_ml: 250,
    kcal_goal: 1600,
    protein_goal_g: 65,
    carbs_goal_g: 190,
    fat_goal_g: 50,
  })
  if (profileError) throw profileError

  console.log('  Chat history...')
  const messages = buildMessages(today)
  await insertChunks(db, 'chat_messages', messages.map((m) => ({ user_id: userId, ...m })))

  console.log('  Meal logs...')
  const meals = buildMealRows(userId, today)
  await insertChunks(db, 'meal_logs', meals.rows)

  console.log('  Water and weight...')
  const water = buildWaterRows(userId, today)
  const weight = buildWeightRows(userId, today)
  await insertChunks(db, 'water_logs', water)
  await insertChunks(db, 'weight_logs', weight)

  console.log('  Meal plans...')
  await seedPlans(db, userId, today)

  console.log('  Habits...')
  const habitCount = await seedHabits(db, userId, today)

  console.log('  Nudge...')
  const week = lastWeekStats(today)
  const { error: nudgeErr } = await db
    .from('chat_messages')
    .insert({ user_id: userId, ...weeklyNudge(today, week.meals, week.days) })
  if (nudgeErr) console.warn(`  ⚠ nudge: ${nudgeErr.message}`)

  const favourites = meals.rows.filter((r) => r.is_favourite).length
  console.log(`✅ Demo account ready: ${DEMO_EMAIL}`)
  console.log(`   User ID: ${userId}`)
  console.log(`   Profile: ${DEMO_NAME}, omnivore, allergic to peanuts, goals 1600 kcal / 65 P / 190 C / 50 F`)
  console.log(`   Chat: ${messages.length} messages + 1 weekly nudge`)
  console.log(`   Meals: ${meals.rows.length} logs on ${meals.days} days, ${favourites} favourites`)
  console.log(`   Water: ${water.length} glasses over 60 days; Weight: ${weight.length} weigh-ins`)
  console.log(`   Plans: this week and next (breakfast, lunch, dinner); Habits: ${habitCount}`)
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
