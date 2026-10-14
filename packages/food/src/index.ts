export type {
  FoodRecord,
  FoodItem,
  ItemNutrients,
  Nutrients,
  NutrientKey,
  FoodSource,
} from './types'
export { NUTRIENT_KEYS } from './types'
export {
  computeNutrients,
  scaleNutrients,
  roundForDisplay,
  kcalFromMacros,
  assessQuality,
  EMPTY_NUTRIENTS,
} from './nutrients'
export { allergensFromOffTags } from './allergens'
export {
  fetchOffProduct,
  searchOff,
  normalizeOffProduct,
  isValidBarcode,
  escapeLucene,
} from './off'
export { searchUsda, fetchUsdaFood, normalizeUsdaFood, isUsdaConfigured } from './usda'
export { estimatePortion } from './portions'
export type { PortionUnit, PortionEstimate } from './portions'
export { searchFood, lookupBarcode, rankFood } from './search'
export type { FoodCache, SearchResult, SearchSources, ExternalGuards } from './search'
export {
  RateLimitedError,
  UserRateLimitedError,
  createKeyedRateLimiter,
  createTtlSet,
} from './rateLimit'
export {
  MEAL_SLOTS,
  MEAL_SOURCES,
  MAX_MEAL_ITEMS,
  MAX_ITEM_GRAMS,
  mealSlotAt,
  proposeMealLog,
  buildMealLog,
  withoutNutrients,
  proposalWithoutNutrients,
} from './meal'
export type {
  MealSlot,
  MealSource,
  ParsedMealItem,
  ProposedItem,
  MealLogProposal,
  LoggedItem,
  MealLogRecord,
} from './meal'
export * from './planning'
