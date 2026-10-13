import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { startObservation } from '@langfuse/tracing'
import { langfuseSpanProcessor } from '@truffle/ai'
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

    const trace = startObservation('voice_transcription', {
      metadata: { model: 'whisper-large-v3', mimeType: audio.type, fileSize: audio.size },
    })
    const span = trace.startObservation('whisper_transcribe', {
      input: { model: 'whisper-large-v3', language: 'en' },
    })

    const transcription = await getGroq().audio.transcriptions.create({
      file: audio,
      model: 'whisper-large-v3',
      language: 'en',
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
