import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient, getProfile, getDayDetail } from '@sproutine/db'
import { RECIPES_BY_ID } from '@sproutine/food/client'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const DateParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')

/** Detailed breakdown for a single calendar day. */
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const dateResult = DateParam.safeParse(request.nextUrl.searchParams.get('date'))
    if (!dateResult.success)
      return NextResponse.json({ error: 'Invalid date parameter (YYYY-MM-DD)' }, { status: 400 })

    const db = createServerClient()
    const profile = await getProfile(db, user.id)
    const tz = profile?.timezone || 'UTC'

    const detail = await getDayDetail(db, user.id, tz, dateResult.data)
    return NextResponse.json({
      ...detail,
      meals: detail.meals.map((m) => ({
        id: m.id,
        slot: m.slot,
        items: (m.items as { name?: string; brand?: string }[]).map((i) => ({
          name: i.name ?? '',
          brand: i.brand,
        })),
        kcal: Math.round(m.totals?.kcal ?? 0),
        planned: false,
      })),
      plannedMeals:
        detail.plannedMeals?.map((p) => ({
          slot: p.slot,
          foods: RECIPES_BY_ID[p.recipeId]?.name ?? p.recipeId,
        })) ?? null,
    })
  } catch (error) {
    console.error('[calendar/day:get]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Loading day detail failed' }, { status: 500 })
  }
}
