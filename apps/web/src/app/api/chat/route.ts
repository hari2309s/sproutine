import { NextRequest } from 'next/server'
import {
  streamText,
  convertToModelMessages,
  toUIMessageStream,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  type TextStreamPart,
  type ToolSet,
  type UIMessage,
} from 'ai'
import { startObservation, propagateAttributes } from '@langfuse/tracing'
import {
  classifySafety,
  routeIntent,
  buildSystemPrompt,
  selectModelCandidates,
  langfuseSpanProcessor,
  groqChatProviderOptions,
  incrementUsage,
  logEval,
  consumeUserQuota,
  SAFE_RESPONSES,
  SAFETY_MAX_CHARS,
} from '@sproutine/ai'
import { createServerClient, getProfile } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'
import { signTrace } from '@/lib/feedbackToken'

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_MESSAGE_CHARS = SAFETY_MAX_CHARS
const HISTORY_LIMIT = 10
// Earlier turns are context only; cap them so a client can't inflate token use.
const MAX_HISTORY_CHARS = 16_000
// Per-user cap so one account can't drain the shared free-tier LLM budget.
const CHAT_DAILY_LIMIT = 150

type SpeechTone = 'neutral' | 'reassuring'

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// v5+ UIMessages carry text in `parts`, not a `content` string.
function textOf(m: UIMessage | undefined): string {
  return (m?.parts ?? [])
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

/**
 * Waits for the first meaningful part of a model stream. Provider failures
 * (429s, 5xx) surface as an `error` part rather than a thrown exception, so
 * this is how the fallback loop learns a provider failed before any text was
 * sent. Returns the untouched stream for the client either way.
 */
async function firstSignal<T extends ToolSet>(
  stream: ReadableStream<TextStreamPart<T>>
): Promise<{ stream: ReadableStream<TextStreamPart<T>>; error: unknown }> {
  const [probe, rest] = stream.tee()
  const reader = probe.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return { stream: rest, error: null }
      if (value.type === 'error') return { stream: rest, error: value.error }
      if (value.type !== 'start' && value.type !== 'start-step') return { stream: rest, error: null }
    }
  } finally {
    // Stop buffering for the probe; `rest` keeps the source flowing.
    reader.cancel().catch(() => {})
  }
}

/** Caps each turn and the total history, keeping the most recent turns. */
function boundHistory(messages: UIMessage[]): UIMessage[] {
  const bounded: UIMessage[] = []
  let total = 0
  for (const m of [...messages].reverse()) {
    const text = textOf(m).slice(0, MAX_MESSAGE_CHARS)
    if (!text.trim()) continue
    if (total + text.length > MAX_HISTORY_CHARS && bounded.length > 0) break
    total += text.length
    bounded.unshift({ ...m, parts: [{ type: 'text', text }] })
  }
  return bounded
}

