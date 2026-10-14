import { describe, it, expect } from 'vitest'
import { INGREDIENTS } from '../ingredients'
import { fitsDiet, recipeAllergens, RECIPES, RECIPES_BY_ID } from '../recipes'
import { buildShoppingList } from '../shopping'
import {
  eligibleRecipes,
  generatePlan,
  isSafePlan,
  validatePlan,
  weekStartOf,
  swapMeal,
  type PlanProfile,
} from '../planner'
import { GOLDEN_PROFILES } from '../golden-profiles'

const omni: PlanProfile = { diet: 'omnivore', allergies: [], dislikes: [], budgetWeeklyCents: null }
const WEEK = '2026-10-19'

describe('seed data', () => {
  it('has about 60 recipes with unique ids and known ingredients', () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(60)
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(RECIPES.length)
    for (const recipe of RECIPES) {
      expect(recipe.ingredients.length, recipe.id).toBeGreaterThan(0)
      for (const { id, grams } of recipe.ingredients) {
        expect(INGREDIENTS[id], `${recipe.id} → ${id}`).toBeDefined()
        expect(grams).toBeGreaterThan(0)
      }
    }
  })

  it('prices every bought ingredient by a real pack', () => {
    for (const ing of Object.values(INGREDIENTS)) {
      if (ing.pantry) continue
      expect(ing.pack.grams, ing.id).toBeGreaterThan(0)
      expect(ing.pack.cents, ing.id).toBeGreaterThan(0)
    }
  })

  it('derives allergens from ingredients, including hidden ones', () => {
    // Grana Padano carries egg lysozyme; soy sauce carries wheat.
    expect(recipeAllergens(RECIPES_BY_ID['spinach-pasta']!).sort()).toEqual([
      'eggs',
      'gluten',
      'milk',
    ])
    expect(recipeAllergens(RECIPES_BY_ID['tofu-stir-fry']!).sort()).toEqual(['gluten', 'soybeans'])
    expect(recipeAllergens(RECIPES_BY_ID['lentil-soup']!)).toContain('celery')
  })

  it('derives diet fit from ingredients', () => {
    expect(fitsDiet(RECIPES_BY_ID['quark-berries']!, 'vegetarian')).toBe(true)
    expect(fitsDiet(RECIPES_BY_ID['quark-berries']!, 'vegan')).toBe(false)
    expect(fitsDiet(RECIPES_BY_ID['tuna-pasta']!, 'pescatarian')).toBe(true)
    expect(fitsDiet(RECIPES_BY_ID['tuna-pasta']!, 'vegetarian')).toBe(false)
    expect(fitsDiet(RECIPES_BY_ID['spaghetti-bolognese']!, 'pescatarian')).toBe(false)
  })
})

describe('buildShoppingList', () => {
  it('sums servings, rounds up to packs and leaves pantry uncosted', () => {
    const list = buildShoppingList([
      'spaghetti-bolognese',
      'spaghetti-bolognese',
      'lentil-bolognese',
    ])
    const pasta = list.items.find((i) => i.ingredientId === 'pasta')!
    expect(pasta.grams).toBe(375)
    expect(pasta.packs).toBe(1)
    const tomatoes = list.items.find((i) => i.ingredientId === 'chopped-tomatoes')!
    expect(tomatoes.packs).toBe(2)
    expect(list.pantry.map((p) => p.ingredientId)).toEqual(['olive-oil'])
    expect(list.totalCents).toBe(list.items.reduce((s, i) => s + i.cents, 0))
  })
})

describe('generatePlan', () => {
  it('fills every slot of the week and is reproducible from its seed', () => {
    const a = generatePlan(omni, { weekStart: WEEK, seed: 3 })
    const b = generatePlan(omni, { weekStart: WEEK, seed: 3 })
    expect(a.plan).toEqual(b.plan)
    expect(a.plan.days.map((d) => d.date)).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ])
    expect(a.plan.days.every((d) => d.meals.breakfast && d.meals.lunch && d.meals.dinner)).toBe(
      true
    )
    expect(a.issues).toEqual([])
  })

  it('leaves days before fromDate empty, for a week already under way', () => {
    const { plan, shopping } = generatePlan(omni, { weekStart: WEEK, fromDate: '2026-10-21' })
    expect(plan.days.slice(0, 2).every((d) => Object.keys(d.meals).length === 0)).toBe(true)
    expect(
      plan.days.slice(2).every((d) => d.meals.breakfast && d.meals.lunch && d.meals.dinner)
    ).toBe(true)
    const full = generatePlan(omni, { weekStart: WEEK }).shopping.totalCents
    expect(shopping.totalCents).toBeLessThan(full)
  })

  it('varies with the seed', () => {
    const seeds = [1, 2, 3, 4, 5].map((seed) =>
      JSON.stringify(generatePlan(omni, { weekStart: WEEK, seed }).plan)
    )
    expect(new Set(seeds).size).toBeGreaterThan(1)
  })

  it('never repeats a dish within a day', () => {
    for (const seed of [1, 2, 3]) {
      for (const d of generatePlan(omni, { weekStart: WEEK, seed }).plan.days) {
        const ids = Object.values(d.meals)
        expect(new Set(ids).size).toBe(ids.length)
      }
    }
  })

  it('honours dislikes, preferences and a time limit', () => {
    const { plan } = generatePlan(
      { ...omni, dislikes: ['pasta'] },
      { weekStart: WEEK, prefs: { maxMinutes: 25, prefer: ['curry'] } }
    )
    const mains = plan.days
      .flatMap((d) => [d.meals.lunch, d.meals.dinner])
      .map((id) => RECIPES_BY_ID[id!]!)
    expect(mains.every((r) => r.minutes <= 25)).toBe(true)
    expect(mains.some((r) => /curry/i.test(r.name))).toBe(true)
    expect(validatePlan(plan, { ...omni, dislikes: ['pasta'] }).dislikeHits).toEqual([])
  })

  it('reports slots nothing fits instead of breaking a rule', () => {
    const impossible: PlanProfile = {
      diet: 'vegan',
      allergies: ['gluten', 'soybeans', 'nuts', 'peanuts', 'sesame', 'celery', 'sulphites'],
      dislikes: ['rice', 'potato', 'sweet potato', 'apple', 'banana', 'coconut', 'sunflower'],
      budgetWeeklyCents: null,
    }
    const { plan, issues } = generatePlan(impossible, { weekStart: WEEK })
    expect(isSafePlan(validatePlan(plan, impossible))).toBe(true)
    expect(issues.some((i) => i.kind === 'no-recipe')).toBe(true)
  })

  it('cuts cost to meet a tight budget', () => {
    const free = generatePlan(omni, { weekStart: WEEK, seed: 1 }).shopping.totalCents
    const tight = generatePlan({ ...omni, budgetWeeklyCents: 2800 }, { weekStart: WEEK, seed: 1 })
    expect(tight.shopping.totalCents).toBeLessThan(free)
    expect(tight.shopping.totalCents).toBeLessThanOrEqual(2800 * 1.1)
  })
})

