import { NextRequest } from 'next/server'
import { streamText, tool, convertToModelMessages, type UIMessage } from 'ai'
import { z } from 'zod'
import { startObservation, propagateAttributes } from '@langfuse/tracing'
import {
  queryTransactions,
  routeIntent,
  langfuseSpanProcessor,
  getSpeechTone,
  getToneGuidance,
  buildSystemPrompt,
  selectModelCandidates,
  groqChatProviderOptions,
  incrementUsage,
  logEval,
} from '@truffle/ai'
import { createServerClient as createDbClient } from '@truffle/db'
import type { MonthlySnapshot, TransactionCategory, QueryIntent } from '@truffle/types'
import { INTENT, TRANSACTION_CATEGORIES } from '@truffle/types'
import { getCurrentPeriod, computeStreak } from '@/lib/habits'
import { currentYearMonth, parseDateRange } from '@/lib/date'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const maxDuration = 30

function buildEmptySnapshot(): MonthlySnapshot {
  return {
    month: currentYearMonth(),
    totalIncome: 0,
    totalExpenses: 0,
    byCategory: {
      food_groceries: 0,
      food_delivery: 0,
      transport: 0,
      housing: 0,
      utilities: 0,
      subscriptions: 0,
      health: 0,
      entertainment: 0,
      shopping: 0,
      income: 0,
      savings: 0,
      other: 0,
    },
    savingsRate: 0,
    balance: 0,
  }
}

