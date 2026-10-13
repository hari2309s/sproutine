import { generateText } from 'ai'
import { StateGraph, END, START } from '@langchain/langgraph'
import { startObservation, propagateAttributes, type LangfuseSpan } from '@langfuse/tracing'
import type { Transaction, Anomaly, SavingsGoal, MonthlySnapshot } from '@truffle/types'
import { reviewAnomalies } from './agents/anomalyReviewer'
import { adviseSavingsGoals } from './agents/savingsGoalAdvisor'
import { adviseHabit } from './agents/habitAdvisor'
import { GraphAnnotation } from './graph'
import { chatModel, groqProviderOptions } from './llm'
import { langfuseSpanProcessor } from './langfuse'
import { currentYearMonth } from './date'

type ProactiveState = typeof GraphAnnotation.State

function sanitize(text: unknown, maxLen = 120): string {
  return String(text ?? '')
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[\u200b-\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxLen)
}

function emptySnapshot(): MonthlySnapshot {
  return {
    month: currentYearMonth(),
    totalIncome: 0,
    totalExpenses: 0,
    byCategory: {} as MonthlySnapshot['byCategory'],
    savingsRate: 0,
    balance: 0,
  }
}

function routeByIntent(state: ProactiveState): string {
  if (state.intent === 'anomaly_review') return 'anomalyNudge'
  if (state.intent === 'habit_setting') return 'habitNudge'
  return 'goalNudge'
}

/**
 * Proactive graph — skips the intent router since the trigger already tells us
 * what kind of insight to surface. Routes directly to the relevant analyst node.
 * traceId is threaded via closure so each node can attach child generations to
 * the parent Langfuse trace.
 */
function buildProactiveGraph(parentSpan: LangfuseSpan) {
  async function anomalyNudgeNode(state: ProactiveState): Promise<Partial<ProactiveState>> {
    const response = await reviewAnomalies(
      state.userQuery,
      state.transactions,
      state.anomalies,
      parentSpan
    )
    return { agentResponse: response }
  }

  async function goalNudgeNode(state: ProactiveState): Promise<Partial<ProactiveState>> {
    const response = await adviseSavingsGoals(
      state.userQuery,
      state.savingsGoals,
      state.currentMonth ?? emptySnapshot(),
      parentSpan
    )
    return { agentResponse: response }
  }

  async function habitNudgeNode(state: ProactiveState): Promise<Partial<ProactiveState>> {
    const response = await adviseHabit(state.userQuery, parentSpan)
    return { agentResponse: response }
  }

  return new StateGraph(GraphAnnotation)
    .addNode('anomalyNudge', anomalyNudgeNode)
    .addNode('goalNudge', goalNudgeNode)
    .addNode('habitNudge', habitNudgeNode)
    .addConditionalEdges(START, routeByIntent, {
      anomalyNudge: 'anomalyNudge',
      goalNudge: 'goalNudge',
      habitNudge: 'habitNudge',
    })
    .addEdge('anomalyNudge', END)
    .addEdge('goalNudge', END)
    .addEdge('habitNudge', END)
    .compile()
}

interface AnomalyTrigger {
  type: 'anomaly'
  anomaly: Anomaly
  transactions: Transaction[]
  snapshot: MonthlySnapshot | null
}

interface GoalMilestoneTrigger {
  type: 'goal_milestone'
  goal: SavingsGoal
  milestone: 25 | 50 | 75 | 100
  snapshot: MonthlySnapshot | null
}

interface GoalAtRiskTrigger {
  type: 'goal_at_risk'
  goal: SavingsGoal
  daysRemaining: number
  projectedShortfall: number
}

interface HabitStreakTrigger {
  type: 'habit_streak'
  habitId: string
  habitName: string
  habitEmoji: string
  streak: number
}

interface HabitCheckInTrigger {
  type: 'habit_check_in'
  habitId: string
  habitName: string
  habitEmoji: string
  frequency: 'weekly' | 'monthly'
  amount: number
  period: string
  lastStreak: number
}

interface BudgetWarningTrigger {
  type: 'budget_warning'
  category: string
  categoryEmoji: string
  spentAmount: number
  budgetAmount: number
  percentUsed: number // 80 = 80%, 100+ = over budget
  month: string // YYYY-MM
}

interface MonthlyReportTrigger {
  type: 'monthly_report'
  month: string // YYYY-MM (the reported month)
  monthName: string // e.g. "May 2026"
  totalIncome: number
  totalExpenses: number // negative value
  balance: number
  savingsRate: number
  topCategories: Array<{ category: string; amount: number }> // amount is negative for expenses
  goals: Array<{ name: string; emoji: string; pct: number }>
  habits: Array<{ name: string; emoji: string; streak: number }>
}

