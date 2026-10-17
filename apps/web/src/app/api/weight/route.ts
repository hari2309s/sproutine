import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  createServerClient,
  getProfile,
  getWeightLogs,
  addWeightLog,
  deleteWeightLog,
  DuplicateWeightDateError,
} from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const DaysParam = z.coerce.number().int().min(1).max(3650).default(90)

/** Weight log entries for a given number of past days. */
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const daysResult = DaysParam.safeParse(request.nextUrl.searchParams.get('days') ?? undefined)
    if (!daysResult.success)
      return NextResponse.json({ error: 'Invalid days parameter' }, { status: 400 })
    const days = daysResult.data
    const db = createServerClient()
    const entries = await getWeightLogs(db, user.id, days)
    return NextResponse.json({ entries })
  } catch (error) {
    console.error('[weight:get]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Loading weight logs failed' }, { status: 500 })
  }
}

const AddBody = z.object({
  weightKg: z.number().positive().max(500),
  loggedAt: z.string().optional(),
})

/** Add a weight log entry. */
export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const body = AddBody.parse(await request.json())
    const db = createServerClient()
    const profile = await getProfile(db, user.id)
    const tz = profile?.timezone || 'UTC'
    const entry = await addWeightLog(db, user.id, body.weightKg, body.loggedAt, tz)
    return NextResponse.json({ entry }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    if (error instanceof DuplicateWeightDateError)
      return NextResponse.json({ error: 'Weight already logged for this date' }, { status: 409 })
    console.error('[weight:post]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Adding weight log failed' }, { status: 500 })
  }
}

const DeleteBody = z.object({ id: z.string().uuid() })

/** Remove a weight log entry. */
export async function DELETE(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const body = DeleteBody.parse(await request.json())
    const db = createServerClient()
    const removed = await deleteWeightLog(db, user.id, body.id)
    if (!removed) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    console.error('[weight:delete]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Removing weight log failed' }, { status: 500 })
  }
}
