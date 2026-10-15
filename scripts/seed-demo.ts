#!/usr/bin/env npx tsx
/**
 * Seeds (or resets) the demo account. Run via:
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=... npx tsx scripts/seed-demo.ts
 *
 * The demo user lets visitors explore the app without signing up. A GitHub
 * Action resets it nightly so it stays clean.
 *
 * Env vars:
 *   NEXT_PUBLIC_SUPABASE_URL — Supabase project URL
 *   SUPABASE_SECRET_KEY      — service_role key
 *   DEMO_EMAIL               — demo account email (default: demo@sproutine.app)
 *   DEMO_PASSWORD             — demo account password (default: sproutine-demo)
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SECRET_KEY!
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY')
  process.exit(1)
}

const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'demo@sproutine.app'
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'sproutine-demo'
const DEMO_NAME = 'Alex'

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function ts(daysBack: number, hour = 12): string {
  const d = new Date()
  d.setDate(d.getDate() - daysBack)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

async function main() {
  console.log('🌱 Seeding demo account...')

  // 1. Find or create the demo user
  const { data: existing } = await db.auth.admin.listUsers()
  let userId = existing?.users?.find((u) => u.email === DEMO_EMAIL)?.id

  if (userId) {
    // Wipe existing data (cascade doesn't help here since we keep the user)
    console.log('  Resetting existing demo user...')
    await db.from('chat_messages').delete().eq('user_id', userId)
    await db.from('habit_checkins').delete().eq('user_id', userId)
    await db.from('goals_habits').delete().eq('user_id', userId)
    await db.from('plan_adjustments').delete().eq('user_id', userId)
    await db.from('meal_plans').delete().eq('user_id', userId)
    await db.from('meal_logs').delete().eq('user_id', userId)
    await db.from('push_subscriptions').delete().eq('user_id', userId)
    await db.from('user_usage').delete().eq('user_id', userId)
    await db.from('profiles').delete().eq('user_id', userId)
  } else {
    console.log('  Creating demo user...')
    const { data, error } = await db.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: DEMO_NAME },
    })
    if (error) throw error
    userId = data.user.id
  }

  // 2. Profile
  const { error: profileError } = await db.from('profiles').upsert({
    user_id: userId,
    display_name: DEMO_NAME,
    diet: 'omnivore',
    allergies: ['peanuts'],
    dislikes: ['olives', 'anchovies'],
    budget_weekly_cents: 6000,
    goals: ['eat more vegetables', 'cook more at home'],
    locale: 'en',
    voice_id: 'rosie',
    safety_mode: false,
    consent_health_at: new Date().toISOString(),
    timezone: 'Europe/Berlin',
  })
  if (profileError) throw profileError

  // 3. Chat history — a sample conversation
  const messages = [
    { role: 'user', content: 'Hi Rosie! I just signed up, what can you do?', created_at: ts(5, 9) },
    {
      role: 'assistant',
      content:
        "Hello Alex! Welcome. I'm your food companion. You can tell me what you ate and I'll log it, I can plan your meals for the week with a shopping list, and I'm happy to chat about nutrition or cooking ideas. What sounds good?",
      created_at: ts(5, 9),
    },
    { role: 'user', content: 'I had porridge with blueberries and a coffee this morning', created_at: ts(4, 8) },
    {
      role: 'assistant',
      content:
        "Nice way to start the day. Porridge with blueberries is a great combo — the oats give you steady energy and blueberries add a nice hit of antioxidants. I've got it down as breakfast.",
      created_at: ts(4, 8),
    },
    { role: 'user', content: 'How much protein should I aim for?', created_at: ts(3, 12) },
    {
      role: 'assistant',
      content:
        "According to EFSA, adults need about 0.83 g of protein per kilogram of body weight per day. If you're fairly active, you might benefit from a bit more — around 1.0–1.2 g/kg. Good sources include eggs, Greek yoghurt, chicken, fish, lentils, and tofu.",
      created_at: ts(3, 12),
    },
    { role: 'user', content: 'Plan my week, something quick and budget-friendly', created_at: ts(2, 18) },
    {
      role: 'assistant',
      content:
        "I planned your week of " + daysAgo(2) + ". Dinners: lentil soup, pasta with tomato sauce, chicken stir-fry, bean chilli, fried rice, omelette with salad, baked potato with tuna.",
      created_at: ts(2, 18),
    },
    { role: 'user', content: 'What are good snacks that keep me full?', created_at: ts(1, 15) },
    {
      role: 'assistant',
      content:
        "A handful of unsalted nuts (about 30 g), an apple with a spoon of peanut butter — oh wait, you avoid peanuts! Try almond butter instead. Greek yoghurt with a drizzle of honey is another one that keeps you going. Vegetable sticks with hummus is great too.",
      created_at: ts(1, 15),
    },
  ]

  for (const msg of messages) {
    const { error } = await db.from('chat_messages').insert({
      user_id: userId,
      role: msg.role,
      content: msg.content,
      created_at: msg.created_at,
    })
    if (error) console.warn('  chat insert:', error.message)
  }

  // 4. Habits with some check-ins
  const habitInserts = [
    { title: 'Drink 2L water', period: 'daily' },
    { title: 'Eat 5 portions of veg', period: 'daily' },
    { title: 'Cook from scratch', period: 'weekly' },
  ]
  for (const h of habitInserts) {
    const { data, error } = await db
      .from('goals_habits')
      .insert({ user_id: userId, title: h.title, period: h.period })
      .select('id')
      .single()
    if (error) {
      console.warn('  habit insert:', error.message)
      continue
    }
    // Add some check-ins over the last week
    const checkinDays = h.period === 'daily' ? [1, 2, 3, 5] : [3]
    for (const d of checkinDays) {
      await db
        .from('habit_checkins')
        .insert({ habit_id: data.id, user_id: userId, date: daysAgo(d) })
        .catch(() => {})
    }
  }

  console.log(`✅ Demo account ready: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
  console.log(`   User ID: ${userId}`)
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
