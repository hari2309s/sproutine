import type { LangfuseSpan } from '@langfuse/tracing'
import { routedGenerateText } from '../router'
import { SPENDING_ANALYST_PROMPT } from '../prompts/spendingAnalyst.prompt'
import type { Transaction, MonthlySnapshot } from '@truffle/types'

export async function analyseSpending(
  query: string,
  transactions: Transaction[],
  snapshot: MonthlySnapshot,
  parentSpan?: LangfuseSpan
): Promise<string> {
  const context = transactions
    .slice(0, 30)
    .map((t) => `${t.date}: ${t.description} (${t.category}) €${t.amount}`)
    .join('\n')

  const prompt = SPENDING_ANALYST_PROMPT.replace('{context}', context)
    .replace('{question}', query)
    .replace('{currentMonth}', snapshot.month)
    .replace('{totalSpent}', Math.abs(snapshot.totalExpenses).toFixed(2))
    .replace('{totalIncome}', snapshot.totalIncome.toFixed(2))

  const gen = parentSpan?.startObservation(
    'analyseSpending',
    { model: 'routed', input: prompt },
    { asType: 'generation' }
  )

  const { text, usage } = await routedGenerateText(
    'fast-chat',
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
