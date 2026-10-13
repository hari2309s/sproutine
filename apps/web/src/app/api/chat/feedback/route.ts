import { NextRequest, NextResponse } from 'next/server'
import { langfuseClient } from '@sproutine/ai'
import { createServerClient, getProfile } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'
import { verifyTrace } from '@/lib/feedbackToken'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const { traceId, token, score } = (await request.json()) as {
      traceId?: unknown
      token?: unknown
      score?: unknown
    }
    if (typeof traceId !== 'string' || typeof token !== 'string' || (score !== 1 && score !== -1)) {
      return NextResponse.json({ error: 'traceId, token and score (1 or -1) required' }, { status: 400 })
    }

    // Only the user a reply was generated for may score it.
    const profile = await getProfile(createServerClient(), user.id)
    if (!profile || !verifyTrace(traceId, profile.llmPseudonym, token)) {
      return NextResponse.json({ error: 'Unknown trace' }, { status: 404 })
    }

    langfuseClient.score.create({
      traceId,
      name: 'user-feedback',
      value: score,
      dataType: 'NUMERIC',
      comment: score === 1 ? 'thumbs_up' : 'thumbs_down',
    })
    await langfuseClient.score.flush()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 })
  }
}