/** Streams a fixed, pre-written reply — used for safety responses, never model output. */
function templatedResponse(text: string, metadata: Record<string, unknown>) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const id = generateId()
      writer.write({ type: 'start', messageMetadata: metadata })
      writer.write({ type: 'text-start', id })
      writer.write({ type: 'text-delta', id, delta: text })
      writer.write({ type: 'text-end', id })
      writer.write({ type: 'finish' })
    },
  })
  return createUIMessageStreamResponse({ stream })
}

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const { messages: clientMessages } = (await request.json()) as { messages?: UIMessage[] }
    if (!Array.isArray(clientMessages)) return json({ error: 'messages required' }, 400)

    const message = textOf([...clientMessages].reverse().find((m) => m.role === 'user')).trim()
    if (!message) return json({ error: 'message required' }, 400)
    if (message.length > MAX_MESSAGE_CHARS) return json({ error: 'message too long' }, 413)

    const db = createServerClient()
    const profile = await getProfile(db, user.id)
    // No health data goes to any model without recorded consent (GDPR Art. 9).
    if (!profile || !profile.consentHealthAt) return json({ error: 'onboarding required' }, 409)

    if (!(await consumeUserQuota(user.id, 'chat', CHAT_DAILY_LIMIT))) {
      return json({ error: "You've reached today's chat limit. Rosie will be back tomorrow." }, 429)
    }

    // Candidate selection only depends on the task, so start it now. The no-op
    // catch stops an early return below from leaving an unhandled rejection.
    const candidatesPromise = selectModelCandidates('fast-chat')
    candidatesPromise.catch(() => {})

    // Traces are keyed by the pseudonym, never the auth user id or email.
    return await propagateAttributes({ userId: profile.llmPseudonym }, async () => {
      const trace = startObservation('chat', { input: message })
      const meta = { traceId: trace.traceId }

      // Safety and intent are independent — run them together.
      const [safety, intent] = await Promise.all([
        classifySafety(message, meta),
        routeIntent(message, meta),
      ])
      trace.update({ metadata: { safety: safety.category, safetySource: safety.source, intent } })

      if (safety.category === 'crisis' || safety.category === 'ed_risk') {
        if (safety.category === 'ed_risk' && !profile.safetyMode) {
          const { error } = await db
            .from('profiles')
            .update({ safety_mode: true })
            .eq('user_id', user.id)
          if (error) console.error('[chat] failed to enable safety mode:', error.message)
        }
        trace.update({ output: `[safe-response:${safety.category}]` }).end()
        await langfuseSpanProcessor.forceFlush()
        return templatedResponse(SAFE_RESPONSES[safety.category], {
          traceId: trace.traceId,
          // The client renders a safety card (call rows, no feedback buttons)
          // instead of a normal bubble for these.
          safety: safety.category,
          speechTone: 'reassuring' satisfies SpeechTone,
          createdAt: new Date().toISOString(),
        })
      }

      const instructions = buildSystemPrompt({
        profile,
        intent,
        medical: safety.category === 'medical',
        today: new Date().toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'Europe/Berlin',
        }),
      })

      // Only user/assistant text is replayed; empty turns are dropped (some
      // providers reject them) and the history is bounded by turns and size.
      const history = boundHistory(
        clientMessages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-HISTORY_LIMIT)
      )
      const modelMessages = await convertToModelMessages(history)
      const speechTone: SpeechTone = safety.category === 'medical' ? 'reassuring' : 'neutral'

      // Try candidates in priority order. A provider that fails before sending
      // any text (e.g. a per-minute rate limit) falls through to the next;
      // errors after text has started surface to the client via onError.
      let lastError: unknown = null
      for (const { model, provider, modelId } of await candidatesPromise) {
        try {
          const generation = trace.startObservation(
            'streamText',
            { model: modelId, input: [{ role: 'system', content: instructions }] },
            { asType: 'generation' }
          )
          const start = Date.now()

          const result = streamText({
            model,
            instructions,
            messages: modelMessages,
            // GPT-OSS spends part of the budget on (parsed-out) reasoning.
            maxOutputTokens: 1400,
            temperature: 0.7,
            providerOptions: groqChatProviderOptions,
            onEnd: async ({ text, usage }) => {
              try {
                generation
                  .update({
                    output: text,
                    usageDetails: { input: usage.inputTokens ?? 0, output: usage.outputTokens ?? 0 },
                  })
                  .end()
                trace.update({ output: text }).end()
                await langfuseSpanProcessor.forceFlush()
              } catch (e) {
                console.error('[chat/langfuse teardown]', e)
              }
              Promise.all([
                incrementUsage(provider),
                logEval({
                  provider,
                  task: 'fast-chat',
                  latencyMs: Date.now() - start,
                  tokensUsed: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
                  traceId: trace.traceId,
                }),
              ]).catch((e) => console.error('[chat/eval log error]', e))
            },
          })

          const first = await firstSignal(result.stream)
          if (first.error) {
            generation.update({ level: 'ERROR', statusMessage: String(first.error) }).end()
            throw first.error
          }

          const stream = toUIMessageStream({
            stream: first.stream,
            // Tone (for TTS), trace id (for feedback) and a timestamp ride on
            // the assistant message.
            messageMetadata: ({ part }) =>
              part.type === 'start'
                ? {
                    traceId: trace.traceId,
                    // Proves to /api/chat/feedback that this trace is the caller's.
                    feedbackToken: signTrace(trace.traceId, profile.llmPseudonym),
                    speechTone,
                    createdAt: new Date().toISOString(),
                  }
                : undefined,
            onError: (error: unknown) => {
              console.error('[chat/stream error]', error)
              generation.update({ level: 'ERROR', statusMessage: String(error) }).end()
              trace.end()
              langfuseSpanProcessor.forceFlush().catch(() => {})
              return 'Rosie had trouble answering. Please try again.'
            },
          })
          return createUIMessageStreamResponse({ stream })
        } catch (e) {
          lastError = e
          console.warn(`[chat] provider ${provider} failed, trying next:`, (e as Error).message)
        }
      }

      console.error('[chat] all providers failed:', lastError)
      trace.end()
      await langfuseSpanProcessor.forceFlush()
      return json({ error: 'All providers are currently unavailable. Please try again shortly.' }, 503)
    })
  } catch (error) {
    console.error('[chat/route error]', error)
    return json({ error: 'Chat failed' }, 500)
  }
}
