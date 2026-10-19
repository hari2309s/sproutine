import { findFood, type PortionUnit } from './portions'

export interface PortionOption {
  unit: PortionUnit | 'serving'
  count: number
  grams: number
}

const CHIP_UNITS: PortionUnit[] = [
  'slice',
  'piece',
  'glass',
  'cup',
  'bowl',
  'bar',
  'handful',
  'tbsp',
]

/**
 * Quick portion choices for picking a food by hand: its own units (one and two
 * slices, one piece…), the pack serving when known, a typical portion, and
 * 100 g. The first option is the suggested default. At most four, no repeats.
 */
export function portionOptions(food: {
  name: string
  nameDe?: string | null
  servingG?: number | null
}): PortionOption[] {
  const entry = (food.nameDe && findFood(food.nameDe)) || findFood(food.name)
  const out: PortionOption[] = []
  const add = (o: PortionOption) => {
    if (o.grams > 0 && !out.some((x) => x.grams === o.grams)) out.push(o)
  }
  if (entry) {
    for (const unit of CHIP_UNITS) {
      const g = entry.units[unit]
      if (g == null) continue
      add({ unit, count: 1, grams: Math.round(g) })
      if (unit === 'slice' || unit === 'piece') add({ unit, count: 2, grams: Math.round(g * 2) })
    }
  }
  if (food.servingG) add({ unit: 'serving', count: 1, grams: Math.round(food.servingG) })
  if (entry && out.length === 0) add({ unit: 'portion', count: 1, grams: entry.default })
  add({ unit: 'g', count: 100, grams: 100 })
  return out.slice(0, 4)
}
