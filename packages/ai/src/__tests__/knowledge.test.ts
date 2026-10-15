import { describe, it, expect } from 'vitest'
import { searchKnowledge, formatKnowledgeContext, KNOWLEDGE } from '../knowledge'

describe('knowledge base', () => {
  it('has unique chunk IDs', () => {
    const ids = KNOWLEDGE.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every chunk has topics, text, and source', () => {
    for (const chunk of KNOWLEDGE) {
      expect(chunk.topics.length).toBeGreaterThan(0)
      expect(chunk.text.length).toBeGreaterThan(20)
      expect(chunk.source.length).toBeGreaterThan(5)
    }
  })
})

describe('searchKnowledge', () => {
  it('finds protein chunk for "how much protein do I need"', () => {
    const results = searchKnowledge('how much protein do I need')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.chunk.id).toBe('protein-needs')
  })

  it('finds vitamin D for "should I take vitamin D in winter"', () => {
    const results = searchKnowledge('should I take vitamin D in winter')
    expect(results.some((r) => r.chunk.id === 'vitamin-d')).toBe(true)
  })

  it('finds fibre/carbs for "how much fibre should I eat"', () => {
    const results = searchKnowledge('how much fibre should I eat')
    expect(results.some((r) => r.chunk.id === 'carbs-fibre')).toBe(true)
  })

  it('finds iron for "I feel tired and low energy"', () => {
    const results = searchKnowledge('I feel tired all the time, could it be iron')
    expect(results.some((r) => r.chunk.id === 'iron')).toBe(true)
  })

  it('finds vegan/B12 for "I am going vegan"', () => {
    const results = searchKnowledge('I am going vegan, what should I watch out for')
    expect(results.some((r) => r.chunk.id === 'plant-based' || r.chunk.id === 'vitamin-b12')).toBe(true)
  })

  it('finds gut health for "probiotics and fermented foods"', () => {
    const results = searchKnowledge('are probiotics and fermented foods good for digestion')
    expect(results.some((r) => r.chunk.id === 'gut-health')).toBe(true)
  })

  it('finds omega-3 for "fish oil benefits"', () => {
    const results = searchKnowledge('is fish oil good for me, omega 3')
    expect(results.some((r) => r.chunk.id === 'omega3-sources' || r.chunk.id === 'fat-types')).toBe(true)
  })

  it('finds sugar chunk for "how much sugar is too much"', () => {
    const results = searchKnowledge('how much sugar is too much')
    expect(results.some((r) => r.chunk.id === 'added-sugar')).toBe(true)
  })

  it('finds hydration for "how much water should I drink"', () => {
    const results = searchKnowledge('how much water should I drink per day')
    expect(results.some((r) => r.chunk.id === 'hydration')).toBe(true)
  })

  it('finds caffeine for "is coffee bad for me"', () => {
    const results = searchKnowledge('is coffee bad for me, how much caffeine is safe')
    expect(results.some((r) => r.chunk.id === 'caffeine')).toBe(true)
  })

  it('finds superfoods myth for "what are superfoods"', () => {
    const results = searchKnowledge('what are superfoods, should I eat acai and goji')
    expect(results.some((r) => r.chunk.id === 'superfoods-myth')).toBe(true)
  })

  it('returns at most topK results', () => {
    const results = searchKnowledge('food nutrition health', 2)
    expect(results.length).toBeLessThanOrEqual(2)
  })

  it('returns empty for nonsense queries', () => {
    const results = searchKnowledge('xyzzy plugh')
    expect(results).toHaveLength(0)
  })
})

describe('formatKnowledgeContext', () => {
  it('formats results with source citations', () => {
    const results = searchKnowledge('protein', 1)
    const ctx = formatKnowledgeContext(results)
    expect(ctx).toContain('Nutrition knowledge')
    expect(ctx).toContain('Source:')
    expect(ctx).toContain('protein')
  })

  it('returns empty string for no results', () => {
    expect(formatKnowledgeContext([])).toBe('')
  })
})
