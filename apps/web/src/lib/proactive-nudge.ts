import { createServerClient } from '@truffle/db'
import type { Anomaly, SavingsGoal, Transaction, MonthlySnapshot } from '@truffle/types'
import { currentYearMonth, formatYearMonth } from './date'
import { computeStreak } from './habits'

/**
 * Checks whether a nudge with this key has already been sent to this user.
 * nudge_key has a unique index per user, so duplicate inserts will be rejected
 * by the DB — this pre-check just avoids an unnecessary LLM call.
 */
async function alreadySent(
  db: ReturnType<typeof createServerClient>,
  userId: string,
  nudgeKey: string
): Promise<boolean> {
  const { data } = await db
    .from('chat_messages')
    .select('id')
    .eq('user_id', userId)
    .eq('nudge_key', nudgeKey)
    .limit(1)
  return (data?.length ?? 0) > 0
}

async function writeNudge(
  db: ReturnType<typeof createServerClient>,
  userId: string,
  content: string,
  nudgeKey: string
) {
  await db.from('chat_messages').insert({
    user_id: userId,
    role: 'assistant',
    content,
    is_proactive: true,
    nudge_key: nudgeKey,
  })
}

async function getUserName(
  db: ReturnType<typeof createServerClient>,
  userId: string
): Promise<string | undefined> {
  try {
    const { data } = await db.auth.admin.getUserById(userId)
    return (data?.user?.user_metadata?.name as string | undefined) ?? undefined
  } catch {
    return undefined
  }
}

export async function sendAnomalyNudge(params: {
  userId: string
  anomaly: Anomaly
  transactions: Transaction[]
  snapshot: MonthlySnapshot | null
}) {
  const { userId, anomaly, transactions, snapshot } = params
  const nudgeKey = `anomaly:${anomaly.transactionId}`
  const db = createServerClient()

  if (await alreadySent(db, userId, nudgeKey)) return

  const [{ generateProactiveMessage }, userName] = await Promise.all([
    import('@truffle/ai'),
    getUserName(db, userId),
  ])
  const message = await generateProactiveMessage(
    {
      type: 'anomaly',
      anomaly,
      transactions,
      snapshot,
    },
    userId,
    userName
  )
  if (!message) return

  await writeNudge(db, userId, message, nudgeKey)
}

export async function sendGoalMilestoneNudge(params: {
  userId: string
  goal: SavingsGoal
  milestone: 25 | 50 | 75 | 100
  snapshot: MonthlySnapshot | null
}) {
  const { userId, goal, milestone, snapshot } = params
  const nudgeKey = `goal:${goal.id}:${milestone}`
  const db = createServerClient()

  if (await alreadySent(db, userId, nudgeKey)) return

  const [{ generateProactiveMessage }, userName] = await Promise.all([
    import('@truffle/ai'),
    getUserName(db, userId),
  ])
  const message = await generateProactiveMessage(
    {
      type: 'goal_milestone',
      goal,
      milestone,
      snapshot,
    },
    userId,
    userName
  )
  if (!message) return

  await writeNudge(db, userId, message, nudgeKey)
}

export async function sendGoalAtRiskNudge(params: {
  userId: string
  goal: SavingsGoal
  daysRemaining: number
  projectedShortfall: number
}) {
  const { userId, goal, daysRemaining, projectedShortfall } = params
  const nudgeKey = `goal-at-risk:${goal.id}:${currentYearMonth()}`
  const db = createServerClient()

  if (await alreadySent(db, userId, nudgeKey)) return

  const [{ generateProactiveMessage }, userName] = await Promise.all([
    import('@truffle/ai'),
    getUserName(db, userId),
  ])
  const message = await generateProactiveMessage(
    { type: 'goal_at_risk', goal, daysRemaining, projectedShortfall },
    userId,
    userName
  )
  if (!message) return

  await writeNudge(db, userId, message, nudgeKey)
}

export async function sendHabitStreakNudge(params: {
  userId: string
  habitId: string
  habitName: string
  habitEmoji: string
  streak: number
}) {
  const { userId, habitId, habitName, habitEmoji, streak } = params
  const nudgeKey = `habit-streak:${habitId}:${streak}`
  const db = createServerClient()

  if (await alreadySent(db, userId, nudgeKey)) return

  const [{ generateProactiveMessage }, userName] = await Promise.all([
    import('@truffle/ai'),
    getUserName(db, userId),
  ])
  const message = await generateProactiveMessage(
    { type: 'habit_streak', habitId, habitName, habitEmoji, streak },
    userId,
    userName
  )
  if (!message) return

  await writeNudge(db, userId, message, nudgeKey)
}

