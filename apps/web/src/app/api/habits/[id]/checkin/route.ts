import { NextRequest, NextResponse } from 'next/server'
import { computeStreak, milestoneReached, streakNudge } from '@sproutine/nudges'
import {
  createServerClient,
  getProfile,
  listHabits,
  toggleCheckin,
  writeNudge,
} from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'
import { foodRequestLimiter } from '@/lib/foodLimits'
import { todayIn, toHabitView } from '@/lib/habitsView'

export const runtime = 'nodejs'

/**
 * Checks a habit in for today (local date), or undoes today's check-in.
 * Reaching a streak milestone (3, 7, 14, 30) leaves a note from Rosie in chat,
 * once per habit and milestone.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    if (!foodRequestLimiter.tryAcquire(user.id)) {
      return NextResponse.json({ error: 'too many requests, slow down' }, { status: 429 })
    }
    const { id } = await params
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
      return NextResponse.json({ error: 'invalid id' }, { status: 400 })

    const db = createServerClient()
    const profile = await getProfile(db, user.id)
    if (!profile?.consentHealthAt) {
      return NextResponse.json({ error: 'onboarding required' }, { status: 409 })
    }
    const today = todayIn(profile.timezone)
    const before = (await listHabits(db, user.id)).find((h) => h.id === id)
    if (!before) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const result = await toggleCheckin(db, user.id, id, today)
    if (!result) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const after = (await listHabits(db, user.id)).find((h) => h.id === id)!
    const milestone = milestoneReached(
      computeStreak(before.period, before.checkins, today),
      computeStreak(after.period, after.checkins, today)
    )
    if (milestone) {
      await writeNudge(db, user.id, streakNudge(after, milestone, profile.safetyMode)).catch((e) =>
        console.warn('[habits] streak nudge failed:', (e as Error).message)
      )
    }
    return NextResponse.json({ habit: toHabitView(after, today), milestone })
  } catch (error) {
    console.error('[habits:checkin]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Check-in failed' }, { status: 500 })
  }
}
