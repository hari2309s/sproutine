import { describe, it, expect } from 'vitest'
import { keywordPlanPreferences, normalizePlanRequest } from '../planRequest'

describe('plan request', () => {
  it('reads "quick" without a model', () => {
    expect(keywordPlanPreferences('plan me a quick week please')).toEqual({ maxMinutes: 25 })
    expect(keywordPlanPreferences('Plan meine Woche, aber schnell')).toEqual({ maxMinutes: 25 })
    expect(keywordPlanPreferences('plan my week')).toEqual({})
  })

  it('cleans model output and clamps times', () => {
    expect(
      normalizePlanRequest({ maxMinutes: 5, avoid: [' Pasta ', 'pasta', 'x'], prefer: ['Curry'] })
    ).toEqual({ maxMinutes: 15, avoid: ['pasta'], prefer: ['curry'] })
    expect(normalizePlanRequest({ maxMinutes: null, avoid: [], prefer: [] })).toEqual({})
  })
})
