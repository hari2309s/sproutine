// The browser-safe part of the package: pure maths and constants, none of the
// API clients (which carry rate limiters and server env lookups).
export { computeNutrients, scaleNutrients, roundForDisplay, EMPTY_NUTRIENTS } from './nutrients'
export { MEAL_SLOTS, MEAL_SOURCES, MAX_MEAL_ITEMS, MAX_ITEM_GRAMS, mealSlotAt } from './mealBasics'
export type { MealSlot, MealSource } from './mealBasics'
export type { FoodRecord, Nutrients, NutrientKey } from './types'
export type { MealLogProposal, ProposedItem, LoggedItem } from './meal'
export { portionOptions } from './portionOptions'
export type { PortionOption } from './portionOptions'
export type { PortionUnit } from './portions'
// Planning is pure data and code, safe to render from in the browser.
export * from './planning'
