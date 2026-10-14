import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { HABIT_PERIODS } from '@sproutine/nudges'
import { createHabit, createServerClient, getProfile, listHabits, MAX_HABITS } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'
import { foodRequestLimiter } from '@/lib/foodLimits'
import { todayIn, toHabitView } from '@/lib/habitsView'

export const runtime = 'nodejs'

/** Active habits with streaks, by the person's local date. */
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const db = createServerClient()
    const [profile, habits] = await Promise.all([getProfile(db, user.id), listHabits(db, user.id)])
    const today = todayIn(profile?.timezone ?? 'Europe/Berlin')
    return NextResponse.json({ habits: habits.map((h) => toHabitView(h, today)) })
  } catch (error) {
    console.error('[habits:get]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Loading habits failed' }, { status: 500 })
  }
}

const Body = z.object({
  title: z.string().trim().min(1).max(60),
  period: z.enum(HABIT_PERIODS),
})

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    if (!foodRequestLimiter.tryAcquire(user.id)) {
      return NextResponse.json({ error: 'too many requests, slow down' }, { status: 429 })
    }
    const body = Body.safeParse(await request.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'invalid habit' }, { status: 400 })

    const db = createServerClient()
    const profile = await getProfile(db, user.id)
    if (!profile?.consentHealthAt) {
      return NextResponse.json({ error: 'onboarding required' }, { status: 409 })
    }
    if ((await listHabits(db, user.id)).length >= MAX_HABITS) {
      return NextResponse.json({ error: 'too many habits' }, { status: 422 })
    }
    const id = await createHabit(db, user.id, body.data)
    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    console.error('[habits:post]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Saving the habit failed' }, { status: 500 })
  }
}
