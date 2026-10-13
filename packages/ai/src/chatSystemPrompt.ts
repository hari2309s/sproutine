import type { MonthlySnapshot, TransactionCategory, QueryIntent } from '@truffle/types'
import { CATEGORY_GUIDANCE } from './prompts/categorization.prompt'

type Transaction = {
  date: string
  description: string
  category: TransactionCategory
  amount: number
}

type AnomalyRow = { severity: unknown; description: unknown }
type GoalRow = {
  emoji: unknown
  name: unknown
  saved_amount: unknown
  target_amount: unknown
  deadline: unknown
}
type HabitRow = {
  emoji: unknown
  name: unknown
  amount: unknown
  frequency: unknown
  streak: unknown
  currentPeriodLogged: unknown
}

type BudgetRow = {
  category: unknown
  amount: unknown
  spentAmount: unknown // computed by caller — current month spend in that category
}

function buildBudgetContext(budgetRows: BudgetRow[] | null, fmt: (n: number) => string): string {
  const budgets = (budgetRows ?? []).slice(0, 12)
  if (!budgets.length) return ''
  return (
    '\nMonthly budgets:\n' +
    budgets
      .map((b) => {
        const limit = b.amount as number
        const spent = b.spentAmount as number
        const pct = limit > 0 ? ((spent / limit) * 100).toFixed(0) : '0'
        const cat = sanitize(String(b.category).replace(/_/g, ' '))
        const status =
          spent > limit ? ' ⚠️ over budget' : spent / limit >= 0.8 ? ' (near limit)' : ''
        return `- ${cat}: ${fmt(spent)} / ${fmt(limit)} (${pct}% used${status})`
      })
      .join('\n')
  )
}

// Intents that need full transaction data
const NEEDS_TRANSACTIONS: QueryIntent[] = [
  'spending_summary',
  'affordability_check',
  'anomaly_review',
  'category_breakdown',
  'goal_setting',
  'add_transaction',
  'general_advice', // follow-up clarifications must retain transaction grounding
]

// Intents that need anomaly context
const NEEDS_ANOMALIES: QueryIntent[] = ['anomaly_review', 'spending_summary']

// Intents where pending habit reminders are shown proactively
const SHOW_HABIT_REMINDERS: QueryIntent[] = ['greeting', 'general_advice', 'spending_summary']

// Strips newlines and control chars to block prompt injection via user-supplied text.
// Limits length so a single field can't balloon the context window.
function sanitize(text: unknown, maxLen = 120): string {
  return String(text ?? '')
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxLen)
}

function buildTransactionContext(
  intent: QueryIntent,
  transactions: Transaction[],
  fmt: (n: number) => string
): string {
  if (!NEEDS_TRANSACTIONS.includes(intent)) return ''
  return (
    "\nThe user's recent transactions:\n" +
    transactions
      .map((t) => `${t.date}: ${sanitize(t.description)} (${t.category}) ${fmt(t.amount)}`)
      .join('\n')
  )
}

function buildAnomalyContext(intent: QueryIntent, anomalyRows: AnomalyRow[] | null): string {
  if (!NEEDS_ANOMALIES.includes(intent) || !anomalyRows?.length) return ''
  return (
    '\nRecent anomalies detected:\n' +
    anomalyRows.map((a) => `- [${a.severity}] ${sanitize(a.description, 200)}`).join('\n')
  )
}

function buildGoalsContext(goalRows: GoalRow[] | null, fmt: (n: number) => string): string {
  const goals = (goalRows ?? []).slice(0, 10)
  if (!goals.length) return ''
  return (
    '\nSavings goals:\n' +
    goals
      .map((g) => {
        const target = g.target_amount as number
        const saved = g.saved_amount as number
        const pct = target > 0 ? ((saved / target) * 100).toFixed(0) : '0'
        return `- ${g.emoji} ${sanitize(g.name)}: ${fmt(saved)} / ${fmt(target)} (${pct}%)${g.deadline ? ` by ${g.deadline}` : ''}`
      })
      .join('\n')
  )
}

