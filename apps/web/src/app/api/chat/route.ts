import { after, type NextRequest } from 'next/server'
import {
  streamText,
  convertToModelMessages,
  toUIMessageStream,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  type TextStreamPart,
  type ToolSet,
  type UIMessage,
} from 'ai'
import { startActiveObservation, propagateAttributes } from '@langfuse/tracing'
import {
  classifySafety,
  keywordScreen,
  classifyIntent,
  buildSystemPrompt,
  selectModelCandidates,
  langfuseSpanProcessor,
  groqChatProviderOptions,
  incrementUsage,
  logEval,
  consumeUserQuota,
  SAFE_RESPONSES,
  SAFETY_MAX_CHARS,
  parseMeal,
  parsePlanRequest,
  searchKnowledge,
  formatKnowledgeContext,
} from '@sproutine/ai'
import {
  generatePlan,
  isSafePlan,
  mealSlotAt,
  proposalWithoutNutrients,
  proposeMealLog,
  validatePlan,
  type MealLogProposal,
  type MealSlot,
  type Nutrients,
  type LoggedItem,
} from '@sproutine/food'
import {
  createFoodCache,
  createServerClient,
  getProfile,
  loadRecentMessages,
  getActivePlan,
  saveActivePlan,
  saveMessage,
  type StoredMessage,
} from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'
import { signTrace } from '@/lib/feedbackToken'
import { foodExternalLimiter } from '@/lib/foodLimits'
import { toPlanProfile } from '@/lib/planProfile'
import { summarisePlan, weekToPlan, type MealPlanSummary } from '@/lib/planSummary'

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_MESSAGE_CHARS = SAFETY_MAX_CHARS
const HISTORY_LIMIT = 10
// Earlier turns are context only; cap them so a client can't inflate token use.
const MAX_HISTORY_CHARS = 16_000
// Per-user cap so one account can't drain the shared free-tier LLM budget.
const CHAT_DAILY_LIMIT = 150

type SpeechTone = 'neutral' | 'reassuring'

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// v5+ UIMessages carry text in `parts`, not a `content` string.
function textOf(m: UIMessage | undefined): string {
  return (m?.parts ?? [])
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

/**
 * Waits for the first meaningful part of a model stream. Provider failures
 * (429s, 5xx) surface as an `error` part rather than a thrown exception, so
 * this is how the fallback loop learns a provider failed before any text was
 * sent. Returns the untouched stream for the client either way.
 */
async function firstSignal<T extends ToolSet>(
  stream: ReadableStream<TextStreamPart<T>>
): Promise<{ stream: ReadableStream<TextStreamPart<T>>; error: unknown }> {
  const [probe, rest] = stream.tee()
  const reader = probe.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return { stream: rest, error: null }
      if (value.type === 'error') return { stream: rest, error: value.error }
      if (value.type !== 'start' && value.type !== 'start-step')
        return { stream: rest, error: null }
    }
  } finally {
    // Stop buffering for the probe; `rest` keeps the source flowing.
    reader.cancel().catch(() => {})
  }
}

/** Caps each turn and the total history, keeping the most recent turns. */
function boundHistory(messages: UIMessage[]): UIMessage[] {
  const bounded: UIMessage[] = []
  let total = 0
  for (const m of [...messages].reverse()) {
    const text = textOf(m).slice(0, MAX_MESSAGE_CHARS)
    if (!text.trim()) continue
    if (total + text.length > MAX_HISTORY_CHARS && bounded.length > 0) break
    total += text.length
    bounded.unshift({ ...m, parts: [{ type: 'text', text }] })
  }
  return bounded
}

/** Eating-disorder signals switch the user to gentle mode for all later replies. */
async function enableSafetyMode(db: ReturnType<typeof createServerClient>, userId: string) {
  const { error } = await db.from('profiles').update({ safety_mode: true }).eq('user_id', userId)
  if (error) console.error('[chat] failed to enable safety mode:', error.message)
}

/**
 * Streams a fixed, pre-written reply — safety responses and the meal card's
 * caption, never model output. A meal proposal rides along as a data part.
 */
type DayReview = {
  date: string
  meals: { slot: string; names: string; time: string }[]
  totals?: { kcal?: number; protein?: number; carbs?: number; fat?: number }
  gentle: boolean
}

