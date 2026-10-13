/**
 * Helpers for savings habit period keys and streak computation.
 * Period key format:
 *   monthly → 'YYYY-MM'
 *   weekly  → 'YYYY-WNN' (ISO week number, zero-padded to 2 digits)
 */

import { formatYearMonth } from './date'

export function getCurrentPeriod(frequency: 'weekly' | 'monthly', date = new Date()): string {
  if (frequency === 'monthly') {
    return date.toISOString().slice(0, 7) // 'YYYY-MM'
  }
  // ISO week: Monday-based, week 1 = week containing first Thursday of year
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayOfWeek = d.getUTCDay() || 7 // treat Sunday as 7
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek) // nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

export function previousPeriod(frequency: 'weekly' | 'monthly', current: string): string {
  if (frequency === 'monthly') {
    const parts = current.split('-')
    const year = Number(parts[0])
    const month = Number(parts[1])
    const prev = new Date(year, month - 2, 1) // month-1 is 0-indexed, so month-2 goes back one
    return formatYearMonth(prev.getFullYear(), prev.getMonth() + 1)
  }
  // weekly: parse YYYY-WNN, subtract 7 days from a date in that week
  const wparts = current.split('-W')
  const year = Number(wparts[0])
  const week = Number(wparts[1])
  // Find a date in that ISO week (simple approximation: Jan 4 + 7*(week-1) days)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() || 7
  const mondayOfWeek1 = new Date(jan4.getTime() - (dayOfWeek - 1) * 86400000)
  const mondayOfTargetWeek = new Date(mondayOfWeek1.getTime() + (week - 1) * 7 * 86400000)
  const prevMonday = new Date(mondayOfTargetWeek.getTime() - 7 * 86400000)
  return getCurrentPeriod('weekly', prevMonday)
}

/**
 * Compute streak: number of consecutive periods (including current if logged)
 * going back from the most recent logged period.
 */
export function computeStreak(frequency: 'weekly' | 'monthly', loggedPeriods: string[]): number {
  if (loggedPeriods.length === 0) return 0
  const sorted = [...loggedPeriods].sort().reverse() // most recent first
  const current = getCurrentPeriod(frequency)
  // Start from current period if logged, otherwise from last logged
  let check: string = sorted[0] === current ? current : sorted[0]!
  let streak = 0
  const periodSet = new Set(loggedPeriods)
  while (periodSet.has(check)) {
    streak++
    check = previousPeriod(frequency, check)
  }
  return streak
}
