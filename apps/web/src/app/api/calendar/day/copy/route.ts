import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient, getProfile, midnightInTz } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const Body = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.string().optional(),
})

/** Copy meals from one day to another. */
export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const parsed = Body.safeParse(await request.json().catch(() => null))
    if (!parsed.success)
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

    const { fromDate, toDate, slot } = parsed.data
    if (fromDate === toDate)
      return NextResponse.json({ error: 'Source and target date must differ' }, { status: 400 })

    const db = createServerClient()
    const profile = await getProfile(db, user.id)
    const tz = profile?.timezone || 'UTC'

    const nextFrom = new Date(`${fromDate}T00:00:00Z`)
    nextFrom.setUTCDate(nextFrom.getUTCDate() + 1)
    const nextFromStr = nextFrom.toISOString().slice(0, 10)
    const rangeStart = midnightInTz(new Date(`${fromDate}T12:00:00Z`), tz)
    const rangeEnd = midnightInTz(new Date(`${nextFromStr}T12:00:00Z`), tz)

    let query = db
      .from('meal_logs')
      .select('meal_slot, items, totals, partial, source, is_estimate')
      .eq('user_id', user.id)
      .gte('eaten_at', rangeStart)
      .lt('eaten_at', rangeEnd)
    if (slot) query = query.eq('meal_slot', slot)

    const { data: sourceMeals, error: readError } = await query.order('eaten_at', { ascending: true })
    if (readError) throw new Error(readError.message)
    if (!sourceMeals?.length)
      return NextResponse.json({ error: 'No meals found on source date' }, { status: 404 })

    // Create new meal_log entries for the target date
    const rows = sourceMeals.map((meal) => ({
      user_id: user.id,
      eaten_at: `${toDate}T12:00:00`,
      meal_slot: meal.meal_slot,
      items: meal.items,
      totals: meal.totals,
      partial: meal.partial,
      source: 'copy' as const,
      is_estimate: meal.is_estimate ?? true,
      trace_id: null,
    }))

    const { error: insertError } = await db.from('meal_logs').insert(rows)
    if (insertError) throw new Error(insertError.message)

    return NextResponse.json({ copied: rows.length }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    console.error('[calendar/day/copy:post]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Copying meals failed' }, { status: 500 })
  }
}
