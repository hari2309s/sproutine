import { NextRequest, NextResponse } from 'next/server'
import { keywordScreen } from '@sproutine/ai'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const MAX_CHARS = 2000

/**
 * For Free users before the Pro gate: does this message need the crisis reply?
 * The keyword screen is deterministic and makes no model call, so it's free,
 * and Free users still reach helplines through chat.
 */
export async function POST(request: NextRequest) {
  const { errorResponse } = await requireUser(request)
  if (errorResponse) return errorResponse
  const body = (await request.json().catch(() => null)) as { message?: unknown } | null
  const message = typeof body?.message === 'string' ? body.message.slice(0, MAX_CHARS) : ''
  const category = message ? keywordScreen(message)?.category : undefined
  return NextResponse.json({ urgent: category === 'crisis' || category === 'ed_risk' })
}