type ProactiveTrigger =
  | AnomalyTrigger
  | GoalMilestoneTrigger
  | GoalAtRiskTrigger
  | HabitStreakTrigger
  | HabitCheckInTrigger
  | BudgetWarningTrigger
  | MonthlyReportTrigger

function getNudgeKey(trigger: ProactiveTrigger): string {
  switch (trigger.type) {
    case 'anomaly':
      return `anomaly:${trigger.anomaly.transactionId}`
    case 'goal_milestone':
      return `goal:${trigger.goal.id}:${trigger.milestone}`
    case 'goal_at_risk':
      return `goal-at-risk:${trigger.goal.id}:${currentYearMonth()}`
    case 'habit_streak':
      return `habit-streak:${trigger.habitId}:${trigger.streak}`
    case 'habit_check_in':
      return `habit-checkin:${trigger.habitId}:${trigger.period}`
    case 'budget_warning':
      return `budget-warning:${trigger.category}:${trigger.month}:${trigger.percentUsed >= 100 ? '100' : '80'}`
    case 'monthly_report':
      return `monthly-report:${trigger.month}`
  }
}

async function generateMonthlyReport(
  trigger: MonthlyReportTrigger,
  userId?: string,
  userName?: string
): Promise<string | null> {
  const topCatsText = trigger.topCategories
    .map((c) => `${sanitize(c.category, 40).replace(/_/g, ' ')}: €${Math.abs(c.amount).toFixed(0)}`)
    .join(', ')

  const goalsText =
    trigger.goals.length > 0
      ? trigger.goals
          .map((g) => `${sanitize(g.emoji, 10)} ${sanitize(g.name)} at ${g.pct}%`)
          .join(', ')
      : 'no active goals'

  const habitsText =
    trigger.habits.length > 0
      ? trigger.habits
          .map(
            (h) =>
              `${sanitize(h.emoji, 10)} ${sanitize(h.name)}${h.streak > 0 ? ` (${h.streak} streak)` : ''}`
          )
          .join(', ')
      : 'no active habits'

  const net = trigger.balance
  const netLabel = net >= 0 ? `+€${net.toFixed(0)}` : `-€${Math.abs(net).toFixed(0)}`

  const addressee = userName ? sanitize(userName.split(' ')[0] ?? '', 50) : null
  const prompt = `You are Truffle, a warm and direct AI finance assistant. Write a monthly finance summary message for the user covering ${trigger.monthName}.${addressee ? ` Address them by name: ${addressee}.` : ' Do not use "Hi there" — address them directly without a greeting or just start with the content.'}

Data:
- Income: €${trigger.totalIncome.toFixed(0)}
- Expenses: €${Math.abs(trigger.totalExpenses).toFixed(0)}
- Net: ${netLabel}
- Savings rate: ${(trigger.savingsRate * 100).toFixed(0)}%
- Top spending categories: ${topCatsText || 'none recorded'}
- Savings goals: ${goalsText}
- Saving habits: ${habitsText}

Write 4–6 sentences in flowing prose (no bullet points). Lead with a one-line verdict on the month using the net figure. Call out 1–2 specific spending patterns by name and amount. Weave in a brief mention of goal or habit progress if relevant. Close with one concrete, forward-looking nudge for the coming month. Be specific, warm, and honest — not generic. Do not start with "I".`

  return propagateAttributes({ userId }, async () => {
    const trace = startObservation('monthly_report_nudge', {
      metadata: { month: trigger.month },
      input: prompt,
    })

    const gen = trace.startObservation(
      'generateMonthlyReport',
      { model: 'openai/gpt-oss-120b', input: prompt },
      { asType: 'generation' }
    )

    const { text, usage } = await generateText({
      model: chatModel,
      prompt,
      maxOutputTokens: 700, // headroom for GPT-OSS reasoning tokens + the 4-6 sentence report
      providerOptions: groqProviderOptions,
    })

    gen
      .update({
        output: text,
        usageDetails: usage
          ? { input: usage.inputTokens ?? 0, output: usage.outputTokens ?? 0 }
          : undefined,
      })
      .end()
    trace.update({ output: text }).end()
    await langfuseSpanProcessor.forceFlush()

    return text.trim() || null
  })
}