describe('validatePlan', () => {
  it('flags allergens, diet breaks and unknown recipes in a plan sent back by a client', () => {
    const plan = {
      weekStart: WEEK,
      days: [
        {
          date: WEEK,
          meals: { breakfast: 'quark-berries', lunch: 'tuna-pasta', dinner: 'made-up' },
        },
      ],
    }
    const check = validatePlan(plan, { ...omni, diet: 'vegan', allergies: ['gluten'] })
    expect(check.unknown).toEqual(['made-up'])
    expect(check.dietViolations.sort()).toEqual(['quark-berries', 'tuna-pasta'])
    expect(check.allergenHits).toEqual([{ recipeId: 'tuna-pasta', allergens: ['gluten'] }])
    expect(isSafePlan(check)).toBe(false)
  })
})

describe('swapMeal', () => {
  it('replaces one meal with a different safe recipe and leaves the rest', () => {
    const profile: PlanProfile = { ...omni, diet: 'vegan', allergies: ['gluten'] }
    const { plan } = generatePlan(profile, { weekStart: WEEK, seed: 2 })
    const before = plan.days[2]!.meals.dinner
    const after = swapMeal(plan, profile, { date: plan.days[2]!.date, slot: 'dinner', seed: 9 })!
    expect(after.days[2]!.meals.dinner).not.toBe(before)
    expect(after.days[2]!.meals.dinner).not.toBe(after.days[2]!.meals.lunch)
    expect(after.days.filter((_, i) => i !== 2)).toEqual(plan.days.filter((_, i) => i !== 2))
    expect(isSafePlan(validatePlan(after, profile))).toBe(true)
  })

  it('returns null for an unknown day', () => {
    const { plan } = generatePlan(omni, { weekStart: WEEK })
    expect(swapMeal(plan, omni, { date: '2030-01-01', slot: 'lunch' })).toBeNull()
  })
})

describe('weekStartOf', () => {
  it('returns the Monday of the week', () => {
    expect(weekStartOf(new Date(2026, 9, 14))).toBe('2026-10-12')
    expect(weekStartOf(new Date(2026, 9, 18))).toBe('2026-10-12')
    expect(weekStartOf(new Date(2026, 9, 19))).toBe('2026-10-19')
  })
})

// Phase 3 exit: every plan passes the allergen and diet validators, and at
// least 95 % come in within budget tolerance. Several seeds per profile, so
// a pass isn't luck.
describe('planning-golden', () => {
  const runs = GOLDEN_PROFILES.flatMap((profile) =>
    [1, 2, 3].map((seed) => ({
      profile,
      seed,
      ...generatePlan(profile, { weekStart: WEEK, seed }),
    }))
  )

  it('has 30 profiles', () => {
    expect(GOLDEN_PROFILES).toHaveLength(30)
  })

  it('every plan is safe for its profile', () => {
    for (const { profile, seed, plan } of runs) {
      expect(isSafePlan(validatePlan(plan, profile)), `${profile.id} seed ${seed}`).toBe(true)
    }
  })

  it('every profile gets a full week', () => {
    for (const { profile, seed, issues } of runs) {
      expect(
        issues.filter((i) => i.kind === 'no-recipe'),
        `${profile.id} seed ${seed}`
      ).toEqual([])
      expect(eligibleRecipes(profile, 'breakfast').length, profile.id).toBeGreaterThan(0)
    }
  })

  it('at least 95 % of plans are within budget tolerance', () => {
    const within = runs.filter(({ plan, profile }) => validatePlan(plan, profile).withinBudget)
    expect(within.length / runs.length).toBeGreaterThanOrEqual(0.95)
  })
})
