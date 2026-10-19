// Meal constants with no dependencies, safe to import in the browser.

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const
export type MealSlot = (typeof MEAL_SLOTS)[number]

export const MEAL_SOURCES = ['text', 'voice', 'photo', 'barcode', 'copy', 'search'] as const
export type MealSource = (typeof MEAL_SOURCES)[number]

/** Most items one log may hold; keeps external lookups and payloads bounded. */
export const MAX_MEAL_ITEMS = 8
/** Upper bound for one item's grams: a large plate is ~700 g, a litre drink 1000. */
export const MAX_ITEM_GRAMS = 2000

/** The meal slot a log falls into by local time when the user didn't say. */
export function mealSlotAt(date: Date, timeZone = 'Europe/Berlin'): MealSlot {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(date)
  )
  if (hour >= 5 && hour < 11) return 'breakfast'
  if (hour >= 11 && hour < 15) return 'lunch'
  if (hour >= 17 && hour < 22) return 'dinner'
  return 'snack'
}
