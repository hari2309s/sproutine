import { after, NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { propagateAttributes, startActiveObservation } from '@langfuse/tracing'
import { langfuseSpanProcessor, MODELS, consumeUserQuota } from '@sproutine/ai'
import { createServerClient, getEntitlement, getProfile } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'

const VOICE_DAILY_LIMIT = 100

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
}

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const formData = await request.formData()
    const audio = formData.get('audio') as File | null

    if (!audio) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }
    if (!audio.type.startsWith('audio/')) {
      return NextResponse.json({ error: 'Invalid file type — must be audio' }, { status: 400 })
    }
    if (audio.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio file too large (max 25 MB)' }, { status: 400 })
    }

    // Speech about eating is health data: same consent gate as chat.
    const db = createServerClient()
    const profile = await getProfile(db, user.id)
    if (!profile || !profile.consentHealthAt) {
      return NextResponse.json({ error: 'onboarding required' }, { status: 409 })
    }
    if (!(await getEntitlement(db, user.id)).pro) {
      return NextResponse.json(
        { error: 'Voice logging is part of Pro.', code: 'pro_required' },
        { status: 402 }
      )
    }

    // Per-user cap: Whisper calls share the app-wide Groq budget.
    if (!(await consumeUserQuota(user.id, 'voice', VOICE_DAILY_LIMIT))) {
      return NextResponse.json(
        { error: "You've reached today's voice limit. Typing still works." },
        { status: 429 }
      )
    }

    after(() => langfuseSpanProcessor.forceFlush())

    const model = MODELS.groq.transcription
    const transcript = await propagateAttributes(
      { traceName: 'transcribe-voice', userId: profile.llmPseudonym, tags: ['voice'] },
      () =>
        startActiveObservation('transcribe-voice', async (span) => {
          span.update({ input: { mimeType: audio.type, bytes: audio.size } })
          // Whisper isn't called through the AI SDK, so record the generation
          // manually to keep the model on the trace.
          const text = await startActiveObservation(
            'transcribe-audio',
            async (generation) => {
              generation.update({ model, input: { mimeType: audio.type, bytes: audio.size } })
              // No fixed language: users mix English with German food names
              // ("zwei Brötchen mit Quark"), and Whisper's auto-detect handles both.
              const result = await getGroq().audio.transcriptions.create({
                file: audio,
                model,
                response_format: 'json',
              })
              generation.update({ output: result.text })
              return result.text
            },
            { asType: 'generation' }
          )
          span.update({ output: text })
          return text
        })
    )

    return NextResponse.json({ transcript })
  } catch (error) {
    console.error('Voice transcription error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
