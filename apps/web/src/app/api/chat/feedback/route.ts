import { NextRequest, NextResponse } from 'next/server'
import { langfuseClient } from '@truffle/ai'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const { traceId, score } = await request.json()
    if (!traceId || (score !== 1 && score !== -1)) {
      return NextResponse.json({ error: 'traceId and score (1 or -1) required' }, { status: 400 })
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
