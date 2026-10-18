import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient, getProfile } from '@sproutine/db'
import { RECIPES_BY_ID } from '@sproutine/food/client'
import { requireUser } from '@/lib/supabase-server'
import { buildIcs, type IcsMeal } from '@/lib/icsBuilder'

export const runtime = 'nodejs'

const RangeParam = z.enum(['7', '14', 'all']).default('14')

/** Download an .ics file of planned meals for a given range. */
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const rangeResult = RangeParam.safeParse(request.nextUrl.searchParams.get('range') ?? undefined)
    if (!rangeResult.success)
      return NextResponse.json({ error: 'Invalid range (7, 14, or all)' }, { status: 400 })
    const range = rangeResult.data

    const db = createServerClient()
    const profile = await getProfile(db, user.id)
    const tz = profile?.timezone || 'UTC'

    const now = new Date()
    const { data, error } = await db
      .from('meal_plans')
      .select('plan')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('week_start', { ascending: true })
    if (error) throw new Error(error.message)

    // Extract individual meals from plan data
    const meals: IcsMeal[] = []
    for (const row of data ?? []) {
      const plan = row.plan as { days?: { date: string; meals: Record<string, string> }[] }
      if (!plan?.days) continue
      for (const day of plan.days) {
        // Filter by date range
        if (range !== 'all') {
          const end = new Date(now)
          end.setDate(end.getDate() + Number(range))
          if (day.date < now.toISOString().slice(0, 10) || day.date > end.toISOString().slice(0, 10))
            continue
        }
        for (const [slot, recipeId] of Object.entries(day.meals)) {
          if (recipeId)
            meals.push({ date: day.date, slot, foods: RECIPES_BY_ID[recipeId]?.name ?? recipeId })
        }
      }
    }

    const ics = buildIcs(meals, 'Sproutine Meal Plan')
    return new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="sproutine-meals.ics"`,
      },
    })
  } catch (error) {
    console.error('[calendar/export:get]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Exporting calendar failed' }, { status: 500 })
  }
}
