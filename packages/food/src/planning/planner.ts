import type { Allergen, Diet } from '@sproutine/types'
import {
  fitsDiet,
  recipeAllergens,
  recipeMentions,
  RECIPES,
  RECIPES_BY_ID,
  type Recipe,
} from './recipes'
import { buildShoppingList, costOf, ingredientTotals, type ShoppingList } from './shopping'

// The week planner is plain code: it picks seed recipes that fit the person,
// so a plan can never contain an allergen or break their diet, and it works
// without any model. A model may turn "something cheap, lots of pasta" into
// PlanPreferences; it never chooses or invents dishes.

export const PLAN_SLOTS = ['breakfast', 'lunch', 'dinner'] as const
export type PlanSlot = (typeof PLAN_SLOTS)[number]

export interface PlanDay {
  /** YYYY-MM-DD */
  date: string
  /** Recipe ids; a missing slot means no recipe fitted. */
  meals: Partial<Record<PlanSlot, string>>
}

export interface MealPlan {
  /** Monday, YYYY-MM-DD */
  weekStart: string
  days: PlanDay[]
}

export interface PlanProfile {
  diet: Diet
  allergies: Allergen[]
  dislikes: string[]
  /** Weekly grocery budget in cents, or null for none. */
  budgetWeeklyCents: number | null
}

export interface PlanPreferences {
  /** Longest cooking time for a main, in minutes. */
  maxMinutes?: number
  /** Extra words to avoid this week ("no mushrooms"). */
  avoid?: string[]
  /** Words to favour ("pasta", "curry"). */
  prefer?: string[]
}

export type PlanIssue =
  | { kind: 'no-recipe'; slot: PlanSlot }
  | { kind: 'over-budget'; costCents: number; budgetCents: number }

/** A plan may cost up to 10 % over the budget before it counts as over. */
export const BUDGET_TOLERANCE = 0.1

const MAX_REPEATS: Record<Recipe['slot'], number> = { breakfast: 3, main: 2 }

