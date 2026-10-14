import { NextRequest, NextResponse } from 'next/server'
import {
  isValidBarcode,
  lookupBarcode,
  RateLimitedError,
  UserRateLimitedError,
  withoutNutrients,
} from '@sproutine/food'
import { consumeUserQuota } from '@sproutine/ai'
import { createFoodCache, createServerClient, getProfile } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'
import {
  FOOD_DAILY_LIMIT,
  foodExternalLimiter,
  foodRequestLimiter,
  unknownBarcodes,
} from '@/lib/foodLimits'

export const runtime = 'nodejs'

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const { code } = await params
    if (!isValidBarcode(code))
      return NextResponse.json({ error: 'invalid barcode' }, { status: 400 })

    if (!foodRequestLimiter.tryAcquire(user.id)) {
      return NextResponse.json({ error: 'too many lookups, slow down' }, { status: 429 })
    }
    if (!(await consumeUserQuota(user.id, 'food', FOOD_DAILY_LIMIT))) {
      return NextResponse.json({ error: 'daily food lookup limit reached' }, { status: 429 })
    }

    const db = createServerClient()
    const food = await lookupBarcode(code, createFoodCache(db, user.id), undefined, {
      canCallExternal: () => foodExternalLimiter.tryAcquire(user.id),
      unknownBarcodes,
    })
    if (!food) return NextResponse.json({ error: 'not found' }, { status: 404 })
    // Gentle mode: no nutrient values leave the server.
    const profile = await getProfile(db, user.id)
    return NextResponse.json({
      food: profile?.safetyMode !== false ? withoutNutrients(food) : food,
    })
  } catch (error) {
    if (error instanceof UserRateLimitedError) {
      return NextResponse.json({ error: 'too many new lookups, slow down' }, { status: 429 })
    }
    if (error instanceof RateLimitedError) {
      // OFF is busy; the client can retry shortly or search by name instead.
      return NextResponse.json({ error: 'lookup busy, try again shortly' }, { status: 503 })
    }
    console.error('[food/barcode]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Barcode lookup failed' }, { status: 500 })
  }
}