type HabitsContextResult = { context: string; pendingHabits: HabitRow[] }

function buildHabitsContext(
  habitRows: HabitRow[] | null,
  fmt: (n: number) => string
): HabitsContextResult {
  const habits = (habitRows ?? []).slice(0, 10)
  if (!habits.length) return { context: '', pendingHabits: [] }
  const pendingHabits = habits.filter((h) => !h.currentPeriodLogged)
  const context =
    '\nSavings habits:\n' +
    habits
      .map((h) => {
        const streakStr = (h.streak as number) > 0 ? ` 🔥 ${h.streak}-period streak` : ''
        const status = h.currentPeriodLogged ? '✓ logged this period' : '⏳ not yet logged'
        return `- ${h.emoji} ${sanitize(h.name)}: ${fmt(h.amount as number)}/${h.frequency} (${status}${streakStr})`
      })
      .join('\n')
  return { context, pendingHabits }
}

function buildHabitReminderContext(intent: QueryIntent, pendingHabits: HabitRow[]): string {
  if (!SHOW_HABIT_REMINDERS.includes(intent) || !pendingHabits.length) return ''
  return `\nHabit reminder: The user has ${pendingHabits.length} saving habit(s) not yet logged this period: ${pendingHabits.map((h) => `${h.emoji} ${sanitize(h.name)}`).join(', ')}. You may gently mention this if it fits naturally.`
}

function buildToolRules(intent: QueryIntent): string {
  if (intent === 'goal_setting') {
    return `Goal tool rules:
- When a user mentions a new goal, ALWAYS ask for the target amount in plain text first. Never call proposeGoal on the same turn.
- Only call proposeGoal when the user's current reply contains a specific amount for this goal. A number mentioned earlier for a different goal does not count — ask again.
- Once you have both a goal name and an amount from the user in the same exchange, call proposeGoal immediately. Do not describe it in text first.
- If the user already has goals (listed in context), acknowledge them. Don't propose a duplicate of an existing goal — suggest modifying it or ask if they want a new one instead.
- After a confirmed goal, respond with one warm sentence. If the user then mentions another goal, start fresh and ask for the new amount.
- If the user declined, respond warmly and do not re-propose.`
  }
  if (intent === 'add_transaction') {
    return `Transaction tool rules:
- You MUST call proposeTransaction for real, past transactions. Do NOT describe or acknowledge the transaction in plain text — the user must confirm via the card before it is logged.
- NEVER say "I've logged that" or "I've noted that" without calling proposeTransaction first.
- ALWAYS use the exact amount the user states in their CURRENT message. NEVER substitute an amount from transaction history even if a similar transaction exists.
- For HYPOTHETICAL transactions ("I might buy", "I'm thinking about", "should I get"), do NOT call proposeTransaction. Instead, give helpful advice or an affordability check.
- Use a negative amount for expenses and a positive amount for income.
- Default the date to today if the user does not specify one.
- ${CATEGORY_GUIDANCE}
- If the merchant is not clear, omit it.
- After a confirmed transaction, respond with one warm sentence. Do not log the same transaction twice.
- If the user declined, respond warmly and do not re-propose.`
  }
  if (intent === 'habit_setting') {
    return `Habit tool rules:
- If the user provides a specific amount AND frequency (e.g. "save 50 euros every week"), call proposeHabit directly. Put a brief calculation in the pitch field (e.g. "50/week = ~200/month").
- If the user is vague ("I want to start saving regularly") and has NO existing habits, ask what amount and frequency they have in mind — do NOT guess.
- If the user already has saving habits (listed in context), acknowledge them first ("You're already saving X/week and Y/month"). Only propose a new habit if the user explicitly asks for one. Do NOT duplicate an existing habit.
- If the user asks you to calculate a saving amount, compute it from the goal and deadline they provided — do not guess or invent a number.
- After a confirmed habit, respond with one warm encouraging sentence.
- If the user declined, respond warmly and do not re-propose.`
  }
  return ''
}

