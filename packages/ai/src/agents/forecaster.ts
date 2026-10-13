import type { LangfuseSpan } from '@langfuse/tracing'
import { routedGenerateText } from '../router'
import { FORECASTER_PROMPT } from '../prompts/forecaster.prompt'
import { computeMonthProjection } from './projection'
import type { Transaction, MonthlySnapshot } from '@truffle/types'

export async function forecastSpending(
  query: string,
  transactions: Transaction[],
  snapshot: MonthlySnapshot,
  parentSpan?: LangfuseSpan
): Promise<string> {
  const { daysElapsed, daysRemaining, dailySpendRate, projectedBalance } =
    computeMonthProjection(snapshot)

  const context = transactions
    .slice(0, 20)
    .map((t) => `${t.date}: ${t.description} (${t.category}) €${t.amount}`)
    .join('\n')

  const prompt = FORECASTER_PROMPT.replace('{currentBalance}', snapshot.balance.toFixed(2))
    .replace('{daysElapsed}', String(daysElapsed))
    .replace('{daysRemaining}', String(daysRemaining))
    .replace('{dailySpendRate}', dailySpendRate.toFixed(2))
    .replace('{projectedBalance}', projectedBalance.toFixed(2))
    .replace('{totalIncome}', snapshot.totalIncome.toFixed(2))
    .replace('{totalExpenses}', Math.abs(snapshot.totalExpenses).toFixed(2))
    .replace('{question}', query)
    .replace('{context}', context)

  const gen = parentSpan?.startObservation(
    'forecastSpending',
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
