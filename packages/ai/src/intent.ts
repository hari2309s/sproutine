import type { Intent } from '@sproutine/types'
import { INTENT, INTENTS } from '@sproutine/types'
import { routedGenerateText } from './router'

// Keyword fast path: most messages are unambiguous, and skipping the LLM call
// saves free-tier quota on every one of them. Checked in order — the first
// matching rule wins, so more specific intents come first.
const RULES: [Intent, RegExp][] = [
  [INTENT.GREETING, /^\s*(hi|hey|hello|hallo|moin|servus|guten\s+(morgen|tag|abend)|good\s+(morning|afternoon|evening))\b[\s!.,?]*$/i],
  [INTENT.EDIT_LOG, /\b(change|edit|fix|correct|remove|delete|undo)\b.*\b(log|logged|entry|meal|breakfast|lunch|dinner|snack)\b/i],
  [INTENT.SHOPPING_LIST, /\b(shopping|grocery|groceries)\s+list\b|\beinkaufsliste\b|\bwhat\s+(do\s+i|should\s+i)\s+buy\b/i],
  [INTENT.ADJUST_PLAN, /\b(swap|replace|change|move|adjust|skip)\b.*\b(plan|meal\s+plan|tomorrow'?s|tonight'?s|dinner|lunch)\b/i],
  [INTENT.PLAN_WEEK, /\b(plan|planning)\s+(my|the|next|this)?\s*(week|meals|menu)\b|\bmeal\s+plan\b|\bwochenplan\b|\bessensplan\b/i],
  [INTENT.DAILY_REVIEW, /\bhow\s+(did|am|was)\s+i\s+(do|doing)\b|\b(today|this\s+week)'?s?\s+(summary|review|recap)\b|\bwhat\s+did\s+i\s+eat\b/i],
  [INTENT.SET_HABIT, /\b(habit|streak|every\s+day|daily\s+goal|remind\s+me)\b/i],
  [INTENT.LOG_MEAL, /\b(same\s+as\s+yesterday|repeat\s+yesterday|yesterday'?s?\s+(breakfast|lunch|dinner|meal)|wie\s+gestern)\b/i],
  [INTENT.LOG_MEAL, /\b(i\s+(just\s+)?(had|ate|eaten|drank|snacked)|for\s+(breakfast|lunch|dinner)\s+i|log\s+(my\s+)?(meal|breakfast|lunch|dinner|snack)|ich\s+(habe|hatte)\b.*\b(gegessen|getrunken))\b/i],
  [INTENT.ASK_NUTRITION, /\b(how\s+much|how\s+many|is\s+it\s+(ok|okay|healthy|bad)|should\s+i\s+eat|what'?s\s+(a\s+)?(good|healthy)|protein|fibre|fiber|vitamin|calories\s+in|kcal\s+in|healthy)\b/i],
]

export function keywordIntent(message: string): Intent | null {
  for (const [intent, pattern] of RULES) {
    if (pattern.test(message)) return intent
  }
  return null
}

const INTENT_PROMPT = `Classify the user's message to a healthy-eating companion app into exactly one intent.

- log_meal: they ate or drank something and want it recorded ("had muesli with yoghurt")
- edit_log: change or remove something already logged
- plan_week: create a meal plan for the week or several days
- adjust_plan: change an existing plan (swap a meal, skip a day)
- ask_nutrition: a question about food, nutrients, recipes or healthy eating
- shopping_list: wants a shopping/grocery list
- daily_review: how their day or week of eating went
- set_habit: wants to build a habit or streak, or a reminder
- greeting: hello or small talk with no request
- other: anything else

Return only the intent label.`

export function parseIntentLabel(text: string): Intent | null {
  const cleaned = text.trim().toLowerCase().replace(/[^a-z_]/g, ' ').trim()
  const exact = INTENTS.find((i) => i === cleaned)
  if (exact) return exact
  return INTENTS.find((i) => new RegExp(`\\b${i}\\b`).test(cleaned)) ?? null
}

export interface IntentResult {
  intent: Intent
  /** Which layer decided — recorded on the trace for debugging misroutes. */
  source: 'keyword' | 'llm' | 'default'
}

export async function classifyIntent(
  message: string,
  meta?: { traceId?: string }
): Promise<IntentResult> {
  const fast = keywordIntent(message)
  if (fast) return { intent: fast, source: 'keyword' }

  const { text } = await routedGenerateText(
    'classify',
    {
      instructions: INTENT_PROMPT,
      prompt: message.slice(0, 1000),
      maxOutputTokens: 200,
      temperature: 0,
      functionId: 'classify-intent',
    },
    meta
  )
  const parsed = parseIntentLabel(text)
  return parsed ? { intent: parsed, source: 'llm' } : { intent: INTENT.OTHER, source: 'default' }
}

export async function routeIntent(message: string, meta?: { traceId?: string }): Promise<Intent> {
  return (await classifyIntent(message, meta)).intent
}
