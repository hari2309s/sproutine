import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, getProfile, getStreak } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/** Current streak, best streak, and next milestone. */
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const db = createServerClient()
    const profile = await getProfile(db, user.id)
    const tz = profile?.timezone ?? 'Europe/Berlin'
    const { current, best, milestone } = await getStreak(db, user.id, tz)
    return NextResponse.json({ current, best, milestone })
  } catch (error) {
    console.error('[streaks:get]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Loading streak failed' }, { status: 500 })
  }
}
