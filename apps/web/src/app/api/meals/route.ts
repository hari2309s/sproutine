import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  buildMealLog,
  MAX_ITEM_GRAMS,
  MAX_MEAL_ITEMS,
  MEAL_SLOTS,
  MEAL_SOURCES,
  type LoggedItem,
  type MealSlot,
  type Nutrients,
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
  /** Logged from a chat card: add a "Saved to …" line to the chat history. */
  fromChat: z.boolean().optional(),
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

    const log = buildMealLog(items)
    const id = await insertMealLog(db, {
      ...log,
      userId: user.id,
      slot: body.slot,
      source: body.source,
      eatenAt,
      // Portions are estimated in code (or a pack serving), never weighed.
      isEstimate: true,
      traceId: body.traceId ?? null,
    })

    if (body.fromChat) {
      // Written by the server so history only holds assistant text it produced.
      const note = `Saved to ${body.slot}: ${log.items.map((i) => i.name).join(', ')}.`
      const { error } = await db
        .from('chat_messages')
        .insert({ user_id: user.id, role: 'assistant', content: note })
      if (error) console.warn('[meals] chat note failed:', error.message)
    }
    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    console.error('[meals]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Saving the meal failed' }, { status: 500 })
  }
}

interface MealLogRow {
  id: string
  eaten_at: string
  meal_slot: MealSlot
  items: LoggedItem[]
  totals: Nutrients
  partial: string[]
}

/**
 * Meals since a point in time (the client's local midnight). In gentle mode
 * the response carries foods and grams only, no nutrient values.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const since = new Date(request.nextUrl.searchParams.get('since') ?? '')
    const now = Date.now()
    if (
      Number.isNaN(since.getTime()) ||
      since.getTime() > now ||
      since.getTime() < now - MAX_BACKDATE_MS - 24 * 60 * 60 * 1000
    ) {
      return NextResponse.json({ error: 'invalid since' }, { status: 400 })
    }

    const db = createServerClient()
    const [profile, { data, error }] = await Promise.all([
      getProfile(db, user.id),
      db
        .from('meal_logs')
        .select('id, eaten_at, meal_slot, items, totals, partial')
        .eq('user_id', user.id)
        .gte('eaten_at', since.toISOString())
        .order('eaten_at', { ascending: true })
        .limit(50),
    ])
    if (error) throw new Error(error.message)
    const gentle = profile?.safetyMode !== false

    const logs = ((data ?? []) as MealLogRow[]).map((r) => ({
      id: r.id,
      eatenAt: r.eaten_at,
      slot: r.meal_slot,
      items: r.items.map((i) => ({
        name: i.name,
        brand: i.brand,
        grams: i.grams,
        ...(gentle ? {} : { nutrients: i.nutrients }),
      })),
      ...(gentle ? {} : { totals: r.totals, partial: r.partial }),
    }))
    return NextResponse.json({ logs, gentle })
  } catch (error) {
    console.error('[meals:list]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Loading meals failed' }, { status: 500 })
  }
}
