import type { LangfuseSpan } from '@langfuse/tracing'
import { routedGenerateText } from '../router'
import { SAVINGS_GOAL_ADVISOR_PROMPT } from '../prompts/savingsGoalAdvisor.prompt'
import type { SavingsGoal, MonthlySnapshot } from '@truffle/types'

export async function adviseSavingsGoals(
  query: string,
  goals: SavingsGoal[],
  snapshot: MonthlySnapshot,
  parentSpan?: LangfuseSpan
): Promise<string> {
  const goalsText =
    goals.length > 0
      ? goals
          .map((g) => {
            const progress = ((g.savedAmount / g.targetAmount) * 100).toFixed(0)
            const remaining = Math.max(0, g.targetAmount - g.savedAmount)
            const deadlineInfo = g.deadline ? ` — deadline ${g.deadline}` : ''
            return `${g.emoji} ${g.name}: €${g.savedAmount} saved of €${g.targetAmount} (${progress}%${deadlineInfo}), €${remaining.toFixed(0)} remaining`
          })
          .join('\n')
      : 'No savings goals set yet.'

  const prompt = SAVINGS_GOAL_ADVISOR_PROMPT.replace('{goals}', goalsText)
    .replace('{totalIncome}', snapshot.totalIncome.toFixed(2))
    .replace('{totalExpenses}', Math.abs(snapshot.totalExpenses).toFixed(2))
    .replace('{currentBalance}', snapshot.balance.toFixed(2))
    .replace('{question}', query)

  const gen = parentSpan?.startObservation(
    'adviseSavingsGoals',
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
