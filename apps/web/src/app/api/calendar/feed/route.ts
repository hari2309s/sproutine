import { NextRequest, NextResponse } from 'next/server'
import {
  createServerClient,
  getOrCreateFeedToken,
  resetFeedToken,
  revokeFeedToken,
} from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/** Get the current iCal feed token (creates one if none exists). */
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const db = createServerClient()
    const { token } = await getOrCreateFeedToken(db, user.id)
    return NextResponse.json({ token })
  } catch (error) {
    console.error('[calendar/feed:get]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Loading feed token failed' }, { status: 500 })
  }
}

/** Reset (rotate) the feed token. */
export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const db = createServerClient()
    const { token } = await resetFeedToken(db, user.id)
    return NextResponse.json({ token })
  } catch (error) {
    console.error('[calendar/feed:post]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Resetting feed token failed' }, { status: 500 })
  }
}

/** Revoke the feed token (disables the public feed). */
export async function DELETE(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const db = createServerClient()
    await revokeFeedToken(db, user.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[calendar/feed:delete]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Revoking feed token failed' }, { status: 500 })
  }
}
