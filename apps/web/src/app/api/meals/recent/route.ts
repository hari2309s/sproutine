import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient, getProfile } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const DaysParam = z.coerce.number().int().min(1).max(90).default(14)
const SlotParam = z.string().optional()

/** Recent meals for the last N days, optionally filtered by slot. */
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const daysResult = DaysParam.safeParse(request.nextUrl.searchParams.get('days') ?? undefined)
    if (!daysResult.success)
      return NextResponse.json({ error: 'Invalid days parameter' }, { status: 400 })
    const days = daysResult.data

    const slot = request.nextUrl.searchParams.get('slot') ?? undefined
    const slotResult = SlotParam.safeParse(slot)
    if (!slotResult.success)
      return NextResponse.json({ error: 'Invalid slot parameter' }, { status: 400 })

    const db = createServerClient()
    const profile = await getProfile(db, user.id)
    const tz = profile?.timezone || 'UTC'

    const since = new Date()
    since.setDate(since.getDate() - days)

    let query = db
      .from('meal_logs')
      .select('id, eaten_at, meal_slot, items, totals')
      .eq('user_id', user.id)
      .gte('eaten_at', since.toISOString())
      .order('eaten_at', { ascending: false })
      .limit(200)

    if (slot) query = query.eq('meal_slot', slot)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    // Group by slot
    const grouped: Record<string, typeof data> = {}
    for (const row of data ?? []) {
      const s = (row as { meal_slot: string }).meal_slot
      if (!grouped[s]) grouped[s] = []
      grouped[s].push(row)
    }

    return NextResponse.json({ meals: grouped })
  } catch (error) {
    console.error('[meals/recent:get]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Loading recent meals failed' }, { status: 500 })
  }
}
