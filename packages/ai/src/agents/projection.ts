import type { MonthlySnapshot } from '@truffle/types'

export interface MonthProjection {
  daysInMonth: number
  daysElapsed: number
  daysRemaining: number
  dailySpendRate: number
  projectedBalance: number
}

// Shared by forecaster and affordabilityChecker (both splice these figures into
// their prompt), and by the eval harness (to check the model restates them
// faithfully instead of inventing its own numbers) — one implementation keeps
// all three in sync.
export function computeMonthProjection(
  snapshot: MonthlySnapshot,
  today: Date = new Date()
): MonthProjection {
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const daysElapsed = today.getDate()
  const daysRemaining = daysInMonth - daysElapsed

  const dailySpendRate =
    daysElapsed > 0 && snapshot.totalExpenses < 0
      ? Math.abs(snapshot.totalExpenses) / daysElapsed
      : 0

  const projectedBalance = snapshot.balance - dailySpendRate * daysRemaining

  return { daysInMonth, daysElapsed, daysRemaining, dailySpendRate, projectedBalance }
}
