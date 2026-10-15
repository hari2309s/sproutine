#!/usr/bin/env npx tsx
/**
 * Seeds (or resets) the demo account with realistic data covering every
 * feature: profile, chat history, meal logs, a weekly plan, habits with
 * streaks, and a nudge. Run via:
 *
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SECRET_KEY=... npx tsx scripts/seed-demo.ts
 *
 * A GitHub Action (demo-reset.yml) runs this nightly.
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
const DEMO_NAME = 'Hari'

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

/** Monday of the week containing `date`. */
function mondayOf(date: string): string {
  const d = new Date(date + 'T12:00:00Z')
  const dow = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - ((dow + 6) % 7))
  return d.toISOString().slice(0, 10)
}

function item(name: string, grams: number, kcal: number, protein: number, fat: number, carbs: number) {
  return {
    source: 'demo',
    sourceId: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    grams,
    nutrients: { kcal, protein, fat, carbs, fiber: null, sugar: null, salt: null },
  }
}

async function main() {
  console.log('🌱 Seeding demo account for Hari...')

  // 1. Find or create the demo user
  const { data: existing } = await db.auth.admin.listUsers({ perPage: 1000 })
  let userId = existing?.users?.find((u) => u.email === DEMO_EMAIL)?.id

  if (userId) {
    console.log('  Resetting existing demo user...')
    const tables = [
      'chat_messages',
      'habit_checkins',
      'goals_habits',
      'plan_adjustments',
      'meal_plans',
      'meal_logs',
      'push_subscriptions',
      'user_usage',
      'foods',
      'profiles',
    ] as const
    for (const table of tables) {
      const col = table === 'foods' ? 'created_by' : 'user_id'
      const { error } = await db.from(table).delete().eq(col, userId)
      if (error) console.warn(`  ⚠ ${table}: ${error.message}`)
    }
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

  // ── 2. Profile ──────────────────────────────────────────────────────────
  console.log('  Profile...')
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
    timezone: 'Europe/Berlin',
  })
  if (profileError) throw profileError

  // ── 3. Chat history — covering multiple features ────────────────────────
  console.log('  Chat history...')
  const messages: { role: string; content: string; created_at: string }[] = [
    // Day 7: first contact
    { role: 'user', content: 'Hey Rosie!', created_at: ts(7, 9) },
    {
      role: 'assistant',
      content:
        "Hi Hari! Welcome to Sproutine. I'm Rosie, your food companion. Tell me what you ate, ask me anything about nutrition, or say \"plan my week\" and I'll sort your meals and shopping list. What sounds good?",
      created_at: ts(7, 9),
    },
    // Day 6: meal logging
    { role: 'user', content: 'I had scrambled eggs on toast with a coffee for breakfast', created_at: ts(6, 8) },
    {
      role: 'assistant',
      content:
        "Great start to the day. Scrambled eggs on toast gives you a solid hit of protein and slow-release carbs. I've logged it as breakfast.",
      created_at: ts(6, 8),
    },
    { role: 'user', content: 'For lunch I had a chicken döner with salad from the place around the corner', created_at: ts(6, 13) },
    {
      role: 'assistant',
      content:
        "Logged as lunch. A döner with salad is a decent mix of protein, carbs and veg. The salad is a nice addition — a lot of people skip it!",
      created_at: ts(6, 13),
    },
    // Day 5: nutrition question (knowledge + citations)
    { role: 'user', content: 'How much protein should I actually be eating?', created_at: ts(5, 12) },
    {
      role: 'assistant',
      content:
        "According to EFSA, adults need about 0.83 g of protein per kilogram of body weight per day. If you're fairly active, 1.0–1.2 g/kg is a good range. Good everyday sources: eggs, Greek yoghurt, chicken, fish, lentils, and tofu. You're getting a decent amount from what you've been eating.",
      created_at: ts(5, 12),
    },
    { role: 'user', content: 'Is it true I should drink 8 glasses of water a day?', created_at: ts(5, 14) },
    {
      role: 'assistant',
      content:
        "The EFSA recommendation is about 2.5 litres per day for men from all beverages and food combined. That includes tea and coffee too. Dark urine, headaches and fatigue can be signs you need more. The \"8 glasses\" thing is a rough guideline — listen to your thirst and check your urine colour.",
      created_at: ts(5, 14),
    },
    // Day 4: meal plan
    { role: 'user', content: 'Plan my week please, quick meals, I\'m on a budget', created_at: ts(4, 18) },
    {
      role: 'assistant',
      content:
        `I planned your week of ${mondayOf(daysAgo(4))}. Dinners: lentil soup, spaghetti bolognese, chicken curry, bean chilli, egg fried rice, oven veg with feta, potato soup. Your shopping list is in the Week tab, sorted by aisle.`,
      created_at: ts(4, 18),
    },
    // Day 3: more meals
    { role: 'user', content: 'Lentil soup was great, I also had an apple and some almonds as a snack', created_at: ts(3, 20) },
    {
      role: 'assistant',
      content:
        "Nice one. Apple and almonds is a solid snack — fibre from the apple and healthy fats from the almonds keep you going. Logged the snack.",
      created_at: ts(3, 20),
    },
    // Day 2: habit discussion
    { role: 'user', content: 'I want to build a habit of eating more vegetables', created_at: ts(2, 10) },
    {
      role: 'assistant',
      content:
        "That's a great goal. You can track it on the Today screen — tap the + next to Habits and add a daily habit like \"Eat 5 portions of veg\". You'll see your streak build up over time. Small and consistent beats big and sporadic.",
      created_at: ts(2, 10),
    },
    // Day 1: more nutrition
    { role: 'user', content: 'Should I take vitamin D in winter? I live in Berlin', created_at: ts(1, 11) },
    {
      role: 'assistant',
      content:
        "In Northern Europe, skin synthesis of vitamin D is limited from October to March, so EFSA recommends a supplement of 10–20 µg per day during winter. Oily fish, egg yolks and fortified foods help too, but a supplement is the most reliable way to cover it in Berlin winters.",
      created_at: ts(1, 11),
    },
    { role: 'user', content: 'What about omega-3? I don\'t eat much fish', created_at: ts(1, 14) },
    {
      role: 'assistant',
      content:
        "EFSA recommends 250 mg of EPA+DHA per day. Since you don't eat much fish, flaxseed, chia seeds and walnuts give you ALA (a plant omega-3), but ALA converts poorly to EPA/DHA. An algae-based supplement is the most effective plant option — it gives you DHA/EPA directly, same as fish oil but without the fish.",
      created_at: ts(1, 14),
    },
    // Today: morning greeting
    { role: 'user', content: 'Morning! I had overnight oats with berries and a green tea', created_at: ts(0, 8) },
    {
      role: 'assistant',
      content:
        "Good morning Hari! Overnight oats with berries is a brilliant start — oats keep your energy steady and berries are packed with antioxidants. Green tea is a nice touch too. Logged as breakfast.",
      created_at: ts(0, 8),
    },
  ]

  for (const msg of messages) {
    const { error } = await db.from('chat_messages').insert({
      user_id: userId,
      role: msg.role,
      content: msg.content,
      created_at: msg.created_at,
    })
    if (error) console.warn('  ⚠ chat:', error.message)
  }

  // ── 4. Meal logs — a week of realistic meals ───────────────────────────
  console.log('  Meal logs...')
  const meals: {
    slot: string
    eatenAt: string
    items: ReturnType<typeof item>[]
  }[] = [
    // Day 6
    {
      slot: 'breakfast',
      eatenAt: ts(6, 8),
      items: [item('Scrambled eggs', 150, 220, 15, 16, 2), item('Toast', 60, 155, 5, 2, 28)],
    },
    {
      slot: 'lunch',
      eatenAt: ts(6, 13),
      items: [item('Chicken döner', 350, 560, 32, 22, 52), item('Mixed salad', 80, 15, 1, 0, 3)],
    },
    {
      slot: 'dinner',
      eatenAt: ts(6, 19),
      items: [item('Spaghetti bolognese', 400, 520, 28, 18, 55)],
    },
    // Day 5
    {
      slot: 'breakfast',
      eatenAt: ts(5, 8),
      items: [item('Porridge with banana', 300, 310, 10, 6, 54)],
    },
    {
      slot: 'lunch',
      eatenAt: ts(5, 13),
      items: [item('Lentil soup', 350, 280, 18, 4, 40), item('Bread roll', 50, 140, 4, 1, 27)],
    },
    {
      slot: 'dinner',
      eatenAt: ts(5, 19),
      items: [item('Chicken curry with rice', 450, 580, 35, 16, 65)],
    },
    // Day 4
    {
      slot: 'breakfast',
      eatenAt: ts(4, 8),
      items: [item('Yoghurt with muesli', 250, 290, 12, 8, 42)],
    },
    {
      slot: 'lunch',
      eatenAt: ts(4, 12),
      items: [item('Cheese sandwich', 180, 380, 16, 18, 35)],
    },
    {
      slot: 'snack',
      eatenAt: ts(4, 16),
      items: [item('Apple', 180, 95, 0.5, 0.3, 23), item('Almonds', 30, 180, 6, 15, 2)],
    },
    {
      slot: 'dinner',
      eatenAt: ts(4, 19),
      items: [item('Bean chilli with rice', 400, 450, 22, 8, 68)],
    },
    // Day 3
    {
      slot: 'breakfast',
      eatenAt: ts(3, 8),
      items: [item('Overnight oats with berries', 300, 340, 12, 9, 50)],
    },
    {
      slot: 'lunch',
      eatenAt: ts(3, 13),
      items: [item('Falafel wrap', 300, 480, 15, 20, 55)],
    },
    {
      slot: 'snack',
      eatenAt: ts(3, 16),
      items: [item('Apple', 180, 95, 0.5, 0.3, 23), item('Almonds', 30, 180, 6, 15, 2)],
    },
    {
      slot: 'dinner',
      eatenAt: ts(3, 19),
      items: [item('Egg fried rice with vegetables', 400, 420, 16, 14, 55)],
    },
    // Day 2
    {
      slot: 'breakfast',
      eatenAt: ts(2, 9),
      items: [item('Bread with cheese and tomato', 200, 340, 14, 16, 30)],
    },
    {
      slot: 'lunch',
      eatenAt: ts(2, 13),
      items: [item('Greek salad', 250, 220, 8, 16, 8), item('Bread', 50, 140, 4, 1, 27)],
    },
    {
      slot: 'dinner',
      eatenAt: ts(2, 19),
      items: [item('Oven veg with feta', 400, 380, 14, 20, 32)],
    },
    // Day 1
    {
      slot: 'breakfast',
      eatenAt: ts(1, 8),
      items: [item('Scrambled eggs on toast', 200, 310, 18, 16, 28)],
    },
    {
      slot: 'lunch',
      eatenAt: ts(1, 13),
      items: [item('Tomato soup', 300, 180, 4, 6, 24), item('Bread roll', 50, 140, 4, 1, 27)],
    },
    {
      slot: 'dinner',
      eatenAt: ts(1, 19),
      items: [item('Potato soup', 400, 320, 8, 12, 42)],
    },
    // Today
    {
      slot: 'breakfast',
      eatenAt: ts(0, 8),
      items: [item('Overnight oats with berries', 300, 340, 12, 9, 50)],
    },
  ]

  for (const meal of meals) {
    const totalNut = meal.items.reduce(
      (acc, i) => ({
        kcal: acc.kcal + i.nutrients.kcal,
        protein: acc.protein + i.nutrients.protein,
        fat: acc.fat + i.nutrients.fat,
        carbs: acc.carbs + i.nutrients.carbs,
        fiber: null,
        sugar: null,
        salt: null,
      }),
      { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: null as null, sugar: null as null, salt: null as null }
    )
    const { error } = await db.from('meal_logs').insert({
      user_id: userId,
      eaten_at: meal.eatenAt,
      meal_slot: meal.slot,
      items: meal.items,
      totals: totalNut,
      partial: [],
      source: 'text',
      is_estimate: true,
      created_at: meal.eatenAt,
    })
    if (error) console.warn(`  ⚠ meal_log: ${error.message}`)
  }

  // ── 5. Meal plan — this week ───────────────────────────────────────────
  console.log('  Meal plan...')
  const thisMonday = mondayOf(daysAgo(0))
  const planDays = []
  const breakfasts = ['overnight-oats', 'bread-egg', 'yoghurt-muesli', 'scrambled-eggs', 'apple-porridge', 'bread-cheese', 'quark-berries']
  const dinners = ['lentil-soup', 'spaghetti-bolognese', 'chicken-curry', 'bean-chili', 'egg-fried-rice', 'oven-veg-feta', 'potato-soup']

  for (let i = 0; i < 7; i++) {
    const d = new Date(thisMonday + 'T12:00:00Z')
    d.setUTCDate(d.getUTCDate() + i)
    planDays.push({
      date: d.toISOString().slice(0, 10),
      meals: {
        breakfast: breakfasts[i],
        dinner: dinners[i],
      },
    })
  }

  const plan = { weekStart: thisMonday, days: planDays }
  const { error: planError } = await db.from('meal_plans').insert({
    user_id: userId,
    week_start: thisMonday,
    plan,
    prefs: { maxMinutes: 30 },
    status: 'active',
  })
  if (planError) console.warn(`  ⚠ meal_plan: ${planError.message}`)

  // ── 6. Habits with streaks ─────────────────────────────────────────────
  console.log('  Habits...')
  const habitDefs = [
    { title: 'Drink 2L water', period: 'daily', checkins: [0, 1, 2, 3, 4, 5, 6] }, // 7-day streak
    { title: 'Eat 5 portions of veg', period: 'daily', checkins: [0, 1, 2, 3, 5] }, // 5 of 7
    { title: 'Cook from scratch', period: 'weekly', checkins: [3, 10] }, // 2-week streak
    { title: 'No phone at meals', period: 'daily', checkins: [0, 1, 2] }, // 3-day streak
    { title: 'Try a new recipe', period: 'weekly', checkins: [5] }, // 1 week
  ]

  for (const h of habitDefs) {
    const { data, error } = await db
      .from('goals_habits')
      .insert({ user_id: userId, title: h.title, period: h.period })
      .select('id')
      .single()
    if (error) {
      console.warn(`  ⚠ habit: ${error.message}`)
      continue
    }
    for (const d of h.checkins) {
      const { error: checkinErr } = await db
        .from('habit_checkins')
        .insert({ habit_id: data.id, user_id: userId, date: daysAgo(d) })
      if (checkinErr && checkinErr.code !== '23505') {
        console.warn(`  ⚠ checkin: ${checkinErr.message}`)
      }
    }
  }

  // ── 7. A proactive nudge from Rosie ────────────────────────────────────
  console.log('  Nudge...')
  const { error: nudgeErr } = await db.from('chat_messages').insert({
    user_id: userId,
    role: 'assistant',
    content: `Hi Hari! Your week in a sentence: you logged ${meals.length} meals on ${new Set(meals.map((m) => m.eatenAt.slice(0, 10))).size} days and kept up "Drink 2L water". Nice work. Anything you'd like to do differently next week?`,
    is_proactive: true,
    nudge_key: `weekly:${daysAgo(0).slice(0, 8)}W`,
    created_at: ts(0, 18),
  })
  if (nudgeErr) console.warn(`  ⚠ nudge: ${nudgeErr.message}`)

  console.log(`✅ Demo account ready: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
  console.log(`   User ID: ${userId}`)
  console.log(`   Profile: ${DEMO_NAME}, omnivore, allergic to peanuts`)
  console.log(`   Chat: ${messages.length} messages (greetings, logging, nutrition Q&A, planning, habits)`)
  console.log(`   Meals: ${meals.length} logged meals over 7 days`)
  console.log(`   Plan: this week with 7 breakfasts + 7 dinners`)
  console.log(`   Habits: ${habitDefs.length} habits with streaks`)
  console.log(`   Nudge: 1 weekly review`)
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
