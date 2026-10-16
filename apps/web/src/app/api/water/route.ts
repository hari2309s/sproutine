import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  createServerClient,
  getProfile,
  getTodayWater,
  addWater,
  removeWater,
} from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/** Today's water entries + profile settings. */
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const db = createServerClient()
    const profile = await getProfile(db, user.id)
    const tz = profile?.timezone ?? 'Europe/Berlin'
    const entries = await getTodayWater(db, user.id, tz)
    return NextResponse.json({
      entries,
      goalMl: profile?.waterGoalMl ?? 2000,
      glassMl: profile?.waterGlassMl ?? 250,
      gentle: profile?.safetyMode ?? false,
    })
  } catch (error) {
    console.error('[water:get]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Loading water failed' }, { status: 500 })
  }
}

const AddBody = z.object({ ml: z.number().int().positive().max(5000) })

/** Add a water entry. */
export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const body = AddBody.parse(await request.json())
    const db = createServerClient()
    const entry = await addWater(db, user.id, body.ml)
    return NextResponse.json({ entry }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    console.error('[water:post]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Adding water failed' }, { status: 500 })
  }
}

const DeleteBody = z.object({ id: z.string().uuid() })

/** Remove a water entry (long-press undo). */
export async function DELETE(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const body = DeleteBody.parse(await request.json())
    const db = createServerClient()
    const removed = await removeWater(db, user.id, body.id)
    if (!removed) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    console.error('[water:delete]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Removing water failed' }, { status: 500 })
  }
}
