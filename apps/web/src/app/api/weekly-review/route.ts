import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  createServerClient,
  getProfile,
  getWeeklyStats,
  getStreak,
} from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const QueryParams = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'weekStart must be an ISO date (YYYY-MM-DD)'),
})

/** Weekly review stats including streak. */
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const parsed = QueryParams.safeParse({
      weekStart: request.nextUrl.searchParams.get('weekStart'),
    })
    if (!parsed.success)
      return NextResponse.json({ error: 'weekStart is required (YYYY-MM-DD)' }, { status: 400 })

    const { weekStart } = parsed.data
    const db = createServerClient()
    const profile = await getProfile(db, user.id)
    const tz = profile?.timezone ?? 'Europe/Berlin'

    const [stats, streak] = await Promise.all([
      getWeeklyStats(db, user.id, tz, weekStart, profile?.waterGlassMl),
      getStreak(db, user.id, tz),
    ])

    return NextResponse.json({ ...stats, streak })
  } catch (error) {
    console.error('[weekly-review:get]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Loading weekly review failed' }, { status: 500 })
  }
}
