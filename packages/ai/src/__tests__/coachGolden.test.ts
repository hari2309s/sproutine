import { describe, it, expect } from 'vitest'
import { searchKnowledge } from '../knowledge'
import { COACH_ITEMS } from '../../evals/coach-items'

describe('coach-golden: retrieval accuracy', () => {
  let hits = 0
  const total = COACH_ITEMS.length

  for (const item of COACH_ITEMS) {
    it(`${item.id}: "${item.query}" → retrieves [${item.expectedChunks.join(', ')}]`, () => {
      const results = searchKnowledge(item.query, 3)
      const ids = results.map((r) => r.chunk.id)
      // At least one of the expected chunks must appear.
      const found = item.expectedChunks.some((ec) => ids.includes(ec))
      if (found) hits++
      expect(found).toBe(true)
    })
  }

  it('aggregate: retrieval accuracy ≥ 0.90 (36/40)', () => {
    // Re-run to compute the aggregate.
    let correct = 0
    for (const item of COACH_ITEMS) {
      const results = searchKnowledge(item.query, 3)
      const ids = results.map((r) => r.chunk.id)
      if (item.expectedChunks.some((ec) => ids.includes(ec))) correct++
    }
    const accuracy = correct / total
    console.log(`Coach retrieval: ${correct}/${total} = ${(accuracy * 100).toFixed(1)}%`)
    expect(accuracy).toBeGreaterThanOrEqual(0.9)
  })
})