type MealEditAction = {
  type: 'move' | 'delete'
  mealId: string
  mealName: string
  mealTime: string
  currentSlot: MealSlot
  suggestedSlot?: MealSlot
}

type CardPart =
  | { type: 'data-meal-log'; data: MealLogProposal }
  | { type: 'data-meal-plan'; data: MealPlanSummary }
  | { type: 'data-day-review'; data: DayReview }
  | { type: 'data-meal-edit'; data: MealEditAction }

function templatedResponse(text: string, metadata: Record<string, unknown>, card?: CardPart) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const id = generateId()
      writer.write({ type: 'start', messageMetadata: metadata })
      writer.write({ type: 'text-start', id })
      writer.write({ type: 'text-delta', id, delta: text })
      writer.write({ type: 'text-end', id })
      if (card) writer.write(card)
      writer.write({ type: 'finish' })
    },
  })
  return createUIMessageStreamResponse({ stream })
}

const MEAL_CARD_TEXT = "Here's what I found. Check the amounts, then save it."
const planExistsText = (nextWeek: boolean) =>
  `You already have a plan for ${nextWeek ? 'next' : 'this'} week. To start over, open the Week tab and tap New plan.`
// Reading wishes for a plan gets a short budget; after it, keyword fallback.
const PLAN_PREFS_BUDGET_MS = 7_000
const PLAN_CARD_TEXT =
  "Here's your week. These are the dinners; the Week tab has every meal, swaps and your shopping list."
