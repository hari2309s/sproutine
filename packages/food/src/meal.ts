import { computeNutrients, EMPTY_NUTRIENTS } from './nutrients'
import { estimatePortion, type PortionEstimate, type PortionUnit } from './portions'
import { searchFood, type ExternalGuards, type FoodCache, type SearchSources } from './search'
import type { FoodRecord, FoodSource, Nutrients } from './types'
import { MAX_ITEM_GRAMS, MAX_MEAL_ITEMS, type MealSlot, type MealSource } from './mealBasics'

export { MEAL_SLOTS, MEAL_SOURCES, MAX_MEAL_ITEMS, MAX_ITEM_GRAMS, mealSlotAt } from './mealBasics'
export type { MealSlot, MealSource } from './mealBasics'

/** One food as the user described it, extracted by the model. No numbers but theirs. */
export interface ParsedMealItem {
  name: string
  /** Only when the user said a number. */
  quantity?: number
  /** Only when the user said a unit. */
  unit?: PortionUnit
}

export interface ProposedItem {
  /** What the user called it — shown when no food matched. */
  query: string
  /** Best database match, or null when nothing fitting was found. */
  match: FoodRecord | null
  /** Other plausible matches the user can swap to. */
  alternatives: FoodRecord[]
  grams: number
  portion: PortionEstimate
}

/** What the confirm card shows. Nothing is saved until the user confirms. */
export interface MealLogProposal {
  slot: MealSlot
  source: MealSource
  items: ProposedItem[]
}

/**
 * Turns the parsed items into a proposal: a database match plus a portion
 * estimate for each. Items are looked up one after another so a multi-item
 * meal doesn't burst past the shared external API limits.
 */
export async function proposeMealLog(
  parsed: { slot: MealSlot; source: MealSource; items: ParsedMealItem[] },
  cache: FoodCache,
  {
    sources,
    canCallExternal,
  }: { sources?: SearchSources } & Pick<ExternalGuards, 'canCallExternal'> = {}
): Promise<MealLogProposal> {
  const items: ProposedItem[] = []
  for (const item of parsed.items.slice(0, MAX_MEAL_ITEMS)) {
    const query = item.name.trim().slice(0, 120)
    if (!query) continue
    const { foods } = await searchFood(query, cache, { limit: 4, sources, canCallExternal })
    // A food whose stated kcal contradicts its macros is never picked by default.
    const usable = foods.filter((f) => f.quality !== 'inconsistent')
    const portion = estimatePortion(query, item.quantity, item.unit)
    items.push({
      query,
      match: usable[0] ?? null,
      alternatives: usable.slice(1, 4),
      grams: Math.min(portion.grams, MAX_ITEM_GRAMS),
      portion,
    })
  }
  return { slot: parsed.slot, source: parsed.source, items }
}

/** A food plus grams, as it is stored on a log. */
export interface LoggedItem {
  source: FoodSource
  sourceId: string
  name: string
  brand: string | null
  grams: number
  /** Copied at log time so later cache corrections don't rewrite history. */
  nutrients: Nutrients
}

export interface MealLogRecord {
  items: LoggedItem[]
  totals: Nutrients
  /** Nutrients some items didn't know, so the total is a lower bound. */
  partial: (keyof Nutrients)[]
}

/** The stored shape of a log. Totals always come from code, never a model. */
export function buildMealLog(items: { food: FoodRecord; grams: number }[]): MealLogRecord {
  const { items: computed, totals, partial } = computeNutrients(items)
  return {
    items: computed.map(({ food, grams, nutrients }) => ({
      source: food.source,
      sourceId: food.sourceId,
      name: food.name,
      brand: food.brand,
      grams,
      nutrients,
    })),
    totals,
    partial,
  }
}

/**
 * Gentle mode: the same food with every number removed, so data sent to the
 * browser carries no nutrients at all rather than relying on the UI hiding them.
 */
export function withoutNutrients(food: FoodRecord): FoodRecord {
  return {
    ...food,
    per100g: { ...EMPTY_NUTRIENTS },
    estimatedNutrients: [],
    servingG: null,
    quality: 'incomplete',
  }
}

export function proposalWithoutNutrients(proposal: MealLogProposal): MealLogProposal {
  return {
    ...proposal,
    items: proposal.items.map((i) => ({
      ...i,
      match: i.match && withoutNutrients(i.match),
      alternatives: i.alternatives.map(withoutNutrients),
    })),
  }
}
