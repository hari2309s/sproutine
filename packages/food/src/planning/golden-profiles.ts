import type { PlanProfile } from './planner'

/**
 * "planning-golden" (dev plan, Phase 3): 30 profiles covering diets, allergy
 * combinations, dislikes and budgets. Budgets are what a person might
 * plausibly enter for one person's breakfasts, lunches and dinners shopping
 * at a discounter, not numbers tuned to the planner.
 */
export const GOLDEN_PROFILES: (PlanProfile & { id: string })[] = [
  p('omni-01', 'omnivore', [], [], null),
  p('omni-02', 'omnivore', [], [], 4000),
  p('omni-03', 'omnivore', [], [], 3000),
  p('omni-04', 'omnivore', ['gluten'], [], 4000),
  p('omni-05', 'omnivore', ['milk'], [], 3500),
  p('omni-06', 'omnivore', ['eggs'], [], 3500),
  p('omni-07', 'omnivore', ['fish'], [], 3500),
  p('omni-08', 'omnivore', ['nuts', 'peanuts'], [], 3500),
  p('omni-09', 'omnivore', ['sesame', 'mustard', 'celery'], [], 4000),
  p('omni-10', 'omnivore', ['gluten', 'milk'], [], 4500),
  p('omni-11', 'omnivore', [], ['mushroom', 'feta'], 3500),
  p('pesc-01', 'pescatarian', [], [], 4000),
  p('pesc-02', 'pescatarian', ['gluten'], [], 4500),
  p('pesc-03', 'pescatarian', ['milk', 'eggs'], [], 4500),
  p('veg-01', 'vegetarian', [], [], 3500),
  p('veg-02', 'vegetarian', [], [], 3000),
  p('veg-03', 'vegetarian', ['gluten'], [], 4000),
  p('veg-04', 'vegetarian', ['eggs'], [], 3500),
  p('veg-05', 'vegetarian', ['milk'], [], 4000),
  p('veg-06', 'vegetarian', ['nuts', 'peanuts', 'sesame'], [], 3500),
  p('veg-07', 'vegetarian', ['gluten', 'milk', 'eggs'], [], 4500),
  p('veg-08', 'vegetarian', [], ['cabbage', 'lentils'], 4000),
  p('vegan-01', 'vegan', [], [], 3500),
  p('vegan-02', 'vegan', [], [], 3000),
  p('vegan-03', 'vegan', ['gluten'], [], 4000),
  p('vegan-04', 'vegan', ['soybeans'], [], 3500),
  p('vegan-05', 'vegan', ['peanuts', 'nuts'], [], 3500),
  p('vegan-06', 'vegan', ['gluten', 'soybeans'], [], 4500),
  p('vegan-07', 'vegan', ['sesame', 'celery'], [], 3500),
  p('vegan-08', 'vegan', [], ['chickpeas', 'coconut'], 4000),
]

function p(
  id: string,
  diet: PlanProfile['diet'],
  allergies: PlanProfile['allergies'],
  dislikes: string[],
  budgetWeeklyCents: number | null
): PlanProfile & { id: string } {
  return { id, diet, allergies, dislikes, budgetWeeklyCents }
}
