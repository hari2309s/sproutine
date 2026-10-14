import { describe, it, expect } from 'vitest'
import { normalizeParsedMeal, ParsedMealSchema } from '../mealParse'

describe('normalizeParsedMeal', () => {
  it('keeps names and only the numbers the user said', () => {
    expect(
      normalizeParsedMeal({
        slot: 'breakfast',
        items: [
          { name: '  Vollkornbrot ', quantity: 2, unit: 'slice' },
          { name: 'Käse', quantity: null, unit: null },
        ],
      })
    ).toEqual({
      slot: 'breakfast',
      items: [{ name: 'Vollkornbrot', quantity: 2, unit: 'slice' }, { name: 'Käse' }],
    })
  })

  it('drops blank names and impossible quantities, caps the item count', () => {
    const out = normalizeParsedMeal({
      slot: null,
      items: [
        { name: ' ', quantity: 1, unit: null },
        { name: 'Apfel', quantity: -1, unit: null },
        { name: 'Wasser', quantity: Number.NaN, unit: 'glass' },
        ...Array.from({ length: 10 }, (_, i) => ({ name: `x${i}`, quantity: null, unit: null })),
      ],
    })
    expect(out.items[0]).toEqual({ name: 'Apfel' })
    expect(out.items[1]).toEqual({ name: 'Wasser', unit: 'glass' })
    expect(out.items).toHaveLength(8)
  })

  it('schema rejects units outside the list', () => {
    expect(
      ParsedMealSchema.safeParse({ slot: null, items: [{ name: 'x', quantity: 1, unit: 'oz' }] })
        .success
    ).toBe(false)
  })
})
