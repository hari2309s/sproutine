import type { TransactionCategory } from '@truffle/types'

export const CATEGORY_EMOJI: Record<TransactionCategory, string> = {
  food_groceries: '🛒',
  food_delivery: '🍕',
  transport: '🚇',
  housing: '🏠',
  utilities: '💡',
  subscriptions: '📱',
  health: '💊',
  entertainment: '🎬',
  shopping: '🛍️',
  income: '💰',
  savings: '🏦',
  other: '📦',
}

/** Converts snake_case category keys to Title Case display labels. */
export function formatCategory(cat: string): string {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
