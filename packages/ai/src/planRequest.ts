import { z } from 'zod'
import type { PlanPreferences } from '@sproutine/food'
import { routedGenerateObject } from './router'

// The model only turns wishes into preferences; the planner (code) picks
// the dishes. Unparseable or failed → no preferences, and the plan still
// fits the profile.

const PlanRequestSchema = z.object({
  maxMinutes: z.number().nullable(),
  avoid: z.array(z.string()).max(10),
  prefer: z.array(z.string()).max(10),
})

const PLAN_REQUEST_PROMPT = `Someone asked a meal-planning app for a weekly plan. Extract their wishes for this week.

- maxMinutes: the longest cooking time they want, in minutes ("quick", "fast", "schnell", "no time" → 25; "under 20 minutes" → 20). null if they said nothing about time.
- avoid: foods or ingredients they don't want this week, as short words in their language ("no pasta" → "pasta", "ohne Pilze" → "Pilze").
- prefer: foods, ingredients or dish types they asked for ("lots of curry" → "curry", "more fish" → "fish").
Leave lists empty when they said nothing. Don't add anything they didn't say.`

/** Keyword fallback for the commonest wish, so it works without a model. */
export function keywordPlanPreferences(message: string): PlanPreferences {
  return /\b(quick|fast|easy|schnell|einfach|no\s+time|keine\s+zeit)\b/i.test(message)
    ? { maxMinutes: 25 }
    : {}
}

export function normalizePlanRequest(out: z.infer<typeof PlanRequestSchema>): PlanPreferences {
  const words = (xs: string[]) =>
    [
      ...new Set(
        xs.map((x) => x.trim().toLowerCase()).filter((x) => x.length >= 3 && x.length <= 40)
      ),
    ].slice(0, 10)
  const prefs: PlanPreferences = {}
  if (out.maxMinutes != null && Number.isFinite(out.maxMinutes)) {
    prefs.maxMinutes = Math.min(120, Math.max(15, Math.round(out.maxMinutes)))
  }
  const avoid = words(out.avoid)
  const prefer = words(out.prefer)
  if (avoid.length) prefs.avoid = avoid
  if (prefer.length) prefs.prefer = prefer
  return prefs
}

export async function parsePlanRequest(
  message: string,
  meta?: { traceId?: string }
): Promise<PlanPreferences> {
  const result = await routedGenerateObject(
    'structured',
    PlanRequestSchema,
    {
      instructions: PLAN_REQUEST_PROMPT,
      prompt: message.slice(0, 1000),
      maxOutputTokens: 400,
      temperature: 0,
      functionId: 'parse-plan-request',
    },
    meta
  ).catch(() => null)
  return result ? normalizePlanRequest(result.object) : keywordPlanPreferences(message)
}
