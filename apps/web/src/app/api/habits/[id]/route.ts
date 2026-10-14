import { NextRequest, NextResponse } from 'next/server'
import { archiveHabit, createServerClient } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/** Stops a habit (its check-ins are kept). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const { id } = await params
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
      return NextResponse.json({ error: 'invalid id' }, { status: 400 })
    const ok = await archiveHabit(createServerClient(), user.id, id)
    return ok
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json({ error: 'not found' }, { status: 404 })
  } catch (error) {
    console.error('[habits:delete]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Removing the habit failed' }, { status: 500 })
  }
}
