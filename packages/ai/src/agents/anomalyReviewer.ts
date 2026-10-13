import type { LangfuseSpan } from '@langfuse/tracing'
import { routedGenerateText } from '../router'
import { ANOMALY_REVIEWER_PROMPT } from '../prompts/anomalyReviewer.prompt'
import type { Transaction, Anomaly } from '@truffle/types'

export async function reviewAnomalies(
  query: string,
  transactions: Transaction[],
  anomalies: Anomaly[],
  parentSpan?: LangfuseSpan
): Promise<string> {
  const anomalyText =
    anomalies.length > 0
      ? anomalies.map((a) => `[${a.severity}] ${a.description}`).join('\n')
      : 'No anomalies detected — spending patterns look normal.'

  const context = transactions
    .slice(0, 20)
    .map((t) => `${t.date}: ${t.description} (${t.category}) €${t.amount}`)
    .join('\n')

  const prompt = ANOMALY_REVIEWER_PROMPT.replace('{anomalies}', anomalyText)
    .replace('{context}', context)
    .replace('{question}', query)

  const gen = parentSpan?.startObservation(
    'reviewAnomalies',
    { model: 'routed', input: prompt },
    { asType: 'generation' }
  )

  const { text, usage } = await routedGenerateText(
    'reasoning',
    { prompt, maxOutputTokens: 600 }, // headroom for GPT-OSS reasoning tokens + the answer
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
