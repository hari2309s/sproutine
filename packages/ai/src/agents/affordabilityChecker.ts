import type { LangfuseSpan } from '@langfuse/tracing'
import { routedGenerateText } from '../router'
import { AFFORDABILITY_CHECKER_PROMPT } from '../prompts/affordabilityChecker.prompt'
import { computeMonthProjection } from './projection'
import type { Transaction, MonthlySnapshot } from '@truffle/types'

export async function checkAffordability(
  query: string,
  transactions: Transaction[],
  snapshot: MonthlySnapshot,
  parentSpan?: LangfuseSpan
): Promise<string> {
  const { daysRemaining, projectedBalance } = computeMonthProjection(snapshot)

  const context = transactions
    .slice(0, 20)
    .map((t) => `${t.date}: ${t.description} (${t.category}) €${t.amount}`)
    .join('\n')

  const prompt = AFFORDABILITY_CHECKER_PROMPT.replace(
    '{currentBalance}',
    snapshot.balance.toFixed(2)
  )
    .replace('{totalIncome}', snapshot.totalIncome.toFixed(2))
    .replace('{totalExpenses}', Math.abs(snapshot.totalExpenses).toFixed(2))
    .replace('{projectedBalance}', projectedBalance.toFixed(2))
    .replace('{daysRemaining}', String(daysRemaining))
    .replace('{context}', context)
    .replace('{question}', query)

  const gen = parentSpan?.startObservation(
    'checkAffordability',
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