/** Small seeded PRNG (mulberry32), so a seed always gives the same week. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Recipes this person can eat at this kind of slot. */
export function eligibleRecipes(
  profile: PlanProfile,
  slot: Recipe['slot'],
  prefs: PlanPreferences = {}
): Recipe[] {
  const avoid = [...profile.dislikes, ...(prefs.avoid ?? [])]
  return RECIPES.filter(
    (recipe) =>
      recipe.slot === slot &&
      fitsDiet(recipe, profile.diet) &&
      !recipeAllergens(recipe).some((a) => profile.allergies.includes(a)) &&
      !avoid.some((w) => recipeMentions(recipe, w)) &&
      (slot !== 'main' || !prefs.maxMinutes || recipe.minutes <= prefs.maxMinutes)
  )
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Monday of the week containing `date`, as YYYY-MM-DD. */
export function weekStartOf(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

const recipeIdsOf = (plan: MealPlan): string[] =>
  plan.days.flatMap((d) => PLAN_SLOTS.map((s) => d.meals[s]).filter((id): id is string => !!id))

const slotKind = (slot: PlanSlot): Recipe['slot'] => (slot === 'breakfast' ? 'breakfast' : 'main')

export interface GeneratedPlan {
  plan: MealPlan
  shopping: ShoppingList
  issues: PlanIssue[]
}

/**
 * Builds a week. Each slot takes the candidate that adds least to the
 * shopping bill (packs already bought for earlier meals cost nothing extra),
 * plus a penalty for repeats and a little seeded randomness for variety.
 * Tonight's dinner may come back as tomorrow's lunch: cook once, eat twice.
 * Then meals are swapped for cheaper ones until the week fits the budget.
 */
export function generatePlan(
  profile: PlanProfile,
  { weekStart, prefs = {}, seed = 1 }: { weekStart: string; prefs?: PlanPreferences; seed?: number }
): GeneratedPlan {
  const random = rng(seed)
  const pools = {
    breakfast: eligibleRecipes(profile, 'breakfast', prefs),
    main: eligibleRecipes(profile, 'main', prefs),
  }
  const prefer = (prefs.prefer ?? []).filter((w) => w.trim().length >= 3)
  const issues: PlanIssue[] = []

  const days: PlanDay[] = Array.from({ length: 7 }, (_, i) => ({
    date: addDays(weekStart, i),
    meals: {},
  }))
  const counts = new Map<string, number>()
  let totals = new Map<string, number>()

  const with_ = (base: Map<string, number>, recipe: Recipe) => {
    const next = new Map(base)
    for (const { id, grams } of recipe.ingredients) next.set(id, (next.get(id) ?? 0) + grams)
    return next
  }

  const scoreFor = (recipe: Recipe, dayIndex: number, slot: PlanSlot) => {
    const used = counts.get(recipe.id) ?? 0
    const leftovers =
      slot === 'lunch' && dayIndex > 0 && days[dayIndex - 1]!.meals.dinner === recipe.id
    const repeatPenalty = leftovers ? 0 : used * (recipe.slot === 'breakfast' ? 120 : 250)
    const marginal = costOf(with_(totals, recipe)) - costOf(totals)
    const bonus = prefer.some((w) => recipeMentions(recipe, w)) ? -150 : 0
    return marginal + repeatPenalty + bonus + random() * 80
  }

  for (let d = 0; d < 7; d++) {
    for (const slot of PLAN_SLOTS) {
      const kind = slotKind(slot)
      const pool = pools[kind]
      const sameDay = new Set(Object.values(days[d]!.meals))
      const fresh = pool.filter(
        (r) => (counts.get(r.id) ?? 0) < MAX_REPEATS[kind] && !sameDay.has(r.id)
      )
      // Small pools (several allergies) may need more repeats than usual.
      const candidates = fresh.length ? fresh : pool.filter((r) => !sameDay.has(r.id))
      if (!candidates.length) {
        if (!issues.some((x) => x.kind === 'no-recipe' && x.slot === slot)) {
          issues.push({ kind: 'no-recipe', slot })
        }
        continue
      }
      const best = candidates
        .map((r) => ({ r, score: scoreFor(r, d, slot) }))
        .sort((a, b) => a.score - b.score)[0]!.r
      days[d]!.meals[slot] = best.id
      counts.set(best.id, (counts.get(best.id) ?? 0) + 1)
      totals = with_(totals, best)
    }
  }

  const plan: MealPlan = { weekStart, days }
  if (profile.budgetWeeklyCents != null) fitBudget(plan, profile.budgetWeeklyCents, pools)

  const shopping = buildShoppingList(recipeIdsOf(plan))
  if (
    profile.budgetWeeklyCents != null &&
    shopping.totalCents > profile.budgetWeeklyCents * (1 + BUDGET_TOLERANCE)
  ) {
    issues.push({
      kind: 'over-budget',
      costCents: shopping.totalCents,
      budgetCents: profile.budgetWeeklyCents,
    })
  }
  return { plan, shopping, issues }
}

/**
 * Swaps one meal at a time for whichever eligible recipe lowers the week's
 * cost most, until the plan fits or no swap helps. Repeat caps are relaxed
 * here: a cheaper week with an extra repeat beats one over budget.
 */
function fitBudget(
  plan: MealPlan,
  budgetCents: number,
  pools: Record<Recipe['slot'], Recipe[]>
): void {
  const ids = () => recipeIdsOf(plan)
  let cost = costOf(ingredientTotals(ids()))
  for (let round = 0; round < 40 && cost > budgetCents; round++) {
    let bestSwap: { day: number; slot: PlanSlot; id: string; cost: number } | null = null
    for (let d = 0; d < plan.days.length; d++) {
      for (const slot of PLAN_SLOTS) {
        const current = plan.days[d]!.meals[slot]
        if (!current) continue
        const kind = slotKind(slot)
        for (const candidate of pools[kind]) {
          if (candidate.id === current) continue
          const others = PLAN_SLOTS.filter((s) => s !== slot).map((s) => plan.days[d]!.meals[s])
          if (others.includes(candidate.id)) continue
          const uses = ids().filter((x) => x === candidate.id).length
          if (uses >= MAX_REPEATS[kind] + 1) continue
          plan.days[d]!.meals[slot] = candidate.id
          const next = costOf(ingredientTotals(ids()))
          plan.days[d]!.meals[slot] = current
          if (next < cost && (!bestSwap || next < bestSwap.cost)) {
            bestSwap = { day: d, slot, id: candidate.id, cost: next }
          }
        }
      }
    }
    if (!bestSwap) break
    plan.days[bestSwap.day]!.meals[bestSwap.slot] = bestSwap.id
    cost = bestSwap.cost
  }
}

export interface PlanCheck {
  /** Recipe ids not in the seed set. */
  unknown: string[]
  allergenHits: { recipeId: string; allergens: Allergen[] }[]
  dietViolations: string[]
  dislikeHits: { recipeId: string; word: string }[]
  costCents: number
  withinBudget: boolean
}

/** Checks any plan (including one a client sends back) against a profile. */
export function validatePlan(plan: MealPlan, profile: PlanProfile): PlanCheck {
  const ids = recipeIdsOf(plan)
  const check: PlanCheck = {
    unknown: [],
    allergenHits: [],
    dietViolations: [],
    dislikeHits: [],
    costCents: costOf(ingredientTotals(ids)),
    withinBudget: true,
  }
  for (const id of new Set(ids)) {
    const recipe = RECIPES_BY_ID[id]
    if (!recipe) {
      check.unknown.push(id)
      continue
    }
    const hits = recipeAllergens(recipe).filter((a) => profile.allergies.includes(a))
    if (hits.length) check.allergenHits.push({ recipeId: id, allergens: hits })
    if (!fitsDiet(recipe, profile.diet)) check.dietViolations.push(id)
    for (const word of profile.dislikes) {
      if (recipeMentions(recipe, word)) check.dislikeHits.push({ recipeId: id, word })
    }
  }
  check.withinBudget =
    profile.budgetWeeklyCents == null ||
    check.costCents <= profile.budgetWeeklyCents * (1 + BUDGET_TOLERANCE)
  return check
}

/** True when nothing in the plan is unsafe or against the person's diet. */
export function isSafePlan(check: PlanCheck): boolean {
  return (
    check.unknown.length === 0 &&
    check.allergenHits.length === 0 &&
    check.dietViolations.length === 0 &&
    check.dislikeHits.length === 0
  )
}

/**
 * Replaces one meal with another eligible recipe: one not already eaten that
 * day, preferring cheap additions to this week's shopping and dishes not yet
 * in the plan. Returns null when nothing else fits.
 */
export function swapMeal(
  plan: MealPlan,
  profile: PlanProfile,
  { date, slot, seed = Date.now() }: { date: string; slot: PlanSlot; seed?: number },
  prefs: PlanPreferences = {}
): MealPlan | null {
  const day = plan.days.find((d) => d.date === date)
  if (!day) return null
  const current = day.meals[slot]
  const random = rng(seed)
  const otherIds = recipeIdsOf(plan).filter((_, i, all) => all.indexOf(current ?? '') !== i)
  const baseTotals = ingredientTotals(otherIds)
  const baseCost = costOf(baseTotals)
  const sameDay = new Set(PLAN_SLOTS.filter((s) => s !== slot).map((s) => day.meals[s]))

  const ranked = eligibleRecipes(profile, slotKind(slot), prefs)
    .filter((r) => r.id !== current && !sameDay.has(r.id))
    .map((r) => {
      const totals = new Map(baseTotals)
      for (const { id, grams } of r.ingredients) totals.set(id, (totals.get(id) ?? 0) + grams)
      const repeats = otherIds.filter((x) => x === r.id).length
      return { r, score: costOf(totals) - baseCost + repeats * 250 + random() * 150 }
    })
    .sort((a, b) => a.score - b.score)
  if (!ranked.length) return null

  return {
    ...plan,
    days: plan.days.map((d) =>
      d.date === date ? { ...d, meals: { ...d.meals, [slot]: ranked[0]!.r.id } } : d
    ),
  }
}
