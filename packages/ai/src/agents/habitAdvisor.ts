import type { LangfuseSpan } from '@langfuse/tracing'
import { routedGenerateText } from '../router'

export async function adviseHabit(query: string, parentSpan?: LangfuseSpan): Promise<string> {
  const gen = parentSpan?.startObservation(
    'adviseHabit',
    { model: 'routed', input: query },
    { asType: 'generation' }
  )

  const { text, usage } = await routedGenerateText(
    'fast-chat',
    { prompt: query, maxOutputTokens: 450 }, // headroom for GPT-OSS reasoning tokens + the answer
    { traceId: parentSpan?.traceId }
  )

  gen
    ?.update({
      output: text,
      usageDetails: usage ? { input: usage.promptTokens, output: usage.completionTokens } : undefined,
    })
    .end()

  return text
}
