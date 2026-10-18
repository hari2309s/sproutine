import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  createServerClient,
  getProfile,
  getOnThisDayMeal,
  recordDismissal,
} from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/** Fetch an "on this day" past meal suggestion. */
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const db = createServerClient()
    const profile = await getProfile(db, user.id)
    const tz = profile?.timezone || 'UTC'

    // In gentle/safety mode, don't surface "on this day" nudges
    if (profile?.safetyMode) {
      return NextResponse.json(null)
    }

    const data = await getOnThisDayMeal(db, user.id, tz)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[calendar/on-this-day:get]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Loading on-this-day failed' }, { status: 500 })
  }
}

const ActionBody = z.object({
  action: z.enum(['logged', 'dismissed']),
  mealLogId: z.string().uuid().optional(),
})

/** Record that the user acted on (logged or dismissed) an on-this-day suggestion. */
export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const parsed = ActionBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success)
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

    const db = createServerClient()
    await recordDismissal(db, user.id, parsed.data.mealLogId ?? null, parsed.data.action)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    console.error('[calendar/on-this-day:post]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Recording dismissal failed' }, { status: 500 })
  }
}
