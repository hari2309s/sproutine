import { routedGenerateText } from '../router'
import { INTENT_ROUTER_PROMPT, INTENT_KEYWORDS } from '../prompts/intentRouter.prompt'
import type { QueryIntent } from '@truffle/types'

// Questions about spending should not be classified as add_transaction
// even though they contain keywords like "i spent" or "i paid".
const QUESTION_PATTERN = /^(how|what|where|when|why|which|do |did |have |has |can )/i

function classifyByKeywords(query: string): QueryIntent | null {
  const lower = query.toLowerCase()
  const isQuestion = QUESTION_PATTERN.test(query.trim()) || query.trim().endsWith('?')
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    // Skip add_transaction keywords for questions — "how much have I spent
    // on subscriptions?" should not be treated as a transaction to log.
    if (intent === 'add_transaction' && isQuestion) continue
    if (
      keywords.some((kw) =>
        // Short keywords (≤3 chars) like 'hi', 'hey', 'sup' must match as whole
        // words — otherwise 'hi' matches inside "membership", 'hey' inside "they", etc.
        kw.length <= 3 ? new RegExp(`\\b${kw}\\b`).test(lower) : lower.includes(kw)
      )
    ) {
      return intent as QueryIntent
    }
  }
  return null
}

// Detects shorthand transaction messages — a description followed by a price.
// Handles two patterns:
//   1. "Netflix subscription 15.99"  (description + amount)
//   2. "Add a transport ticket for 2.50"  (description + for/at + amount)
const SHORTHAND_DIRECT = /^[a-zA-Z][\w\s\-'']+\s\d+(?:\.\d{1,2})?$/
const SHORTHAND_FOR = /^[a-zA-Z][\w\s\-'']+\s(?:for|at)\s\d+(?:\.\d{1,2})?$/

// First-person expense statement with a price in the sentence:
// "I just spend 30 euros on groceries", "I paid 12 for parking", "spent €4.50 at Costa".
// Tolerates the common present-tense phrasing ("I just spend …") as well as past tense.
const SPEND_VERB = /\b(just\s+)?(spent|spend|paid|bought)\b/i
// A price-like token: currency symbol + number, or a number followed by a currency word.
const PRICE_TOKEN = /[€£$]\s?\d|\d+(?:\.\d{1,2})?\s?(?:euros?|dollars?|pounds?|eur|gbp|usd|quid|bucks)\b/i
// Recurring phrasing is a habit, not a one-time purchase — don't hand it a transaction card.
const RECURRENCE = /\b(every|per|each)\s+(day|week|month|year)\b|\b(daily|weekly|monthly|yearly|annually)\b/i

function looksLikeTransaction(query: string): boolean {
  const trimmed = query.trim()
  // Must be short (likely a quick log, not a question or paragraph)
  if (trimmed.length > 80) return false
  // Must not contain question marks, question words, hypothetical language, or correction phrases
  if (
    /\?|how|what|when|where|why|which|can i|do i|should|will|might|maybe|thinking about|planning to|i'd like to|actually it was|actually it's|no it was|correction|i meant/i.test(
      trimmed
    )
  )
    return false
  if (SHORTHAND_DIRECT.test(trimmed) || SHORTHAND_FOR.test(trimmed)) return true
  // "I just spend 30 euros on groceries" — expense verb + a real price, and not
  // recurring. Broad category words ("groceries", "food") would otherwise steal
  // this into category_breakdown before the transaction ever gets a card.
  return SPEND_VERB.test(trimmed) && PRICE_TOKEN.test(trimmed) && !RECURRENCE.test(trimmed)
}

export async function routeIntent(query: string): Promise<QueryIntent> {
  // Pattern-based detection runs first — shorthand transactions like
  // "Netflix 15.99" or "Add a transport ticket for 2.50" contain a
  // price-like number that is a strong signal. Running this before
  // keywords prevents broad category keywords (e.g. 'transport') from
  // intercepting legitimate transaction logging.
  if (looksLikeTransaction(query)) return 'add_transaction'

  // Keyword path second
  const keywordIntent = classifyByKeywords(query)
  if (keywordIntent) return keywordIntent

  // Fall back to LLM classification
  try {
    const { text } = await routedGenerateText('fast-chat', {
      system: INTENT_ROUTER_PROMPT,
      prompt: query,
      // GPT-OSS spends part of the budget on reasoning tokens before the label,
      // so a tight cap (was 20) truncates the answer to an empty string.
      maxOutputTokens: 256,
    })
    const validIntents: QueryIntent[] = [
      'spending_summary',
      'affordability_check',
      'anomaly_review',
      'forecast_request',
      'category_breakdown',
      'savings_goal_check',
      'goal_setting',
      'add_transaction',
      'habit_setting',
      'greeting',
      'general_advice',
    ]
    // Expect a bare label (reasoning is now stripped from `text`); tolerate only
    // surrounding quotes/punctuation/whitespace. Anything else → safe default.
    const normalized = text.trim().toLowerCase().replace(/^["'`.\s]+|["'`.\s]+$/g, '')
    return validIntents.includes(normalized as QueryIntent)
      ? (normalized as QueryIntent)
      : 'general_advice'
  } catch {
    return 'general_advice'
  }
}
