import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient, getProfile, getMonthSummary } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const MonthParam = z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM')

/** Calendar month summary: per-day stats for the given month. */
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const monthResult = MonthParam.safeParse(request.nextUrl.searchParams.get('month'))
    if (!monthResult.success)
      return NextResponse.json({ error: 'Invalid month parameter (YYYY-MM)' }, { status: 400 })

    const db = createServerClient()
    const profile = await getProfile(db, user.id)
    const tz = profile?.timezone || 'UTC'

    const days = await getMonthSummary(db, user.id, tz, monthResult.data)
    return NextResponse.json({ days })
  } catch (error) {
    console.error('[calendar/month:get]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Loading month summary failed' }, { status: 500 })
  }
}
