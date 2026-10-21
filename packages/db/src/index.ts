export { createServerClient } from './client'
export { getProfile, rowToProfile } from './profile'
export type { Database } from './schema'
export { createFoodCache, rowToFood } from './foodCache'
export { getFoodsByKeys, insertMealLog, foodKey } from './mealLogs'
export type { FoodKey } from './mealLogs'
export { loadRecentMessages, saveMessage } from './chatMessages'
export type { StoredMessage } from './chatMessages'
export {
  getActivePlan,
  saveActivePlan,
  updatePlanMeals,
  getPlanById,
  PlanConflictError,
} from './mealPlans'
export type { StoredPlan } from './mealPlans'
export {
  listHabits,
  createHabit,
  archiveHabit,
  toggleCheckin,
  writeNudge,
  MAX_HABITS,
} from './habits'
export type { HabitRow } from './habits'
export {
  savePushSubscription,
  deletePushSubscription,
  dropPushEndpoint,
  listPushSubscriptions,
  markPushed,
} from './push'
export type { PushSubscriptionRow } from './push'
export { getTodayWater, addWater, removeWater } from './waterLogs'
export type { WaterEntry } from './waterLogs'
export { setFavourite, getFavourites, getYesterdayMeals } from './favourites'
export type { FavouriteMeal } from './favourites'
export { getStreak } from './streaks'
export type { StreakInfo } from './streaks'
export { getWeightLogs, addWeightLog, deleteWeightLog, DuplicateWeightDateError } from './weightLogs'
export type { WeightEntry } from './weightLogs'
export { getWeeklyStats } from './weeklyStats'
export type { WeeklyStats } from './weeklyStats'
export { midnightInTz } from './tzHelpers'
export {
  getEntitlement,
  entitlementFromRow,
  getStripeCustomerId,
  saveStripeCustomerId,
  saveStripeSubscription,
  getUserIdByStripeCustomer,
} from './billing'
export type { Entitlement, Plan, StripeSubscriptionState, SubscriptionRow } from './billing'
export { getMonthSummary, getDayDetail } from './calendarSummary'
export type { DaySummary, DayDetail } from './calendarSummary'
export {
  getOrCreateFeedToken,
  resetFeedToken,
  revokeFeedToken,
  getUserByFeedToken,
} from './calendarFeed'
export { getOnThisDayMeal, recordDismissal } from './onThisDay'
export type { OnThisDayMeal } from './onThisDay'