export async function sendHabitCheckInNudge(params: {
  userId: string
  habitId: string
  habitName: string
  habitEmoji: string
  frequency: 'weekly' | 'monthly'
  amount: number
  period: string
  lastStreak: number
}) {
  const { userId, habitId, habitName, habitEmoji, frequency, amount, period, lastStreak } = params
  const nudgeKey = `habit-checkin:${habitId}:${period}`
  const db = createServerClient()

  if (await alreadySent(db, userId, nudgeKey)) return

  const [{ generateProactiveMessage }, userName] = await Promise.all([
    import('@truffle/ai'),
    getUserName(db, userId),
  ])
  const message = await generateProactiveMessage(
    {
      type: 'habit_check_in',
      habitId,
      habitName,
      habitEmoji,
      frequency,
      amount,
      period,
      lastStreak,
    },
    userId,
    userName
  )
  if (!message) return

  await writeNudge(db, userId, message, nudgeKey)
}

export async function sendMonthlyReportNudge(userId: string): Promise<void> {
  // Compute the previous month (YYYY-MM)
  const now = new Date()
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonth = formatYearMonth(prevDate.getFullYear(), prevDate.getMonth() + 1)

  const nudgeKey = `monthly-report:${prevMonth}`
  const db = createServerClient()

  if (await alreadySent(db, userId, nudgeKey)) return

  // Fetch previous month's snapshot — skip if no data exists
  const { data: snapshotRow } = await db
    .from('monthly_snapshots')
    .select('data')
    .eq('user_id', userId)
    .eq('month', prevMonth)
    .single()

  const snapshot = snapshotRow?.data as MonthlySnapshot | null
  if (!snapshot || (snapshot.totalIncome === 0 && snapshot.totalExpenses === 0)) return

  // Top spending categories (expenses only, sorted largest first)
  const topCategories = Object.entries(snapshot.byCategory)
    .filter(([, amount]) => amount < 0)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 5)

  // Active goals
  const { data: goalsData } = await db
    .from('savings_goals')
    .select('name, emoji, saved_amount, target_amount')
    .eq('user_id', userId)

  const goals = (goalsData ?? []).map((g) => ({
    name: g.name,
    emoji: g.emoji,
    pct: Math.min(100, Math.round((Number(g.saved_amount) / Number(g.target_amount)) * 100)),
  }))

  // Active habits with streaks
  const { data: habitsData } = await db
    .from('savings_habits')
    .select('id, name, emoji, frequency')
    .eq('user_id', userId)
    .eq('is_active', true)

  let habits: Array<{ name: string; emoji: string; streak: number }> = []
  if (habitsData && habitsData.length > 0) {
    const habitIds = habitsData.map((h) => h.id)
    const { data: contributions } = await db
      .from('habit_contributions')
      .select('habit_id, period')
      .in('habit_id', habitIds)
      .eq('user_id', userId)

    const contribMap: Record<string, string[]> = {}
    for (const c of contributions ?? []) {
      if (!contribMap[c.habit_id]) contribMap[c.habit_id] = []
      contribMap[c.habit_id]!.push(c.period)
    }

    habits = habitsData.map((h) => ({
      name: h.name,
      emoji: h.emoji,
      streak: computeStreak(h.frequency as 'weekly' | 'monthly', contribMap[h.id] ?? []),
    }))
  }

  const [year, month] = prevMonth.split('-').map(Number)
  const monthName = new Date(year!, month! - 1, 1).toLocaleString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  const [{ generateProactiveMessage }, userName] = await Promise.all([
    import('@truffle/ai'),
    getUserName(db, userId),
  ])
  const message = await generateProactiveMessage(
    {
      type: 'monthly_report',
      month: prevMonth,
      monthName,
      totalIncome: snapshot.totalIncome,
      totalExpenses: snapshot.totalExpenses,
      balance: snapshot.balance,
      savingsRate: snapshot.savingsRate,
      topCategories,
      goals,
      habits,
    },
    userId,
    userName
  )
  if (!message) return

  await writeNudge(db, userId, message, nudgeKey)
}

export async function sendBudgetNudge(params: {
  userId: string
  category: string
  categoryEmoji: string
  spentAmount: number
  budgetAmount: number
  percentUsed: number
  month: string
}) {
  const { userId, category, categoryEmoji, spentAmount, budgetAmount, percentUsed, month } = params
  const threshold = percentUsed >= 100 ? '100' : '80'
  const nudgeKey = `budget-warning:${category}:${month}:${threshold}`
  const db = createServerClient()

  if (await alreadySent(db, userId, nudgeKey)) return

  const [{ generateProactiveMessage }, userName] = await Promise.all([
    import('@truffle/ai'),
    getUserName(db, userId),
  ])
  const message = await generateProactiveMessage(
    {
      type: 'budget_warning',
      category,
      categoryEmoji,
      spentAmount,
      budgetAmount,
      percentUsed,
      month,
    },
    userId,
    userName
  )
  if (!message) return

  await writeNudge(db, userId, message, nudgeKey)
}
