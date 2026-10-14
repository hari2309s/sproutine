import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  buildMealLog,
  MAX_ITEM_GRAMS,
  MAX_MEAL_ITEMS,
  MEAL_SLOTS,
  MEAL_SOURCES,
} from '@sproutine/food'
import {
  createServerClient,
  foodKey,
  getFoodsByKeys,
  getProfile,
  insertMealLog,
} from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'
import { foodRequestLimiter } from '@/lib/foodLimits'

export const runtime = 'nodejs'

// The client sends only which foods and how many grams. Names and nutrients
// are read from the foods table and computed here, so a log can't carry
// numbers the server didn't produce.
const Body = z.object({
  slot: z.enum(MEAL_SLOTS),
  source: z.enum(MEAL_SOURCES),
  items: z
    .array(
      z.object({
        source: z.enum(['off', 'usda', 'user']),
        sourceId: z.string().min(1).max(64),
        grams: z.number().positive().max(MAX_ITEM_GRAMS),
      })
    )
    .min(1)
    .max(MAX_MEAL_ITEMS),
  eatenAt: z.iso.datetime({ offset: true }).optional(),
  traceId: z.string().max(64).optional(),
})

/** How far back a meal may be logged; anything older is almost surely a bad clock. */
const MAX_BACKDATE_MS = 7 * 24 * 60 * 60 * 1000
const CLOCK_SKEW_MS = 5 * 60 * 1000

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    if (!foodRequestLimiter.tryAcquire(user.id)) {
      return NextResponse.json({ error: 'too many requests, slow down' }, { status: 429 })
    }

    const parsed = Body.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'invalid meal' }, { status: 400 })
    const body = parsed.data

    const now = Date.now()
    const eatenAt = body.eatenAt ? new Date(body.eatenAt) : new Date(now)
    if (eatenAt.getTime() > now + CLOCK_SKEW_MS || eatenAt.getTime() < now - MAX_BACKDATE_MS) {
      return NextResponse.json({ error: 'eatenAt out of range' }, { status: 400 })
    }

    const db = createServerClient()
    // Meal logs are health data: only stored with recorded consent.
    const profile = await getProfile(db, user.id)
    if (!profile?.consentHealthAt) {
      return NextResponse.json({ error: 'onboarding required' }, { status: 409 })
    }

    const foods = await getFoodsByKeys(db, body.items, user.id)
    const items = []
    for (const item of body.items) {
      const food = foods.get(foodKey(item))
      if (!food) return NextResponse.json({ error: 'unknown food' }, { status: 422 })
      items.push({ food, grams: Math.round(item.grams) || 1 })
    }

    const id = await insertMealLog(db, {
      ...buildMealLog(items),
      userId: user.id,
      slot: body.slot,
      source: body.source,
      eatenAt,
      isEstimate: body.source === 'photo',
      traceId: body.traceId ?? null,
    })
    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    console.error('[meals]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Saving the meal failed' }, { status: 500 })
  }
}
