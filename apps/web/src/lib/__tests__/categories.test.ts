import { describe, it, expect } from 'vitest'
import { CATEGORY_EMOJI, formatCategory } from '../categories'

describe('CATEGORY_EMOJI', () => {
  it('has an entry for every expected category', () => {
    const expected = [
      'food_groceries',
      'food_delivery',
      'transport',
      'housing',
      'utilities',
      'subscriptions',
      'health',
      'entertainment',
      'shopping',
      'income',
      'savings',
      'other',
    ]
    for (const cat of expected) {
      expect(CATEGORY_EMOJI).toHaveProperty(cat)
    }
  })

  it('all values are non-empty strings', () => {
    for (const [, emoji] of Object.entries(CATEGORY_EMOJI)) {
      expect(typeof emoji).toBe('string')
      expect(emoji.length).toBeGreaterThan(0)
    }
  })
})

describe('formatCategory', () => {
  it('converts snake_case to Title Case', () => {
    expect(formatCategory('food_groceries')).toBe('Food Groceries')
  })

  it('handles single-word categories', () => {
    expect(formatCategory('transport')).toBe('Transport')
    expect(formatCategory('health')).toBe('Health')
    expect(formatCategory('other')).toBe('Other')
  })

  it('handles multi-part keys', () => {
    expect(formatCategory('food_delivery')).toBe('Food Delivery')
    expect(formatCategory('food_groceries')).toBe('Food Groceries')
  })

  it('uppercases first letter of each word', () => {
    expect(formatCategory('a_b_c')).toBe('A B C')
  })

  it('handles already-uppercase input without double-casing', () => {
    expect(formatCategory('INCOME')).toBe('INCOME')
  })
})
