import { AISLES, INGREDIENTS, type Aisle } from './ingredients'
import { RECIPES_BY_ID } from './recipes'

export interface ShoppingItem {
  ingredientId: string
  name: string
  nameDe: string
  aisle: Aisle
  /** Total grams the plan uses. */
  grams: number
  /** Packs to buy, rounded up. */
  packs: number
  packGrams: number
  /** Estimated cost of those packs. */
  cents: number
}

export interface ShoppingList {
  /** Bought items, in aisle order. */
  items: ShoppingItem[]
  /** Pantry staples the plan uses: listed to check, not costed. */
  pantry: { ingredientId: string; name: string; nameDe: string }[]
  /** Estimate from the static price table. */
  totalCents: number
}

/** Grams of each ingredient across a list of recipe servings. */
export function ingredientTotals(recipeIds: string[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const id of recipeIds) {
    const recipe = RECIPES_BY_ID[id]
    if (!recipe) continue
    for (const { id: ing, grams } of recipe.ingredients) {
      totals.set(ing, (totals.get(ing) ?? 0) + grams)
    }
  }
  return totals
}

/** Estimated cost of buying whole packs for these totals. Pantry is free. */
export function costOf(totals: Map<string, number>): number {
  let cents = 0
  for (const [id, grams] of totals) {
    const ing = INGREDIENTS[id]
    if (!ing || ing.pantry || grams <= 0) continue
    cents += Math.ceil(grams / ing.pack.grams) * ing.pack.cents
  }
  return cents
}

/** Aggregates a plan's recipes into packs to buy, grouped by aisle. */
export function buildShoppingList(recipeIds: string[]): ShoppingList {
  const items: ShoppingItem[] = []
  const pantry: ShoppingList['pantry'] = []
  for (const [id, grams] of ingredientTotals(recipeIds)) {
    const ing = INGREDIENTS[id]
    if (!ing) continue
    if (ing.pantry) {
      pantry.push({ ingredientId: id, name: ing.name, nameDe: ing.nameDe })
      continue
    }
    const packs = Math.ceil(grams / ing.pack.grams)
    items.push({
      ingredientId: id,
      name: ing.name,
      nameDe: ing.nameDe,
      aisle: ing.aisle,
      grams,
      packs,
      packGrams: ing.pack.grams,
      cents: packs * ing.pack.cents,
    })
  }
  items.sort(
    (a, b) => AISLES.indexOf(a.aisle) - AISLES.indexOf(b.aisle) || a.name.localeCompare(b.name)
  )
  pantry.sort((a, b) => a.name.localeCompare(b.name))
  return { items, pantry, totalCents: items.reduce((sum, i) => sum + i.cents, 0) }
}
