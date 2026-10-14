import { NextRequest, NextResponse } from 'next/server'
import { searchFood } from '@sproutine/food'
import { consumeUserQuota } from '@sproutine/ai'
import { createFoodCache, createServerClient } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'
import { FOOD_DAILY_LIMIT, foodExternalLimiter, foodRequestLimiter } from '@/lib/foodLimits'

export const runtime = 'nodejs'

const MAX_QUERY = 120

export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
    if (q.length < 2) return NextResponse.json({ error: 'query too short' }, { status: 400 })
    if (q.length > MAX_QUERY) return NextResponse.json({ error: 'query too long' }, { status: 400 })

    if (!foodRequestLimiter.tryAcquire(user.id)) {
      return NextResponse.json({ error: 'too many lookups, slow down' }, { status: 429 })
    }
    if (!(await consumeUserQuota(user.id, 'food', FOOD_DAILY_LIMIT))) {
      return NextResponse.json({ error: 'daily food lookup limit reached' }, { status: 429 })
    }

    const cache = createFoodCache(createServerClient(), user.id)
    const result = await searchFood(q, cache, {
      canCallExternal: () => foodExternalLimiter.tryAcquire(user.id),
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('[food/search]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Food search failed' }, { status: 500 })
  }
}
