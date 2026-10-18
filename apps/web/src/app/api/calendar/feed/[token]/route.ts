import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, getUserByFeedToken } from '@sproutine/db'
import { buildIcs, type IcsMeal } from '@/lib/icsBuilder'

export const runtime = 'nodejs'

/**
 * Public iCal feed endpoint — no auth required.
 * Looks up the user by feed token and returns planned meals as an .ics file.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    if (!token || token.length < 16)
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

    const db = createServerClient()
    const feedUser = await getUserByFeedToken(db, token)
    if (!feedUser)
      return NextResponse.json({ error: 'Unknown or revoked feed token' }, { status: 404 })

    // Fetch planned meals for the next 14 days
    const now = new Date()
    const end = new Date(now)
    end.setDate(end.getDate() + 14)

    const { data, error } = await db
      .from('meal_plans')
      .select('plan')
      .eq('user_id', feedUser.userId)
      .eq('status', 'active')
      .order('week_start', { ascending: true })

    if (error) throw new Error(error.message)

    const todayStr = now.toISOString().slice(0, 10)
    const endStr = end.toISOString().slice(0, 10)
    const meals: IcsMeal[] = []

    for (const row of data ?? []) {
      const plan = row.plan as { days?: { date: string; meals: Record<string, string> }[] }
      if (!plan?.days) continue
      for (const day of plan.days) {
        if (day.date < todayStr || day.date > endStr) continue
        for (const [slot, foods] of Object.entries(day.meals)) {
          if (foods) meals.push({ date: day.date, slot, foods })
        }
      }
    }

    const ics = buildIcs(meals, 'Sproutine Meals')
    return new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('[calendar/feed/token:get]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Feed generation failed' }, { status: 500 })
  }
}
