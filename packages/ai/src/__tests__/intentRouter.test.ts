import { describe, it, expect, vi } from 'vitest'

// Mock the LLM router so keyword tests never hit the network.
// routeIntent falls back to routedGenerateText only when no keyword matches.
vi.mock('../router', () => ({
  routedGenerateText: vi.fn().mockResolvedValue({ text: 'general_advice', usage: {} }),
}))

import { routeIntent } from '../agents/intentRouter'

describe('routeIntent — keyword classification (no LLM call)', () => {
  it('classifies "i just paid" as add_transaction', async () => {
    expect(await routeIntent('i just paid for coffee')).toBe('add_transaction')
  })

  it('classifies "i bought" as add_transaction', async () => {
    expect(await routeIntent('i bought new shoes today')).toBe('add_transaction')
  })

  it('add_transaction wins over spending_summary on shared "spent" keyword', async () => {
    // "i just spent" is in add_transaction list and must beat "expenses" from spending_summary
    expect(await routeIntent('i just spent €50 on groceries')).toBe('add_transaction')
  })

  it('classifies "i spent" as add_transaction', async () => {
    expect(await routeIntent('i spent 12 euros on lunch today')).toBe('add_transaction')
  })

  it('classifies present-tense "I just spend 30 euros on groceries" as add_transaction', async () => {
    // "spend" (not "spent") + the category word "groceries" previously routed to
    // category_breakdown, so the transaction card never appeared.
    expect(await routeIntent('I just spend 30 euros on groceries')).toBe('add_transaction')
  })

  it('does not classify recurring "I spend 200 euros every month on food" as add_transaction', async () => {
    const result = await routeIntent('I spend 200 euros every month on food')
    expect(result).not.toBe('add_transaction')
  })

  it('does not misclassify "membership" as greeting due to "hi" substring', async () => {
    // "membership" contains "hi" but should NOT trigger the greeting intent.
    // Without word-boundary matching, 'hi' inside "membership" wins as greeting.
    const result = await routeIntent('paid 45 euros for a gym membership yesterday')
    expect(result).not.toBe('greeting')
  })

  it('classifies spending question as spending_summary', async () => {
    expect(await routeIntent('how much did i spend this month?')).toBe('spending_summary')
  })

  it('classifies "can i afford" as affordability_check', async () => {
    expect(await routeIntent('can i afford a new laptop?')).toBe('affordability_check')
  })

  it('classifies "unusual charge" as anomaly_review', async () => {
    expect(await routeIntent('there is an unusual charge on my account')).toBe('anomaly_review')
  })

  it('does not misclassify "Netflix subscription 15.99" as anomaly_review', async () => {
    // Bare "subscription" previously matched anomaly_review, intercepting transaction logging
    const result = await routeIntent('Netflix subscription 15.99')
    expect(result).not.toBe('anomaly_review')
  })

  it('classifies "forgotten subscription" as anomaly_review', async () => {
    expect(await routeIntent('do I have a forgotten subscription?')).toBe('anomaly_review')
  })

  // Shorthand transaction pattern: "description + amount"
  it('classifies "Netflix subscription 15.99" as add_transaction (shorthand)', async () => {
    expect(await routeIntent('Netflix subscription 15.99')).toBe('add_transaction')
  })

  it('classifies "Uber 12" as add_transaction (shorthand)', async () => {
    expect(await routeIntent('Uber 12')).toBe('add_transaction')
  })

  it('classifies "coffee 5.50" as add_transaction (shorthand)', async () => {
    expect(await routeIntent('coffee 5.50')).toBe('add_transaction')
  })

  it('classifies "Add a mass transport ticket for 2.50" as add_transaction (shorthand with for)', async () => {
    expect(await routeIntent('Add a mass transport ticket for 2.50')).toBe('add_transaction')
  })

  it('classifies "lunch at 12" as add_transaction (shorthand with at)', async () => {
    expect(await routeIntent('lunch at 12')).toBe('add_transaction')
  })

  it('does not classify questions with numbers as shorthand transactions', async () => {
    const result = await routeIntent('how much did I spend on food?')
    expect(result).not.toBe('add_transaction')
  })

  it('does not classify "I might buy a jacket for 80" as shorthand transaction', async () => {
    const result = await routeIntent('I might buy a jacket for 80')
    expect(result).not.toBe('add_transaction')
  })

  it('does not classify "thinking about getting a laptop for 1500" as shorthand transaction', async () => {
    const result = await routeIntent('thinking about getting a laptop for 1500')
    expect(result).not.toBe('add_transaction')
  })

  it('does not classify "actually it was 35" as shorthand transaction (correction phrase)', async () => {
    const result = await routeIntent('actually it was 35')
    expect(result).not.toBe('add_transaction')
  })

  it('classifies "where does my money go" as category_breakdown', async () => {
    expect(await routeIntent('where does my money go?')).toBe('category_breakdown')
  })

  it('does not classify "how much have I spent on subscriptions" as add_transaction', async () => {
    const result = await routeIntent('how much have I spent on subscriptions?')
    expect(result).not.toBe('add_transaction')
  })

  it('classifies "give me a spending breakdown" as category_breakdown', async () => {
    expect(await routeIntent('give me a spending breakdown')).toBe('category_breakdown')
  })

  it('classifies "end of month" as forecast_request', async () => {
    expect(await routeIntent('how much will i have at end of month?')).toBe('forecast_request')
  })

  it('classifies food category question as category_breakdown', async () => {
    // "how much do i spend" (no "did") avoids the spending_summary keyword "how much did i spend"
    expect(await routeIntent('how much do i spend on groceries?')).toBe('category_breakdown')
  })

  it('classifies "savings goal" as savings_goal_check', async () => {
    expect(await routeIntent('how is my savings goal going?')).toBe('savings_goal_check')
  })

  it('classifies "i want to save for" as goal_setting', async () => {
    expect(await routeIntent('i want to save for a holiday')).toBe('goal_setting')
  })

  it('classifies "save every week" as habit_setting', async () => {
    expect(await routeIntent('i want to save every week')).toBe('habit_setting')
  })

  it('classifies "hey" as greeting', async () => {
    expect(await routeIntent('hey there!')).toBe('greeting')
  })

  it('classifies "tips" as general_advice', async () => {
    expect(await routeIntent('any tips for saving money?')).toBe('general_advice')
  })
})

describe('routeIntent — LLM fallback for unrecognised queries', () => {
  it('falls back to general_advice when LLM returns an unknown intent', async () => {
    const { routedGenerateText } = await import('../router')
    vi.mocked(routedGenerateText).mockResolvedValueOnce({
      text: 'unknown_intent_xyz',
      usage: { promptTokens: 0, completionTokens: 0 },
    })
    // "fjord klaxon zymurgy" contains no keyword substrings — forces the LLM path
    expect(await routeIntent('fjord klaxon zymurgy')).toBe('general_advice')
  })

  it('falls back to general_advice when LLM call throws', async () => {
    const { routedGenerateText } = await import('../router')
    vi.mocked(routedGenerateText).mockRejectedValueOnce(new Error('network error'))
    expect(await routeIntent('fjord klaxon zymurgy')).toBe('general_advice')
  })
})
