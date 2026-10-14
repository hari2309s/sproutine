import { NextRequest, NextResponse } from 'next/server'
import { searchFood } from '@sproutine/food'
import { consumeUserQuota } from '@sproutine/ai'
import { createFoodCache, createServerClient } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

// Cache misses reach Open Food Facts (10 searches/min per server IP), so cap
// each user to keep one account from starving everyone else.
const FOOD_DAILY_LIMIT = 300
const MAX_QUERY = 120

export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
    if (q.length < 2) return NextResponse.json({ error: 'query too short' }, { status: 400 })
    if (q.length > MAX_QUERY) return NextResponse.json({ error: 'query too long' }, { status: 400 })

    if (!(await consumeUserQuota(user.id, 'food', FOOD_DAILY_LIMIT))) {
      return NextResponse.json({ error: 'daily food lookup limit reached' }, { status: 429 })
    }

    const cache = createFoodCache(createServerClient(), user.id)
    const result = await searchFood(q, cache)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[food/search]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Food search failed' }, { status: 500 })
  }
}
