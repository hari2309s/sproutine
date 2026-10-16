import { NextRequest, NextResponse } from 'next/server'
import { MEAL_SLOTS } from '@sproutine/food'
import {
  createServerClient,
  getProfile,
  getYesterdayMeals,
} from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/** Get yesterday's meals for a given slot. */
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const slot = request.nextUrl.searchParams.get('slot')
    if (!slot || !(MEAL_SLOTS as readonly string[]).includes(slot))
      return NextResponse.json({ error: 'Invalid slot' }, { status: 400 })

    const db = createServerClient()
    const profile = await getProfile(db, user.id)
    const tz = profile?.timezone ?? 'Europe/Berlin'
    const meals = await getYesterdayMeals(
      db,
      user.id,
      slot as (typeof MEAL_SLOTS)[number],
      tz
    )
    return NextResponse.json({ meals })
  } catch (error) {
    console.error('[yesterday:get]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Loading yesterday failed' }, { status: 500 })
  }
}
