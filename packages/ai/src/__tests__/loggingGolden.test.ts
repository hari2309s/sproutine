import { describe, it, expect } from 'vitest'
import { estimatePortion } from '@sproutine/food'
import { GRAMS_TOLERANCE, LOGGING_CASES } from '../../evals/logging-items'

// The portion half of the logging eval, run offline: given a correct parse,
// the estimator must land within tolerance of what the person meant. The LLM
// eval (evals/) then only measures how well the model reads the sentence.
describe('logging-golden portions', () => {
  it('has 50 cases with unique ids', () => {
    expect(LOGGING_CASES).toHaveLength(50)
    expect(new Set(LOGGING_CASES.map((c) => c.id)).size).toBe(50)
  })

  for (const c of LOGGING_CASES) {
    it(`${c.id}: ${c.query}`, () => {
      for (const item of c.items) {
        const { grams } = estimatePortion(item.ideal.name, item.ideal.quantity, item.ideal.unit)
        const off = Math.abs(grams - item.grams) / item.grams
        expect(off, `${item.ideal.name}: ${grams} g vs ${item.grams} g`).toBeLessThanOrEqual(
          GRAMS_TOLERANCE
        )
      }
    })
  }
})