// Detects whether the previous assistant message was asking for follow-up details
// in a multi-turn collection flow, so we can force the correct intent even when
// the user's reply (e.g. "20000 euros") doesn't contain intent keywords.
function detectFollowUpIntent(prevText: string, hasToolInvocations: boolean): QueryIntent | null {
  if (hasToolInvocations) return null
  const has = (...words: string[]) => words.some((w) => prevText.includes(w))
  if (
    has('how much', 'amount', 'cost', 'budget', 'target') &&
    has('goal', 'save', 'saving', 'plan', 'trip', 'buy', 'purchase', 'afford')
  )
    return INTENT.GOAL_SETTING
  // Deadline follow-up: AI asked "when would you like to reach this goal?" etc.
  if (
    has('when', 'deadline', 'target date', 'by when', 'date') &&
    has('goal', 'save', 'saving', 'reach', 'achieve', 'trip', 'buy', 'purchase')
  )
    return INTENT.GOAL_SETTING
  if (
    has('how much', 'amount', 'what did', 'which category', 'what category') &&
    has('transaction', 'expense', 'purchase', 'payment', 'spent', 'paid', 'log')
  )
    return INTENT.ADD_TRANSACTION
  if (
    has('how much', 'amount', 'often', 'weekly', 'monthly') &&
    has('habit', 'save', 'saving', 'set aside', 'put away', 'regularly')
  )
    return INTENT.HABIT_SETTING
  return null
}

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const userId = user.id
    const userName =
      typeof user.user_metadata?.name === 'string' ? user.user_metadata.name.trim() : ''

    const {
      messages: clientMessages,
      currency = 'EUR',
      locale = 'en',
    } = (await request.json()) as { messages: UIMessage[]; currency?: string; locale?: string }

    // v5 UIMessages carry text in `parts`, not a `content` string.
    const textOf = (m: UIMessage | undefined): string =>
      (m?.parts ?? [])
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('')

    const message = Array.isArray(clientMessages)
      ? textOf([...clientMessages].reverse().find((m) => m.role === 'user'))
      : ''

    if (!message) {
      return new Response(JSON.stringify({ error: 'message required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Kick off model candidate selection immediately — it only depends on the
    // constant task name ('tool-calling'), not on anything computed below, so
    // it can run in parallel with the DB reads, intent routing, RAG retrieval,
    // and prompt building instead of starting only after all of those finish.
    // The result is awaited later, right where it's used. A no-op `.catch` is
    // attached so a rejection here doesn't surface as an unhandled promise
    // rejection if an earlier DB read fails first and we return before this
    // is ever awaited — the real error still surfaces at the await below.
    const candidatesPromise = selectModelCandidates('tool-calling')
    candidatesPromise.catch(() => {})

    const db = createDbClient()

    const currentMonth = currentYearMonth()
    const dateRange = parseDateRange(message, new Date())

    // Run all independent queries in parallel — contributions depends on habit IDs so runs after
    const [
      { data: txRows },
      { data: snapshotRows },
      { data: anomalyRows },
      { data: goalRows },
      { data: rawHabitRows },
      { data: rawBudgetRows },
    ] = await Promise.all([
      db
        .from('transactions')
        .select(
          'id, user_id, amount, currency, description, category, merchant, date, is_recurring'
        )
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(50),
      db
        .from('monthly_snapshots')
        .select('data')
        .eq('user_id', userId)
        .gte('month', dateRange.from)
        .lte('month', dateRange.to)
        .order('month', { ascending: true }),
      db
        .from('anomalies')
        .select('description, severity, type')
        .eq('user_id', userId)
        .order('detected_at', { ascending: false })
        .limit(5),
      db
        .from('savings_goals')
        .select('name, target_amount, saved_amount, deadline, emoji')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
      db
        .from('savings_habits')
        .select('id, name, amount, frequency, emoji')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
      db.from('monthly_budgets').select('category, amount').eq('user_id', userId),
    ])

    const transactions = ((txRows ?? []) as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      amount: Number(row.amount),
      currency: row.currency as 'EUR' | 'GBP' | 'USD',
      description: row.description as string,
      category: row.category as TransactionCategory,
      merchant: (row.merchant as string | null) ?? undefined,
      date: row.date as string,
      isRecurring: row.is_recurring as boolean,
    }))

    const snapshots: MonthlySnapshot[] = ((snapshotRows ?? []) as Record<string, unknown>[])
      .map((row) => row.data as unknown as MonthlySnapshot)
      .filter(Boolean)
    if (snapshots.length === 0) snapshots.push(buildEmptySnapshot())

    const currentMonthSnapshot =
      snapshots.find((s) => s.month === currentMonth) ??
      snapshots[snapshots.length - 1] ??
      buildEmptySnapshot()

    // Contributions query depends on habit IDs from the parallel batch above
    const habitIds = (rawHabitRows ?? []).map((h: Record<string, unknown>) => h.id as string)
    const { data: habitContribRows } =
      habitIds.length > 0
        ? await db
            .from('habit_contributions')
            .select('habit_id, period')
            .in('habit_id', habitIds)
            .eq('user_id', userId)
        : { data: [] }

    // Build per-habit period sets for quick lookup
    const habitPeriodMap: Record<string, string[]> = {}
    for (const c of (habitContribRows ?? []) as { habit_id: string; period: string }[]) {
      if (!habitPeriodMap[c.habit_id]) habitPeriodMap[c.habit_id] = []
      habitPeriodMap[c.habit_id]!.push(c.period)
    }

    const habitRows = (rawHabitRows ?? []).map((h: Record<string, unknown>) => {
      const freq = h.frequency as 'weekly' | 'monthly'
      const periods = habitPeriodMap[h.id as string] ?? []
      const currentPeriod = getCurrentPeriod(freq)
      const currentPeriodLogged = periods.includes(currentPeriod)
      const streak = computeStreak(freq, periods)
      return {
        emoji: h.emoji,
        name: h.name,
        amount: h.amount,
        frequency: h.frequency,
        streak,
        currentPeriodLogged,
      }
    })

    // Compute current-month spend per category for budget context
    const spendByCategory: Record<string, number> = {}
    for (const tx of transactions) {
      if (tx.amount < 0 && tx.date.startsWith(currentMonth)) {
        spendByCategory[tx.category] = (spendByCategory[tx.category] ?? 0) + Math.abs(tx.amount)
      }
    }
    const budgetRows = (rawBudgetRows ?? []).map((b: Record<string, unknown>) => ({
      category: b.category,
      amount: b.amount,
      spentAmount: spendByCategory[b.category as string] ?? 0,
    }))

    return await propagateAttributes({ userId }, async () => {
      // Langfuse trace for the full request
      const trace = startObservation('chat', {
        input: message,
        metadata: { month: currentMonth },
      })

      // Route intent and run RAG retrieval concurrently — retrieval's query is
      // derived only from the raw `message`, not from the routed intent, so
      // there's no data dependency between the two and they don't need to be
      // sequential.
      const intentSpan = trace.startObservation('routeIntent', { input: message })
      const embeddingQuery = message.slice(0, 500)
      const [routedIntent, relevantTransactions] = await Promise.all([
        routeIntent(message),
        queryTransactions(userId, embeddingQuery, 100).catch(() => transactions),
      ])
      let intent = routedIntent
      intentSpan.update({ output: intent }).end()
      const filteredRelevant = dateRange.explicit
        ? relevantTransactions.filter(
            (tx) => tx.date.slice(0, 7) >= dateRange.from && tx.date.slice(0, 7) <= dateRange.to
          )
        : relevantTransactions
      // For anomaly_review, use all current-month transactions so the model
      // can scan the full month for duplicates, unusual amounts, etc. — RAG
      // semantic search for "unusual charges" returns poor results.
      // For spending_summary, also use full month data for accurate totals.
      const needsFullMonth = intent === INTENT.ANOMALY_REVIEW || intent === INTENT.SPENDING_SUMMARY
      const contextTransactions = needsFullMonth
        ? transactions.filter((tx) => tx.date.startsWith(currentMonth))
        : filteredRelevant.length > 0
          ? filteredRelevant
          : transactions

      // Compute forecast numbers for affordability / forecast intents
      const today = new Date()
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
      const daysElapsed = today.getDate()
      const daysRemaining = daysInMonth - daysElapsed
      const dailySpend =
        daysElapsed > 0 && currentMonthSnapshot.totalExpenses < 0
          ? Math.abs(currentMonthSnapshot.totalExpenses) / daysElapsed
          : 0
      const projectedBalance = currentMonthSnapshot.balance - dailySpend * daysRemaining

      const speechTone = getSpeechTone(currentMonthSnapshot)
      const toneGuidance = getToneGuidance(currentMonthSnapshot)

      const systemPrompt = buildSystemPrompt({
        intent,
        userName,
        toneGuidance,
        snapshots,
        currentMonth,
        transactions: contextTransactions,
        anomalyRows: anomalyRows as { severity: unknown; description: unknown }[] | null,
        goalRows: goalRows as
          | {
              emoji: unknown
              name: unknown
              saved_amount: unknown
              target_amount: unknown
              deadline: unknown
            }[]
          | null,
        habitRows,
        budgetRows,
        spendByCategory,
        projectedBalance,
        daysRemaining,
        dailySpend,
        currencyCode: currency,
        locale,
      })

      // Keep only text parts on assistant history and strip any leaked
      // <function=…> XML. Tool parts are resolved locally on the client and
      // never replayed to the server, so `activeTools` stays scoped strictly by
      // the current intent and the model can't pick a stale tool.
      const normalizedMessages: UIMessage[] = clientMessages.map((m) => {
        if (m.role !== 'assistant') return m
        const parts = (m.parts ?? [])
          .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map((p) => ({
            ...p,
            // Bounded to avoid polynomial backtracking on adversarial input —
            // real tool-call bodies never approach this length.
            text: p.text.replace(/<function=[^>]*>[\s\S]{0,5000}?<\/function>/g, '').trim(),
          }))
        return { ...m, parts }
      })

      // If the previous assistant message was asking for a goal amount (mid-collection
      // flow), the user's reply (e.g. "20000 euros") won't match goal_setting keywords.
      // Detect this and force the intent so tools stay enabled for this turn.
      const lastAssistant = [...normalizedMessages].reverse().find((m) => m.role === 'assistant')
      const prevAssistantText = textOf(lastAssistant).toLowerCase()
      // Skip follow-up intent override when the message looks like code, SQL, or injection
      // — let the LLM handle it as general input rather than forcing a collection flow.
      const looksLikeCode =
        /\b(select|insert|update|delete|drop|create|alter|truncate)\b\s+\w/i.test(message) ||
        /[{}<>]|\/\/|\/\*|\*\/|console\.|function\s*\(/.test(message)
      const followUpIntent = looksLikeCode ? null : detectFollowUpIntent(prevAssistantText, false)
      if (followUpIntent) intent = followUpIntent

      const proposeGoalTool = {
        proposeGoal: tool({
          description:
            "Propose a savings goal card for the user to confirm. STRICT RULES: (1) NEVER call on the turn the user first names a goal — always ask for the price first in plain text. (2) Only call when the user's CURRENT message contains a specific numeric amount for THIS goal. A number from a previous turn does not count. (3) Never guess, infer, or reuse amounts from other goals in the conversation. (4) After getting the amount, ask for a target deadline before calling this tool — e.g. 'When would you like to reach this goal?' If the user explicitly says they have no deadline or don't know, you may omit it.",
          inputSchema: z.object({
            name: z.string().describe('Short goal name, e.g. "Holiday in Greece"'),
            targetAmount: z
              .union([z.number(), z.string().transform((s) => parseFloat(s))])
              .refine((n) => n > 0, {
                message: 'targetAmount must be positive — ask the user for an amount first',
              })
              .describe('Target amount in EUR stated by the user. Do not guess.'),
            deadline: z
              .string()
              .optional()
              .describe(
                'Optional target date in YYYY-MM-DD format (e.g. "2026-04-30"). Omit if the user gave no deadline.'
              ),
            emoji: z.string().describe('A single relevant emoji'),
            pitch: z
              .string()
              .describe(
                'One warm sentence explaining why this goal is achievable based on their finances'
              ),
          }),
        }),
      }

      const proposeTransactionTool = {
        proposeTransaction: tool({
          description:
            'Show a ONE-TIME transaction confirmation card. ONLY call this when the user explicitly states they have already made a real, past purchase or received real income — e.g. "I just bought", "I paid", "I received". DO NOT call this for hypothetical questions ("I might buy", "should I get"), jokes, future plans, impossible scenarios, or anything the user has not actually done. For hypotheticals, give advice or an affordability check in plain text instead. DO NOT use this for recurring saving habits — use proposeHabit for those. Use negative amounts for expenses, positive for income.',
          inputSchema: z.object({
            description: z.string().describe('Short description, e.g. "Coffee at Costa"'),
            amount: z
              .union([z.number(), z.string().transform((s) => parseFloat(s))])
              .refine((n) => !isNaN(n as number), { message: 'amount must be a valid number' })
              .describe(
                'Transaction amount. Negative for expenses (e.g. -4.50), positive for income (e.g. 1500).'
              ),
            category: z
              .enum(TRANSACTION_CATEGORIES)
              .describe('The most appropriate category for this transaction.'),
            merchant: z.string().optional().describe('Optional merchant or payee name.'),
            date: z
              .string()
              .describe(
                `Transaction date in YYYY-MM-DD format. Default to today: ${new Date().toISOString().slice(0, 10)}`
              ),
          }),
        }),
      }

      const proposeHabitTool = {
        proposeHabit: tool({
          description:
            'Show a recurring savings habit confirmation card. Only call when you have a specific amount AND a frequency (weekly or monthly). Never guess the amount. Put a brief calculation breakdown (e.g. "50/week = ~200/month") in the pitch field.',
          inputSchema: z.object({
            name: z
              .string()
              .describe(
                'Short habit name based ONLY on what the user said. If the user did not state a purpose, use a generic name like "Weekly savings" or "Monthly savings". NEVER infer a name from prior conversation or goals.'
              ),
            amount: z
              .union([z.number(), z.string().transform((s) => parseFloat(s))])
              .refine((n) => (n as number) > 0, { message: 'amount must be positive' })
              .describe('Amount in EUR to save each period. Must be stated by the user.'),
            frequency: z
              .enum(['weekly', 'monthly'])
              .describe('How often to save: weekly or monthly.'),
            emoji: z.string().describe('A single relevant emoji'),
            pitch: z
              .string()
              .describe('One warm sentence motivating this habit based on their finances'),
          }),
        }),
      }

      const candidates = await candidatesPromise

      // Drop assistant messages that had only tool calls (empty content after stripping
      // toolInvocations). These are meaningless in history and some providers reject
      // empty-content assistant messages, causing a 500 on follow-up turns.
      const filteredMessages = normalizedMessages.filter(
        (m) => !(m.role === 'assistant' && !textOf(m).trim())
      )

      // Bound history to prevent token bloat on long conversations.
      const boundedMessages =
        filteredMessages.length > 10 ? filteredMessages.slice(-10) : filteredMessages

      // Scope tools strictly by intent. Only tool-eligible intents get a tool;
      // all other intents produce plain text only.
      const activeTools = (() => {
        if (intent === INTENT.HABIT_SETTING) return { ...proposeHabitTool }
        if (intent === INTENT.GOAL_SETTING) return { ...proposeGoalTool }
        if (intent === INTENT.ADD_TRANSACTION) return { ...proposeTransactionTool }
        return undefined
      })()

      // Detect whether the user's message describes a definite past transaction
      // (not hypothetical). If definite, force tool call; otherwise let the model
      // decide (it may give advice instead of proposing a card).
      const isDefiniteTransaction =
        intent === INTENT.ADD_TRANSACTION &&
        /\b(i\s+(just\s+)?(spent|paid|bought|got paid|received)|i\s+just\s+spend|add\s+(a\s+)?transaction|log\s+(a\s+)?transaction)\b/i.test(
          message
        )

      // 'required' forces a tool call — use only when the user clearly wants a
      // card (definite past transaction, or new habit with all details and no
      // existing habits). Otherwise 'auto' lets the model respond with text
      // (e.g. for hypotheticals, vague requests, or acknowledging existing data).
      const toolChoice = (() => {
        if (!activeTools) return undefined
        if (isDefiniteTransaction) return 'required' as const
        if (intent === INTENT.HABIT_SETTING && habitRows.length === 0) return 'required' as const
        return 'auto' as const
      })()

      const modelMessages = convertToModelMessages(boundedMessages)

      // Try each candidate provider in priority order. If one hits a rate limit
      // (per-minute TPM/RPM), fall through to the next instead of surfacing the error.
      let lastError: unknown = null
      for (const { model: chatModel, provider: chatProvider, modelId } of candidates) {
        try {
          const generation = trace.startObservation(
            'streamText',
            { model: modelId, input: [{ role: 'system', content: systemPrompt }] },
            { asType: 'generation' }
          )

          const result = streamText({
            model: chatModel,
            system: systemPrompt,
            messages: modelMessages,
            // GPT-OSS (the primary Groq model) spends part of the budget on
            // reasoning tokens before the reply/tool call. With chat running at
            // `reasoningEffort: 'medium'` (warmer prose) the cap needs headroom
            // so neither the reasoning nor the answer is truncated. Reasoning is
            // parsed out of `text` but still counts against this budget.
            maxOutputTokens: 1400,
            // A little sampling warmth so the prose doesn't collapse to the same
            // flat, analytical phrasing every turn (GPT-OSS runs cold by default).
            // Only on the text-only intents — the tool paths (add_transaction,
            // goal_setting, habit_setting) emit structured card arguments
            // (amount, category, date) that must stay faithful, so keep those cold.
            temperature: activeTools ? 0.2 : 0.75,
            providerOptions: groqChatProviderOptions,
            tools: activeTools,
            toolChoice,
            onFinish: async ({ text, usage }) => {
              try {
                generation
                  .update({
                    output: text,
                    usageDetails: usage
                      ? { input: usage.inputTokens ?? 0, output: usage.outputTokens ?? 0 }
                      : undefined,
                  })
                  .end()
                trace.end()
                await langfuseSpanProcessor.forceFlush()
              } catch (e) {
                console.error('[chat/langfuse teardown]', e)
              }
              // Fire-and-forget usage tracking and eval logging
              Promise.all([
                incrementUsage(chatProvider),
                logEval({
                  provider: chatProvider,
                  task: 'tool-calling',
                  input: message,
                  output: text,
                  latencyMs: 0,
                  tokensUsed: (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
                  traceId: trace.traceId,
                }),
              ]).catch((e) => console.error('[chat/eval log error]', e))
            },
          })

          // If the stream errors mid-flight, `onError` maps it to a client
          // message. The retry loop only catches sync/init errors.
          return result.toUIMessageStreamResponse({
            // Attach tone (for TTS), trace id (for feedback) and a timestamp to
            // the assistant message.
            messageMetadata: ({ part }) =>
              part.type === 'start'
                ? { traceId: trace.traceId, speechTone, createdAt: new Date().toISOString() }
                : undefined,
            onError: (error: unknown) => {
              console.error('[chat/stream error]', error)
              return error instanceof Error ? error.message : 'An error occurred.'
            },
          })
        } catch (e) {
          lastError = e
          console.warn(
            `[chat] provider ${chatProvider} failed, trying next:`,
            (e as Error).message
          )
        }
      }

      // All candidates failed
      console.error('[chat] all providers failed:', lastError)
      trace.end()
      await langfuseSpanProcessor.forceFlush()
      return new Response(
        JSON.stringify({
          error: 'All providers are currently unavailable. Please try again shortly.',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    })
  } catch (error) {
    console.error('[chat/route error]', error)
    return new Response(JSON.stringify({ error: 'Chat failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
