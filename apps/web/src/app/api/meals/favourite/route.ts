import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  createServerClient,
  setFavourite,
  getFavourites,
} from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/** List favourite meals. */
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const db = createServerClient()
    const favourites = await getFavourites(db, user.id)
    return NextResponse.json({ favourites })
  } catch (error) {
    console.error('[favourite:get]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Loading favourites failed' }, { status: 500 })
  }
}

const Body = z.object({
  logId: z.string().uuid(),
  isFavourite: z.boolean(),
})

/** Toggle favourite on a meal log. */
export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const body = Body.parse(await request.json())
    const db = createServerClient()
    await setFavourite(db, user.id, body.logId, body.isFavourite)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    console.error('[favourite:post]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Toggling favourite failed' }, { status: 500 })
  }
}
