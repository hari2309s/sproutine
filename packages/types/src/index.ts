// ─── Profile ──────────────────────────────────────────────────────────────────

export const DIETS = ['omnivore', 'vegetarian', 'vegan', 'pescatarian'] as const
export type Diet = (typeof DIETS)[number]

// The 14 allergens EU Regulation 1169/2011 (Annex II) requires labels to declare.
// Food data from Open Food Facts maps onto these codes, so plans and logs can be
// checked against a profile without free-text matching.
export const EU_ALLERGENS = [
  'gluten',
  'crustaceans',
  'eggs',
  'fish',
  'peanuts',
  'soybeans',
  'milk',
  'nuts',
  'celery',
  'mustard',
  'sesame',
  'sulphites',
  'lupin',
  'molluscs',
] as const
export type Allergen = (typeof EU_ALLERGENS)[number]

export interface Profile {
  userId: string
  displayName: string
  diet: Diet
  allergies: Allergen[]
  dislikes: string[]
  /** Weekly grocery budget in euro cents, or null if the user skipped it. */
  budgetWeeklyCents: number | null
  goals: string[]
  quitDate: string | null
  locale: string
  voiceId: string
  /** Set when the safety gate sees eating-disorder signals. Hides numbers and targets. */
  safetyMode: boolean
  consentHealthAt: string | null
  /** Stable random id sent to LLM providers instead of the user id, name or email. */
  llmPseudonym: string
}

// ─── Agents ───────────────────────────────────────────────────────────────────

export const INTENT = {
  LOG_MEAL: 'log_meal',
  EDIT_LOG: 'edit_log',
  PLAN_WEEK: 'plan_week',
  ADJUST_PLAN: 'adjust_plan',
  ASK_NUTRITION: 'ask_nutrition',
  SHOPPING_LIST: 'shopping_list',
  DAILY_REVIEW: 'daily_review',
  SET_HABIT: 'set_habit',
  GREETING: 'greeting',
  OTHER: 'other',
} as const
export type Intent = (typeof INTENT)[keyof typeof INTENT]
export const INTENTS = Object.values(INTENT) as Intent[]

export const SAFETY_CATEGORIES = ['ok', 'ed_risk', 'crisis', 'medical'] as const
export type SafetyCategory = (typeof SAFETY_CATEGORIES)[number]

export interface SafetyVerdict {
  category: SafetyCategory
  /** Which layer decided: deterministic keyword match or the LLM classifier. */
  source: 'keyword' | 'classifier' | 'default'
  /** Matched keyword or classifier rationale, for traces only — never shown to the user. */
  reason?: string
}

// ─── Safety contacts ──────────────────────────────────────────────────────────
//
// Single source for the helplines shown in safety replies, used by both the
// server's templated text (packages/ai/src/safety.ts) and the chat UI's
// safety card. Verified 2026-10-13; re-check before each release.

export interface SafetyContact {
  name: string
  /** Display form; `tel` is the dialable form. */
  number: string
  tel: string
}

export const SAFETY_CONTACTS = {
  telefonSeelsorge: { name: 'TelefonSeelsorge', number: '0800 111 0 111', tel: '08001110111' },
  telefonSeelsorgeAlt: { name: 'TelefonSeelsorge', number: '0800 111 0 222', tel: '08001110222' },
  emergency: { name: 'Emergency', number: '112', tel: '112' },
  // BIÖG, formerly BZgA. Mon–Thu 10–22, Fri–Sun 10–18; Cologne local rate.
  eatingDisorders: { name: 'BIÖG eating-disorder helpline', number: '0221 892031', tel: '0221892031' },
} as const satisfies Record<string, SafetyContact>
