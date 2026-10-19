import { describe, it, expect } from 'vitest'
import { portionOptions } from '../portionOptions'

describe('portionOptions', () => {
  it('offers one and two slices of bread first, then 100 g', () => {
    expect(portionOptions({ name: 'Vollkornbrot' })).toEqual([
      { unit: 'slice', count: 1, grams: 45 },
      { unit: 'slice', count: 2, grams: 90 },
      { unit: 'g', count: 100, grams: 100 },
    ])
  })

  it('uses the German name when the English one is unknown', () => {
    expect(portionOptions({ name: 'Whole grain loaf xyz', nameDe: 'Roggenbrot' })[0]).toEqual({
      unit: 'slice',
      count: 1,
      grams: 45,
    })
  })

  it('adds the pack serving and drops duplicate weights', () => {
    const opts = portionOptions({ name: 'Mystery snack', servingG: 100 })
    expect(opts).toEqual([{ unit: 'serving', count: 1, grams: 100 }])
  })

  it('falls back to 100 g for unknown foods', () => {
    expect(portionOptions({ name: 'qwerty' })).toEqual([{ unit: 'g', count: 100, grams: 100 }])
  })

  it('never returns more than four options', () => {
    expect(portionOptions({ name: 'Kuchen', servingG: 75 }).length).toBeLessThanOrEqual(4)
  })
})
