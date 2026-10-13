import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { startObservation } from '@langfuse/tracing'
import { langfuseSpanProcessor, MODELS } from '@sproutine/ai'
import { requireUser } from '@/lib/supabase-server'

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
}

export async function POST(request: NextRequest) {
  try {
    const { errorResponse } = await requireUser(request)
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

    const model = MODELS.groq.transcription
    const trace = startObservation('voice_transcription', {
      metadata: { model, mimeType: audio.type, fileSize: audio.size },
    })
    const span = trace.startObservation('whisper_transcribe', { input: { model } })

    // No fixed language: users mix English with German food names
    // ("zwei Brötchen mit Quark"), and Whisper's auto-detect handles both.
    const transcription = await getGroq().audio.transcriptions.create({
      file: audio,
      model,
      response_format: 'json',
    })

    span.update({ output: transcription.text }).end()
    trace.end()
    await langfuseSpanProcessor.forceFlush()

    return NextResponse.json({ transcript: transcription.text })
  } catch (error) {
    console.error('Voice transcription error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