// Live spend-by-category computed from actual transactions in route.ts.
// Always included for all financial intents — avoids stale snapshot data
// and doesn't depend on intent classification to be correct.
function buildSpendByCategoryContext(
  spendByCategory: Record<string, number> | null,
  fmt: (n: number) => string
): string {
  if (!spendByCategory) return ''
  const entries = Object.entries(spendByCategory)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
  if (!entries.length) return ''
  const total = entries.reduce((sum, [, v]) => sum + v, 0)
  return (
    '\nCurrent month spending by category:\n' +
    entries
      .map(([cat, amount]) => {
        const pct = total > 0 ? ((amount / total) * 100).toFixed(0) : '0'
        return `- ${cat.replace(/_/g, ' ')}: ${fmt(amount)} (${pct}%)`
      })
      .join('\n') +
    `\n- Total: ${fmt(total)}`
  )
}

function buildSnapshotContext(
  snapshots: MonthlySnapshot[],
  projectedBalance: number,
  daysRemaining: number,
  dailySpend: number,
  currentMonth: string,
  fmt: (n: number) => string
): string {
  if (snapshots.length === 1) {
    const s = snapshots[0]!
    const isCurrentMonth = s.month === currentMonth
    const projectionLine = isCurrentMonth
      ? `\n- Projected end of month: ${fmt(projectedBalance)} (${daysRemaining} days remaining, spending ~${fmt(dailySpend)}/day)`
      : ''
    return `Monthly summary (${s.month}):
- Income: ${fmt(s.totalIncome)}
- Expenses: ${fmt(Math.abs(s.totalExpenses))}
- Balance: ${fmt(s.balance)}${projectionLine}`
  }

  const totalIncome = snapshots.reduce((sum, s) => sum + s.totalIncome, 0)
  const totalExpenses = snapshots.reduce((sum, s) => sum + Math.abs(s.totalExpenses), 0)
  const totalBalance = snapshots.reduce((sum, s) => sum + s.balance, 0)

  const lines = snapshots.map((s) => {
    const projectionNote =
      s.month === currentMonth
        ? ` (projected end: ${fmt(projectedBalance)}, ${daysRemaining}d remaining)`
        : ''
    return `- ${s.month}: income ${fmt(s.totalIncome)}, expenses ${fmt(Math.abs(s.totalExpenses))}, balance ${fmt(s.balance)}${projectionNote}`
  })

  return `Monthly summary (${snapshots[0]!.month} – ${snapshots[snapshots.length - 1]!.month}):
${lines.join('\n')}
- Totals: income ${fmt(totalIncome)}, expenses ${fmt(totalExpenses)}, net balance ${fmt(totalBalance)}`
}

