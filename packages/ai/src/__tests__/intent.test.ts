import { describe, it, expect } from 'vitest'
import { keywordIntent, parseIntentLabel } from '../intent'

describe('keywordIntent', () => {
  it.each([
    ['hi!', 'greeting'],
    ['Guten Morgen', 'greeting'],
    ['I just had a Brezel and a coffee', 'log_meal'],
    ['Ich habe zwei Scheiben Vollkornbrot gegessen', 'log_meal'],
    ['can you plan my week', 'plan_week'],
    ['make me a shopping list', 'shopping_list'],
    ['swap tomorrow’s dinner for something vegan', 'adjust_plan'],
    ['delete the snack I logged', 'edit_log'],
    ['how much protein is in tofu?', 'ask_nutrition'],
    ['how did I do today?', 'daily_review'],
    ['help me build a habit of eating breakfast', 'set_habit'],
  ])('%s → %s', (msg, expected) => {
    expect(keywordIntent(msg)).toBe(expected)
  })

  it('does not treat a greeting followed by a request as small talk', () => {
    expect(keywordIntent('hi, can you plan my week?')).toBe('plan_week')
  })

  it('returns null when nothing matches, leaving it to the LLM', () => {
    expect(keywordIntent('tell me a joke')).toBeNull()
  })
})

describe('parseIntentLabel', () => {
  it('parses exact and noisy labels', () => {
    expect(parseIntentLabel('log_meal')).toBe('log_meal')
    expect(parseIntentLabel(' Intent: plan_week.')).toBe('plan_week')
  })

  it('returns null for unknown labels', () => {
    expect(parseIntentLabel('banana')).toBeNull()
  })
})