// External food lookups stop after this long so the turn (safety, intent,
// parsing, lookups) stays inside maxDuration even when OFF is slow. Items
// after the cut-off are matched from the cache only.
const MEAL_LOOKUP_BUDGET_MS = 10_000

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const { messages: clientMessages, trigger } = (await request.json()) as {
      messages?: UIMessage[]
      trigger?: unknown
    }
    if (!Array.isArray(clientMessages)) return json({ error: 'messages required' }, 400)

    const lastUser = [...clientMessages].reverse().find((m) => m.role === 'user')
    const message = textOf(lastUser).trim()
    const viaVoice = (lastUser?.metadata as { viaVoice?: unknown } | undefined)?.viaVoice === true
    if (!message) return json({ error: 'message required' }, 400)
    if (message.length > MAX_MESSAGE_CHARS) return json({ error: 'message too long' }, 413)

    const db = createServerClient()
    const profile = await getProfile(db, user.id)
    // No health data goes to any model without recorded consent (GDPR Art. 9).
    if (!profile || !profile.consentHealthAt) return json({ error: 'onboarding required' }, 409)

    // History comes from the database, which only the server writes: the
    // model never sees turns a client made up. The client sends only its new
    // message, which is stored here.
    const stored = await loadRecentMessages(db, user.id, HISTORY_LIMIT).catch((e) => {
      console.error('[chat] history load failed:', (e as Error).message)
      return [] as StoredMessage[]
    })
    const last = stored.at(-1)
    // "Resend" after a failed reply regenerates the same message; if it was
    // already stored, don't store it twice. A new message with the same text
    // ("a banana", then another) is a new message.
    const isResend =
      trigger === 'regenerate-message' && last?.role === 'user' && last.content === message
    const priorTurns = isResend ? stored.slice(0, -1) : stored
    const saveUserTurn = () =>
      isResend ? Promise.resolve() : saveMessage(db, user.id, { role: 'user', content: message })
    const replyWith = (text: string, safety: 'crisis' | 'ed_risk') =>
      saveMessage(db, user.id, { role: 'assistant', content: text, safety })

    if (!(await consumeUserQuota(user.id, 'chat', CHAT_DAILY_LIMIT))) {
      // The quota never blocks a crisis reply. The keyword screen is
      // deterministic and makes no model call, so it can't drain the budget.
      const urgent = keywordScreen(message)
      if (urgent?.category === 'crisis' || urgent?.category === 'ed_risk') {
        if (urgent.category === 'ed_risk' && !profile.safetyMode)
          await enableSafetyMode(db, user.id)
        // In order: the message, then the reply.
        await saveUserTurn()
        await replyWith(SAFE_RESPONSES[urgent.category], urgent.category)
        return templatedResponse(SAFE_RESPONSES[urgent.category], {
          safety: urgent.category,
          speechTone: 'reassuring' satisfies SpeechTone,
          createdAt: new Date().toISOString(),
        })
      }
      return json({ error: "You've reached today's chat limit. Rosie will be back tomorrow." }, 429)
    }
    // Stored only once the quota allows the turn, so an over-limit client
    // can't keep adding rows.
    await saveUserTurn()

    // Candidate selection only depends on the task, so start it now. The no-op
    // catch stops an early return below from leaving an unhandled rejection.
    const candidatesPromise = selectModelCandidates('fast-chat')
    candidatesPromise.catch(() => {})

    // Writes started while the reply streams (saving it to history). after()
    // runs once the response is finished, so they are all registered by then.
    const pendingWrites: Promise<unknown>[] = []
    // Serverless: finish those writes and export spans after the response
    // (including the stream) is done.
    after(async () => {
      await Promise.allSettled(pendingWrites)
      await langfuseSpanProcessor.forceFlush()
    })

    // One trace per chat turn; turns from the same day form one session.
    // Users are identified only by their pseudonym, never auth id or email.
    const sessionDay = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })
    return await propagateAttributes(
      {
        traceName: 'chat-turn',
        userId: profile.llmPseudonym,
        sessionId: `${profile.llmPseudonym}-${sessionDay}`,
        tags: ['chat'],
      },
      () =>
        startActiveObservation(
          'chat-turn',
          async (turn) => {
            // The turn outlives this callback while the reply streams, so it is
            // ended explicitly. Every path goes through endTurn so it ends
            // exactly once, with whatever it knows at that point.
            let ended = false
            const endTurn = (attrs: Parameters<typeof turn.update>[0]) => {
              if (ended) return
              ended = true
              turn.update(attrs).end()
            }

            try {
              // Trace input/output = what a reviewer needs at a glance: the user's
              // message in, Rosie's reply out.
              turn.update({ input: message })
              const meta = { traceId: turn.traceId }

              // Safety and intent are independent — run them together.
              const [safety, intent] = await Promise.all([
                startActiveObservation(
                  'check-safety',
                  async (guard) => {
                    guard.update({ input: message })
                    const verdict = await classifySafety(message, meta)
                    guard.update({
                      output: { category: verdict.category },
                      metadata: { source: verdict.source, reason: verdict.reason },
                    })
                    return verdict
                  },
                  { asType: 'guardrail' }
                ),
                startActiveObservation('classify-intent', async (span) => {
                  span.update({ input: message })
                  const result = await classifyIntent(message, meta)
                  span.update({ output: result.intent, metadata: { source: result.source } })
                  return result
                }),
              ])
              turn.update({
                metadata: {
                  intent: intent.intent,
                  safety: safety.category,
                  gentleMode: profile.safetyMode,
                },
              })

              if (safety.category === 'crisis' || safety.category === 'ed_risk') {
                if (safety.category === 'ed_risk' && !profile.safetyMode) {
                  await enableSafetyMode(db, user.id)
                }
                endTurn({ output: SAFE_RESPONSES[safety.category] })
                pendingWrites.push(replyWith(SAFE_RESPONSES[safety.category], safety.category))
                return templatedResponse(SAFE_RESPONSES[safety.category], {
                  traceId: turn.traceId,
                  // The client renders a safety card (call rows, no feedback
                  // buttons) instead of a normal bubble for these.
                  safety: safety.category,
                  speechTone: 'reassuring' satisfies SpeechTone,
                  createdAt: new Date().toISOString(),
                })
              }

              // Meal logging: the model only lists the foods; matching, grams
              // and nutrients are code. Nothing is saved until the user
              // confirms the card. If no food could be matched, Rosie answers
              // normally and asks for more detail.
              // Weekly plan: the model only reads wishes ("quick", "no pasta");
              // the planner (code) picks dishes that fit the profile.
              if (intent.intent === 'plan_week') {
                const planned = await startActiveObservation('plan-week', async (span) => {
                  span.update({ input: message })
                  try {
                    const { weekStart, fromDate, nextWeek } = weekToPlan()
                    // An existing plan may hold the person's swaps and shopping
                    // ticks: chat shows it rather than replacing it. Starting over
                    // is an explicit button in the Week tab.
                    const existing = await getActivePlan(db, user.id, weekStart)
                    if (existing) {
                      const summary = summarisePlan(existing.plan, [], nextWeek, true)
                      span.update({ output: { weekStart, existing: true } })
                      return summary
                    }

                    const prefs = await parsePlanRequest(message, meta, {
                      timeoutMs: PLAN_PREFS_BUDGET_MS,
                    })
                    const planProfile = toPlanProfile(profile)
                    const build = (p: typeof prefs) =>
                      generatePlan(planProfile, {
                        weekStart,
                        fromDate,
                        prefs: p,
                        seed: Math.floor(Math.random() * 2 ** 31),
                      })
                    // A broad "avoid" word can rule out nearly everything. Only
                    // when the wishes leave more slots empty than the profile
                    // alone does, plan without them (and say so on the card).
                    const gaps = (r: ReturnType<typeof build>) =>
                      r.issues.filter((i) => i.kind === 'no-recipe').length
                    let result = build(prefs)
                    let usedPrefs = prefs
                    let droppedWishes = false
                    if (gaps(result) > 0 && Object.keys(prefs).length > 0) {
                      const plain = build({})
                      if (gaps(plain) < gaps(result)) {
                        result = plain
                        usedPrefs = {}
                        droppedWishes = true
                      }
                    }
                    const { plan, issues } = result
                    if (!plan.days.some((d) => d.meals.dinner)) throw new Error('empty plan')
                    if (!isSafePlan(validatePlan(plan, planProfile))) throw new Error('unsafe plan')
                    await saveActivePlan(db, user.id, plan, usedPrefs)
                    const summary = {
                      ...summarisePlan(plan, issues, nextWeek),
                      ...(droppedWishes ? { droppedWishes: true } : {}),
                    }
                    span.update({
                      output: {
                        weekStart,
                        prefs,
                        usedPrefs,
                        dinners: summary.dinners.length,
                        issues,
                      },
                    })
                    return summary
                  } catch (e) {
                    span.update({ level: 'WARNING', statusMessage: String(e) })
                    return null
                  }
                })
                if (planned) {
                  const caption = planned.existing
                    ? planExistsText(planned.nextWeek)
                    : PLAN_CARD_TEXT
                  endTurn({ output: caption, metadata: { planWeek: planned.weekStart } })
                  // History keeps a plain record; the card itself isn't stored.
                  if (!planned.existing) {
                    pendingWrites.push(
                      saveMessage(db, user.id, {
                        role: 'assistant',
                        content: `I planned your week of ${planned.weekStart}. Dinners: ${planned.dinners
                          .map((d) => d.name)
                          .join(', ')}.`,
                      })
                    )
                  }
                  return templatedResponse(
                    caption,
                    {
                      traceId: turn.traceId,
                      feedbackToken: signTrace(turn.traceId, profile.llmPseudonym),
                      speechTone: 'neutral' satisfies SpeechTone,
                      createdAt: new Date().toISOString(),
                    },
                    { type: 'data-meal-plan', data: planned }
                  )
                }
              }

              if (intent.intent === 'log_meal') {
                const proposal = await startActiveObservation('propose-meal-log', async (span) => {
                  span.update({ input: message })
                  try {
                    const deadline = Date.now() + MEAL_LOOKUP_BUDGET_MS
                    const parsed = await parseMeal(message, meta)
                    if (!parsed?.items.length) {
                      span.update({ output: null, metadata: { reason: 'no items parsed' } })
                      return null
                    }
                    const result = await proposeMealLog(
                      {
                        slot: parsed.slot ?? mealSlotAt(new Date()),
                        source: viaVoice ? 'voice' : 'text',
                        items: parsed.items,
                      },
                      createFoodCache(db, user.id),
                      {
                        canCallExternal: () =>
                          Date.now() < deadline && foodExternalLimiter.tryAcquire(user.id),
                      }
                    )
                    span.update({
                      output: result.items.map((i) => ({
                        query: i.query,
                        match: i.match ? `${i.match.source}:${i.match.sourceId}` : null,
                        grams: i.grams,
                        basis: i.portion.basis,
                      })),
                    })
                    return result.items.some((i) => i.match) ? result : null
                  } catch (e) {
                    span.update({ level: 'WARNING', statusMessage: String(e) })
                    return null
                  }
                })
                if (proposal) {
                  endTurn({
                    output: MEAL_CARD_TEXT,
                    metadata: { mealItems: proposal.items.length },
                  })
                  return templatedResponse(
                    MEAL_CARD_TEXT,
                    {
                      traceId: turn.traceId,
                      feedbackToken: signTrace(turn.traceId, profile.llmPseudonym),
                      speechTone: 'neutral' satisfies SpeechTone,
                      createdAt: new Date().toISOString(),
                    },
                    {
                      type: 'data-meal-log',
                      data: profile.safetyMode ? proposalWithoutNutrients(proposal) : proposal,
                    }
                  )
                }
              }

              // Meal editing: find the most recent meal and determine the action.
              if (intent.intent === 'edit_log') {
                const editAction = await startActiveObservation('edit-log', async (span) => {
                  span.update({ input: message })
                  try {
                    const tz = profile.timezone || 'Europe/Berlin'
                    const dateStr = new Date().toLocaleDateString('sv-SE', { timeZone: tz })
                    const since = new Date(`${dateStr}T00:00:00`)
                    const { data } = await db
                      .from('meal_logs')
                      .select('id, eaten_at, meal_slot, items')
                      .eq('user_id', user.id)
                      .gte('eaten_at', since.toISOString())
                      .order('eaten_at', { ascending: false })
                      .limit(10)

                    if (!data?.length) {
                      span.update({ output: null, metadata: { reason: 'no meals today' } })
                      return null
                    }

                    const lowerMsg = message.toLowerCase()
                    const isDelete = /\b(delete|remove|undo|take off|entfern)\b/i.test(message)

                    // Try to figure out which meal and what slot they want
                    const slotMentions: Partial<Record<MealSlot, boolean>> = {}
                    if (/\b(breakfast|frühstück)\b/i.test(lowerMsg)) slotMentions.breakfast = true
                    if (/\b(lunch|mittagessen)\b/i.test(lowerMsg)) slotMentions.lunch = true
                    if (/\b(dinner|abendessen)\b/i.test(lowerMsg)) slotMentions.dinner = true
                    if (/\b(snack)\b/i.test(lowerMsg)) slotMentions.snack = true

                    // Find the target meal: mentioned slot or most recent
                    type LogRow = { id: string; eaten_at: string; meal_slot: MealSlot; items: LoggedItem[] }
                    const logs = data as LogRow[]
                    let target = logs[0]!
                    for (const log of logs) {
                      if (slotMentions[log.meal_slot]) { target = log; break }
                    }

                    // Determine suggested new slot from the message
                    let suggestedSlot: MealSlot | undefined
                    if (!isDelete) {
                      const mentionedSlots = Object.keys(slotMentions) as MealSlot[]
                      // The new slot is the one mentioned that isn't the current slot
                      suggestedSlot = mentionedSlots.find((s) => s !== target.meal_slot)
                      // If "it was dinner" pattern
                      if (!suggestedSlot) {
                        const wasMatch = lowerMsg.match(/(?:was|it's|it was|should be|actually)\s+(\w+)/i)
                        if (wasMatch) {
                          const w = wasMatch[1]!.toLowerCase()
                          if (/breakfast|frühstück/.test(w)) suggestedSlot = 'breakfast'
                          else if (/lunch|mittag/.test(w)) suggestedSlot = 'lunch'
                          else if (/dinner|abend/.test(w)) suggestedSlot = 'dinner'
                          else if (/snack/.test(w)) suggestedSlot = 'snack'
                        }
                      }
                    }

                    const mealName = target.items.map((i) => i.name).join(', ')
                    const mealTime = new Date(target.eaten_at).toLocaleTimeString([], {
                      hour: '2-digit', minute: '2-digit', timeZone: tz,
                    })

                    const action: MealEditAction = {
                      type: isDelete ? 'delete' : 'move',
                      mealId: target.id,
                      mealName,
                      mealTime,
                      currentSlot: target.meal_slot,
                      ...(suggestedSlot ? { suggestedSlot } : {}),
                    }
                    span.update({ output: action })
                    return action
                  } catch (e) {
                    span.update({ level: 'WARNING', statusMessage: String(e) })
                    return null
                  }
                })

                if (editAction) {
                  const caption = editAction.type === 'delete'
                    ? "Sure. This is the one I'd take off today's log:"
                    : "No problem. Here's the change:"
                  endTurn({ output: caption, metadata: { editType: editAction.type } })
                  pendingWrites.push(
                    saveMessage(db, user.id, { role: 'assistant', content: caption })
                  )
                  return templatedResponse(
                    caption,
                    {
                      traceId: turn.traceId,
                      feedbackToken: signTrace(turn.traceId, profile.llmPseudonym),
                      speechTone: 'neutral' satisfies SpeechTone,
                      createdAt: new Date().toISOString(),
                    },
                    { type: 'data-meal-edit', data: editAction }
                  )
                }
                // Fall through to normal response if no meals found
              }

              // Daily review: fetch today's meals and build a review card.
              if (intent.intent === 'daily_review') {
                const review = await startActiveObservation('daily-review', async (span) => {
                  try {
                    const tz = profile.timezone || 'Europe/Berlin'
                    const now = new Date()
                    // Get midnight in the user's timezone
                    const dateStr = now.toLocaleDateString('sv-SE', { timeZone: tz })
                    const since = new Date(`${dateStr}T00:00:00`)
                    const { data } = await db
                      .from('meal_logs')
                      .select('id, eaten_at, meal_slot, items, totals, partial')
                      .eq('user_id', user.id)
                      .gte('eaten_at', since.toISOString())
                      .order('eaten_at', { ascending: true })
                      .limit(50)

                    type LogRow = { id: string; eaten_at: string; meal_slot: MealSlot; items: LoggedItem[]; totals: Nutrients; partial: string[] }
                    const logs = (data ?? []) as LogRow[]
                    const meals = logs.map((r) => ({
                      slot: r.meal_slot,
                      names: r.items.map((i) => i.name).join(', '),
                      time: new Date(r.eaten_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: tz }),
                    }))

                    const gentle = profile.safetyMode === true
                    let totals: { kcal?: number; protein?: number; carbs?: number; fat?: number } | undefined
                    if (!gentle && logs.length > 0) {
                      const sum = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
                      for (const r of logs) {
                        if (r.totals) {
                          sum.kcal += r.totals.kcal ?? 0
                          sum.protein += r.totals.protein ?? 0
                          sum.carbs += r.totals.carbs ?? 0
                          sum.fat += r.totals.fat ?? 0
                        }
                      }
                      totals = { kcal: Math.round(sum.kcal), protein: sum.protein, carbs: sum.carbs, fat: sum.fat }
                    }

                    const review = {
                      date: now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz }),
                      meals,
                      totals,
                      gentle,
                    }
                    span.update({ output: { mealCount: meals.length, gentle } })
                    return review
                  } catch (e) {
                    span.update({ level: 'WARNING', statusMessage: String(e) })
                    return null
                  }
                })

                if (review && review.meals.length > 0) {
                  // Send a templated card with the day's meals
                  const reviewCaption = "Here's your day so far."
                  endTurn({ output: reviewCaption, metadata: { intent: 'daily_review', mealCount: review.meals.length } })
                  pendingWrites.push(
                    saveMessage(db, user.id, {
                      role: 'assistant',
                      content: `Daily review: ${review.meals.map((m) => `${m.slot}: ${m.names}`).join('; ')}.`,
                    })
                  )
                  return templatedResponse(
                    reviewCaption,
                    {
                      traceId: turn.traceId,
                      feedbackToken: signTrace(turn.traceId, profile.llmPseudonym),
                      speechTone: 'neutral' satisfies SpeechTone,
                      createdAt: new Date().toISOString(),
                    },
                    { type: 'data-day-review', data: review }
                  )
                }
                // If no meals or all providers failed, fall through to normal response
              }

              // Knowledge retrieval for nutrition questions: search the
              // curated knowledge base and inject relevant chunks so the
              // model can cite sources.
              let knowledgeContext: string | undefined
              let knowledgeSources: { id: string; source: string }[] | undefined
              if (intent.intent === 'ask_nutrition') {
                const results = searchKnowledge(message)
                if (results.length) {
                  knowledgeContext = formatKnowledgeContext(results)
                  knowledgeSources = results.map((r) => ({
                    id: r.chunk.id,
                    source: r.chunk.source,
                  }))
                  turn.update({ metadata: { knowledgeChunks: knowledgeSources.map((s) => s.id) } })
                }
              }

              const instructions = buildSystemPrompt({
                profile,
                intent: intent.intent,
                medical: safety.category === 'medical',
                today: new Date().toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'Europe/Berlin',
                }),
                knowledgeContext,
              })

              // Stored turns plus this message; empty turns are dropped (some
              // providers reject them) and the history is bounded by size.
              const history = boundHistory([
                ...priorTurns.map((m, i): UIMessage => ({
                  id: `h${i}`,
                  role: m.role,
                  parts: [{ type: 'text', text: m.content }],
                })),
                { id: 'current', role: 'user', parts: [{ type: 'text', text: message }] },
              ])
              const modelMessages = await convertToModelMessages(history)
              const speechTone: SpeechTone =
                safety.category === 'medical' ? 'reassuring' : 'neutral'

              // Try candidates in priority order. A provider that fails before
              // sending any text (e.g. a per-minute rate limit) falls through to
              // the next; errors after text has started surface via onError.
              // Each attempt is recorded as its own `generate-response` generation
              // (model, tokens, reasoning) by the Langfuse AI SDK integration.
              let lastError: unknown = null
              for (const { model, provider } of await candidatesPromise) {
                try {
                  const start = Date.now()

                  const result = streamText({
                    model,
                    instructions,
                    messages: modelMessages,
                    // GPT-OSS spends part of the budget on (parsed-out) reasoning.
                    maxOutputTokens: 1400,
                    temperature: 0.7,
                    providerOptions: groqChatProviderOptions,
                    telemetry: { functionId: 'generate-response' },
                    // Usage bookkeeping only; the turn is ended by the UI stream's
                    // onEnd, which also fires when the client disconnects.
                    onEnd: ({ usage }) => {
                      Promise.all([
                        incrementUsage(provider),
                        logEval({
                          provider,
                          task: 'fast-chat',
                          latencyMs: Date.now() - start,
                          tokensUsed: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
                          traceId: turn.traceId,
                        }),
                      ]).catch((e) => console.error('[chat/eval log error]', e))
                    },
                  })

                  const first = await firstSignal(result.stream)
                  if (first.error) {
                    first.stream.cancel().catch(() => {})
                    throw first.error
                  }

                  const stream = toUIMessageStream({
                    stream: first.stream,
                    // Tone (for TTS), trace id (for feedback) and a timestamp ride
                    // on the assistant message.
                    messageMetadata: ({ part }) =>
                      part.type === 'start'
                        ? {
                            traceId: turn.traceId,
                            feedbackToken: signTrace(turn.traceId, profile.llmPseudonym),
                            speechTone,
                            createdAt: new Date().toISOString(),
                            ...(knowledgeSources?.length ? { sources: knowledgeSources } : {}),
                          }
                        : undefined,
                    onError: (error: unknown) => {
                      console.error('[chat/stream error]', error)
                      endTurn({ level: 'ERROR', statusMessage: String(error) })
                      return 'Rosie had trouble answering. Please try again.'
                    },
                    // Fires on completion, abort and client disconnect alike.
                    onEnd: ({ responseMessage, isAborted, isCancelled, outcome }) => {
                      const interrupted = isAborted || isCancelled === true
                      const failed = outcome.status === 'failed'
                      const reply = textOf(responseMessage).trim()
                      // Only complete replies become history.
                      if (!interrupted && !failed && reply) {
                        pendingWrites.push(
                          saveMessage(db, user.id, { role: 'assistant', content: reply })
                        )
                      }
                      endTurn({
                        output: textOf(responseMessage),
                        metadata: { provider, ...(interrupted ? { interrupted: true } : {}) },
                        ...(failed
                          ? {
                              level: 'ERROR' as const,
                              statusMessage: String(outcome.error ?? 'stream failed'),
                            }
                          : interrupted
                            ? { level: 'WARNING' as const, statusMessage: 'stream ended early' }
                            : {}),
                      })
                    },
                  })
                  return createUIMessageStreamResponse({ stream })
                } catch (e) {
                  lastError = e
                  console.warn(
                    `[chat] provider ${provider} failed, trying next:`,
                    (e as Error).message
                  )
                }
              }

              console.error('[chat] all providers failed:', lastError)
              endTurn({ level: 'ERROR', statusMessage: 'all providers failed' })
              return json(
                { error: 'All providers are currently unavailable. Please try again shortly.' },
                503
              )
            } catch (error) {
              endTurn({ level: 'ERROR', statusMessage: String(error) })
              throw error
            }
          },
          { endOnExit: false }
        )
    )
  } catch (error) {
    console.error('[chat/route error]', error)
    return json({ error: 'Chat failed' }, 500)
  }
}
