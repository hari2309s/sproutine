import { NextRequest, NextResponse } from 'next/server'
import { isValidBarcode, lookupBarcode, RateLimitedError } from '@sproutine/food'
import { consumeUserQuota } from '@sproutine/ai'
import { createFoodCache, createServerClient } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const FOOD_DAILY_LIMIT = 300

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const { code } = await params
    if (!isValidBarcode(code)) return NextResponse.json({ error: 'invalid barcode' }, { status: 400 })

    if (!(await consumeUserQuota(user.id, 'food', FOOD_DAILY_LIMIT))) {
      return NextResponse.json({ error: 'daily food lookup limit reached' }, { status: 429 })
    }

    const food = await lookupBarcode(code, createFoodCache(createServerClient(), user.id))
    if (!food) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ food })
  } catch (error) {
    if (error instanceof RateLimitedError) {
      // OFF is busy; the client can retry shortly or search by name instead.
      return NextResponse.json({ error: 'lookup busy, try again shortly' }, { status: 503 })
    }
    console.error('[food/barcode]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Barcode lookup failed' }, { status: 500 })
  }
}