export function buildSystemPrompt(params: {
  intent: QueryIntent
  userName?: string
  toneGuidance: string
  snapshots: MonthlySnapshot[]
  currentMonth: string
  transactions: Transaction[]
  anomalyRows: AnomalyRow[] | null
  goalRows: GoalRow[] | null
  habitRows: HabitRow[] | null
  budgetRows: BudgetRow[] | null
  spendByCategory?: Record<string, number> | null
  projectedBalance: number
  daysRemaining: number
  dailySpend: number
  currencyCode?: string
  locale?: string
}): string {
  const {
    intent,
    userName,
    toneGuidance,
    snapshots,
    currentMonth,
    transactions,
    anomalyRows,
    goalRows,
    habitRows,
    budgetRows,
    spendByCategory,
    projectedBalance,
    daysRemaining,
    dailySpend,
    currencyCode = 'EUR',
  } = params

  const decimals = 2
  const symbol = currencyCode === 'GBP' ? '£' : currencyCode === 'USD' ? '$' : '€'
  const fmt = (n: number) => `${symbol}${Math.abs(n).toFixed(decimals)}`

  const languageInstruction = ''
  // user_metadata.name is user-writable — sanitize like every other
  // user-supplied string here to block prompt injection via the name.
  const trimmedName = sanitize(userName, 40)
  const nameInstruction = trimmedName
    ? ` The user's name is ${trimmedName} — use their first name naturally now and then, not in every sentence.`
    : ''

  if (intent === 'greeting') {
    return `You are Truffle — a warm, familiar personal finance companion. The user is just saying hello.
Say hi back like a friend who's genuinely glad to hear from them — one or two easy, natural sentences${trimmedName ? `, using their first name (${trimmedName})` : ''}. A little warmth or personality is welcome; vary how you open so it never sounds canned. Do not use emoji. Do not bring up their finances, balance, goals, or numbers unless they ask.${languageInstruction}`
  }

  const transactionContext = buildTransactionContext(intent, transactions, fmt)
  const anomalyContext = buildAnomalyContext(intent, anomalyRows)
  const goalsContext = buildGoalsContext(goalRows, fmt)
  const { context: habitsContext, pendingHabits } = buildHabitsContext(habitRows, fmt)
  const habitReminderContext = buildHabitReminderContext(intent, pendingHabits)
  const budgetContext = buildBudgetContext(budgetRows, fmt)
  const toolRules = buildToolRules(intent)
  const snapshotContext = buildSnapshotContext(
    snapshots,
    projectedBalance,
    daysRemaining,
    dailySpend,
    currentMonth,
    fmt
  )
  const categoryContext = buildSpendByCategoryContext(spendByCategory ?? null, fmt)

  return `You are Truffle — a warm, calm, non-judgmental personal finance companion. You speak like a close friend who happens to be good with money, never a banker or a lecturer.${languageInstruction}${nameInstruction}

Voice: you're a familiar, friendly presence — someone who's genuinely glad they asked. Talk the way you would out loud: contractions, an easy rhythm, a bit of personality. Open with a real human reaction to what they just said ("Oh nice", "Ooh, good timing", "Honestly? Not bad at all", "Yeah, let's look") and let a little feeling through — quietly pleased when they're doing well, warm and steady when it's tight. Vary your openings; never reach for the same phrase twice in a row. You are not a statement, a dashboard, or a support script — if a sentence sounds like it could be a push notification, rewrite it.

Tone guidance for this conversation: ${toneGuidance}
${transactionContext}${anomalyContext}${goalsContext}${habitsContext}${budgetContext}${habitReminderContext}

${snapshotContext}${categoryContext}

Intent detected: ${intent}

Response guidelines:
- Keep it short and spoken — usually 2 to 4 sentences, read aloud. Warmth matters more than completeness: pick the one or two numbers that tell the story and round them conversationally ("about ${symbol}1,200", not "${symbol}1199.50"). Don't recite every figure you were given.
- What you say to the user is plain spoken words only — no emoji, asterisks, markdown, bullet points or lists (this does not apply to the emoji argument of a tool call)
- Ground what you say in the real transaction data, but say it like a person, not a ledger.
- Never lecture, shame, or pile on numbers. Celebrate wins like you mean it. When it's tight, be reassuring and human about it.
- Don't hand out unsolicited tips or multi-point advice. One warm, encouraging closing thought is welcome; a to-do list is not.
- If you cited specific amounts in a previous message this conversation, those are accurate — do not retract them. The monthly summary reflects only the current period; historical data lives in the transaction list above.

Register to aim for:
- Flat, avoid this: "You've brought in ${symbol}3,500 and spent ${symbol}1,199.50, leaving ${symbol}2,300.50. Projected end-of-month balance is ${symbol}98."
- Warm, aim for this: "Honestly? You're in good shape. You've spent around ${symbol}1,200 of the ${symbol}3,500 that came in, and if the next couple of weeks look like the last few, you'll reach the end of the month with a little breathing room."

${toolRules}`
}
