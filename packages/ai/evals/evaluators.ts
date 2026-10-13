import type { Evaluation, Evaluator, RunEvaluator } from '@langfuse/client'
import { routedGenerateText } from '../src/router'
import { computeMonthProjection } from '../src/agents/projection'
import { HARI_SNAPSHOT, HARI_GOALS } from './fixtures'
import type { EvalItemInput, EvalItemMetadata, NumericCheckKey } from './dataset-items'

// --- numeric-faithfulness -----------------------------------------------
//
// Several agents splice a pre-computed figure (balance, projected balance,
// goal progress) straight into their prompt, then make one free-text LLM
// call. The realistic failure mode isn't the model not knowing the number —
// it's already in its context — it's the model doing its own (wrong) mental
// math and restating a different figure. A subjective 1-5 "was this
// helpful" judge won't reliably catch that, so this checks the fixture math
// directly, using the exact same helper the agents call in production.

function resolveExpectedNumeric(key: NumericCheckKey): number {
  const laptopGoal = HARI_GOALS.find((g) => g.id === 'eval-goal-laptop')!
  switch (key) {
    case 'projectedBalance':
      return computeMonthProjection(HARI_SNAPSHOT).projectedBalance
    case 'totalSpent':
      return Math.abs(HARI_SNAPSHOT.totalExpenses)
    case 'totalIncome':
      return HARI_SNAPSHOT.totalIncome
    case 'goalLaptopRemaining':
      return laptopGoal.targetAmount - laptopGoal.savedAmount
    case 'goalLaptopSaved':
      return laptopGoal.savedAmount
  }
}

// Matches "€1,234.56", "1176.89", "-45", etc. Tries the comma-grouped form
// first, falling back to a plain run of digits — `.toFixed(2)` (how every
// prompt template formats these figures) never inserts thousands commas, so
// a comma-anchored-only pattern silently splits e.g. "1176.89" into "117"
// and "6.89" instead of matching the whole number.
const NUMBER_TOKEN = /-?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|-?\d+(?:\.\d{1,2})?/g

function extractNumbers(text: string): number[] {
  return [...text.matchAll(NUMBER_TOKEN)].map((m) => Number(m[0].replace(/,/g, '')))
}

const NUMERIC_TOLERANCE_ABS = 1 // euros — allows the model to round to whole euros

export const numericFaithfulness: Evaluator<EvalItemInput, undefined, EvalItemMetadata> = async ({
  output,
  metadata,
}) => {
  const key = metadata?.numericCheck
  if (!key) return []

  const expected = resolveExpectedNumeric(key)
  const found = extractNumbers(String(output)).some(
    (n) => Math.abs(n - expected) <= NUMERIC_TOLERANCE_ABS
  )

  return {
    name: 'numeric_faithfulness',
    value: found ? 1 : 0,
    comment: found
      ? `Response cites a figure matching the computed ${key} (${expected.toFixed(2)})`
      : `Response never cites the computed ${key} (${expected.toFixed(2)}) — possible hallucinated figure`,
  }
}

// --- intent exact-match (router items only) ------------------------------

export const intentExactMatch: Evaluator<EvalItemInput, undefined, EvalItemMetadata> = async ({
  input,
  output,
  metadata,
}) => {
  if (input.agent !== 'intentRouter' || !metadata?.expectedIntent) return []
  const passed = output === metadata.expectedIntent
  return {
    name: 'intent_exact_match',
    value: passed ? 1 : 0,
    comment: passed ? undefined : `routeIntent() returned "${output}", expected "${metadata.expectedIntent}"`,
  }
}

// --- response-quality LLM judge (agent items only) ------------------------
//
// Mirrors the "response-quality" evaluator already live in Langfuse
// (evaluator id cmtoi8lc8034iad0cpr0z1r59) so CI gets an immediate score
// instead of waiting on that evaluator's async production pipeline. Keep
// this rubric in sync with the Langfuse evaluator if either changes.

// A compliant judge returns exactly "4". But reasoningFormat: 'parsed' doesn't
// always fully strip chain-of-thought from `text` — when it leaks, the first
// stray digit 1-5 (e.g. from a restated "€480" or "1,200" in the judge's own
// explanation) is not the score. Try an exact bare-integer match first; only
// fall back to scanning for a standalone (word-boundaried) digit, preferring
// the last one since a leaked preamble precedes the actual verdict.
function parseJudgeScore(text: string): number | null {
  const trimmed = text.trim()
  const exact = Number(trimmed)
  if (Number.isInteger(exact) && exact >= 1 && exact <= 5) return exact

  const matches = trimmed.match(/\b[1-5]\b/g)
  return matches?.length ? Number(matches[matches.length - 1]) : null
}

export const responseQualityJudge: Evaluator<EvalItemInput, undefined, EvalItemMetadata> = async ({
  input,
  output,
}) => {
  if (input.agent === 'intentRouter') return []

  const prompt = `You are evaluating an AI financial assistant's response.

User input:
${input.query}

AI response:
${output}

Score the response 1-5 on this scale:
1 = Wrong, harmful, or completely irrelevant
2 = Partially relevant but missing key info
3 = Adequate but not great
4 = Good, accurate, and helpful
5 = Excellent — precise, useful, well-framed

Respond with ONLY the integer score.`

  const { text } = await routedGenerateText('reasoning', { prompt, maxOutputTokens: 256 })
  const score = parseJudgeScore(text)

  return {
    name: 'response_quality',
    value: score ?? 0,
    comment: score === null ? `Judge did not return a parseable score: "${text.slice(0, 80)}"` : undefined,
  }
}

// --- run-level aggregates --------------------------------------------------

function average(evaluations: Array<{ evaluations: Evaluation[] }>, name: string): number | null {
  const values = evaluations
    .flatMap((r) => r.evaluations)
    .filter((e) => e.name === name && typeof e.value === 'number')
    .map((e) => e.value as number)
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null
}

export const avgIntentAccuracy: RunEvaluator<EvalItemInput, undefined, EvalItemMetadata> = async ({
  itemResults,
}) => {
  const avg = average(itemResults, 'intent_exact_match')
  return avg === null ? [] : { name: 'avg_intent_accuracy', value: avg }
}

export const avgResponseQuality: RunEvaluator<EvalItemInput, undefined, EvalItemMetadata> = async ({
  itemResults,
}) => {
  const avg = average(itemResults, 'response_quality')
  return avg === null ? [] : { name: 'avg_response_quality', value: avg }
}

export const avgNumericFaithfulness: RunEvaluator<EvalItemInput, undefined, EvalItemMetadata> = async ({
  itemResults,
}) => {
  const avg = average(itemResults, 'numeric_faithfulness')
  return avg === null ? [] : { name: 'avg_numeric_faithfulness', value: avg }
}