export async function generateProactiveMessage(
  trigger: ProactiveTrigger,
  userId?: string,
  userName?: string
): Promise<string | null> {
  // Monthly report bypasses the LangGraph pipeline — no intent routing needed
  if (trigger.type === 'monthly_report') {
    return generateMonthlyReport(trigger, userId, userName)
  }

  const nudgeKey = getNudgeKey(trigger)

  const input = buildGraphInput(trigger, userName)

  return propagateAttributes({ userId }, async () => {
    const trace = startObservation('proactive_nudge', {
      input: input.userQuery,
      metadata: { triggerType: trigger.type, nudgeKey },
    })

    const graph = buildProactiveGraph(trace)
    const result = await graph.invoke(input)
    const message = result.agentResponse?.trim() || null

    trace.update({ output: message ?? '' }).end()
    await langfuseSpanProcessor.forceFlush()
    return message
  })
}

function buildGraphInput(
  trigger: Exclude<ProactiveTrigger, MonthlyReportTrigger>,
  userName?: string
) {
  const nameInstruction = userName
    ? ` Address the user by their first name: ${sanitize(userName.split(' ')[0] ?? '', 50)}.`
    : ' Do not use "Hi there" — start directly with the insight.'
  const empty = {
    transactions: [] as Transaction[],
    anomalies: [] as Anomaly[],
    savingsGoals: [] as SavingsGoal[],
    currentMonth: null as MonthlySnapshot | null,
  }

  switch (trigger.type) {
    case 'anomaly':
      return {
        ...empty,
        userQuery: `You just detected an anomaly: "${sanitize(trigger.anomaly.description, 200)}". Write a brief, warm proactive message for the user — no more than 2-3 sentences.${nameInstruction}`,
        intent: 'anomaly_review' as const,
        transactions: trigger.transactions,
        anomalies: [trigger.anomaly],
        currentMonth: trigger.snapshot,
      }
    case 'goal_milestone':
      return {
        ...empty,
        userQuery: `The user just hit ${trigger.milestone}% of their "${sanitize(trigger.goal.name)}" goal (${sanitize(trigger.goal.emoji, 10)}). Celebrate this briefly and mention their momentum — 1-2 sentences.${nameInstruction}`,
        intent: 'savings_goal_check' as const,
        savingsGoals: [trigger.goal],
        currentMonth: trigger.snapshot,
      }
    case 'goal_at_risk':
      return {
        ...empty,
        userQuery: `The user's "${sanitize(trigger.goal.name)}" savings goal (${sanitize(trigger.goal.emoji, 10)}) has ${trigger.daysRemaining} days until its deadline, but they still need €${trigger.projectedShortfall.toFixed(0)} to reach their €${trigger.goal.targetAmount} target. They've saved €${trigger.goal.savedAmount} so far. Write a brief, encouraging nudge — 1-2 sentences. Motivate without being preachy.${nameInstruction}`,
        intent: 'savings_goal_check' as const,
        savingsGoals: [trigger.goal],
      }
    case 'habit_streak':
      return {
        ...empty,
        userQuery: `The user just logged their "${sanitize(trigger.habitName)}" (${sanitize(trigger.habitEmoji, 10)}) savings habit and hit a ${trigger.streak}-period streak! Write a brief, warm celebration — 1-2 sentences. Acknowledge the consistency.${nameInstruction}`,
        intent: 'habit_setting' as const,
      }
    case 'habit_check_in':
      return {
        ...empty,
        userQuery: `The user's "${sanitize(trigger.habitName)}" (${sanitize(trigger.habitEmoji, 10)}) savings habit hasn't been logged yet this ${trigger.frequency === 'weekly' ? 'week' : 'month'}. They save €${trigger.amount} per ${trigger.frequency === 'weekly' ? 'week' : 'month'}${trigger.lastStreak > 0 ? ` and had a ${trigger.lastStreak}-period streak going` : ''}. Write a gentle, non-judgmental reminder — 1-2 sentences. Don't be pushy.${nameInstruction}`,
        intent: 'habit_setting' as const,
      }
    case 'budget_warning': {
      const catLabel = sanitize(trigger.category).replace(/_/g, ' ')
      const catEmoji = sanitize(trigger.categoryEmoji, 10)
      const isOver = trigger.percentUsed >= 100
      return {
        ...empty,
        userQuery: isOver
          ? `The user has exceeded their ${catEmoji} ${catLabel} budget this month — they've spent €${trigger.spentAmount.toFixed(0)} against a €${trigger.budgetAmount.toFixed(0)} limit (${trigger.percentUsed.toFixed(0)}% used). Write a brief, calm, non-judgmental heads-up — 1-2 sentences. Don't lecture.${nameInstruction}`
          : `The user has used ${trigger.percentUsed.toFixed(0)}% of their ${catEmoji} ${catLabel} budget this month — €${trigger.spentAmount.toFixed(0)} of €${trigger.budgetAmount.toFixed(0)}. Write a brief, friendly heads-up noting they're getting close — 1-2 sentences.${nameInstruction}`,
        intent: 'spending_summary' as const,
      }
    }
  }
}
