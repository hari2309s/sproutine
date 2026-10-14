import { describe, it, expect } from 'vitest'
import { generatePlan } from '@sproutine/food'
import { summarisePlan, weekToPlan } from '../planSummary'

describe('weekToPlan', () => {
  it('plans the rest of this week Monday to Thursday (Berlin time)', () => {
    // Wednesday 14 Oct 2026, 10:00 Berlin
    expect(weekToPlan(new Date('2026-10-14T08:00:00Z'))).toEqual({
      weekStart: '2026-10-12',
      fromDate: '2026-10-14',
      nextWeek: false,
    })
  })

  it('plans next week from Friday, by the Berlin date', () => {
    // Thursday 23:30 UTC is already Friday in Berlin.
    expect(weekToPlan(new Date('2026-10-15T23:30:00Z'))).toEqual({
      weekStart: '2026-10-19',
      nextWeek: true,
    })
    expect(weekToPlan(new Date('2026-10-18T12:00:00Z')).weekStart).toBe('2026-10-19')
  })
})

describe('summarisePlan', () => {
  it('lists dinners by day with the shopping estimate', () => {
    const { plan, issues, shopping } = generatePlan(
      { diet: 'vegan', allergies: [], dislikes: [], budgetWeeklyCents: null },
      { weekStart: '2026-10-19', fromDate: '2026-10-21' }
    )
    const summary = summarisePlan(plan, issues, true)
    expect(summary.dinners.map((d) => d.date)).toEqual([
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ])
    // Human names, not recipe ids.
    expect(
      summary.dinners.every(
        (d) => d.name !== plan.days.find((x) => x.date === d.date)!.meals.dinner
      )
    ).toBe(true)
    expect(summary.totalCents).toBe(shopping.totalCents)
  })
})
