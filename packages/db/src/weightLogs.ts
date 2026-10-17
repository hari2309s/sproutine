import type { createServerClient } from './client'
import { midnightInTz } from './tzHelpers'

type Db = ReturnType<typeof createServerClient>

export interface WeightEntry {
  id: string
  weightKg: number
  loggedAt: string
  createdAt: string
}

/** Thrown when a weight log already exists for the given user+date. */
export class DuplicateWeightDateError extends Error {
  constructor(date: string) {
    super(`A weight entry for ${date} already exists`)
    this.name = 'DuplicateWeightDateError'
  }
}

type WeightRow = {
  id: string
  weight_kg: number
  logged_at: string
  created_at: string
}

function rowToEntry(r: WeightRow): WeightEntry {
  return {
    id: r.id,
    weightKg: r.weight_kg,
    loggedAt: r.logged_at,
    createdAt: r.created_at,
  }
}

/**
 * Returns weight log entries for a user, optionally limited to the last N days,
 * ordered by logged_at descending.
 *
 * `logged_at` is a `date` column in Postgres, so a plain YYYY-MM-DD string
 * comparison is correct — no timezone conversion needed.
 */
export async function getWeightLogs(
  db: Db,
  userId: string,
  days?: number
): Promise<WeightEntry[]> {
  let query = db
    .from('weight_logs')
    .select('id, weight_kg, logged_at, created_at')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })

  if (days !== undefined) {
    // Subtract N days from today in UTC and compare as a plain date string.
    // Because logged_at is a `date` column (no time component), this is correct.
    const since = new Date()
    since.setUTCDate(since.getUTCDate() - days)
    const sinceStr = since.toISOString().slice(0, 10)
    query = query.gte('logged_at', sinceStr)
  }

  const { data, error } = await query
  if (error) throw new Error(`weightLogs.getWeightLogs: ${error.message}`)
  return ((data ?? []) as WeightRow[]).map(rowToEntry)
}

/**
 * Inserts a new weight log entry and returns it.
 * `tz` is the user's IANA timezone (e.g. "Europe/Berlin") and is used to
 * determine "today" when loggedAt is omitted — prevents date-skew for users
 * in UTC+ zones who log near midnight.
 * Throws a DuplicateWeightDateError if an entry already exists for that date.
 * Throws if loggedAt is not a valid YYYY-MM-DD date or is more than 2 days in
 * the future (extra day of headroom for non-UTC timezones).
 */
export async function addWeightLog(
  db: Db,
  userId: string,
  weightKg: number,
  loggedAt?: string,
  tz = 'UTC'
): Promise<WeightEntry | null> {
  let date: string
  if (loggedAt !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(loggedAt)) {
      throw new Error(
        `weightLogs.addWeightLog: invalid loggedAt format "${loggedAt}" (expected YYYY-MM-DD)`
      )
    }
    const parsed = new Date(`${loggedAt}T00:00:00Z`)
    if (isNaN(parsed.getTime())) {
      throw new Error(`weightLogs.addWeightLog: invalid loggedAt value "${loggedAt}"`)
    }
    // Allow up to 2 days ahead to accommodate users in UTC+ zones where
    // "today" locally is already "tomorrow" in UTC.
    const dayAfterTomorrow = new Date()
    dayAfterTomorrow.setUTCDate(dayAfterTomorrow.getUTCDate() + 2)
    if (parsed > dayAfterTomorrow) {
      throw new Error(
        `weightLogs.addWeightLog: loggedAt "${loggedAt}" is too far in the future`
      )
    }
    date = loggedAt
  } else {
    // Use the user's local date so a user in UTC+9 at 11pm doesn't get
    // tomorrow's UTC date recorded against today's entry.
    date = midnightInTz(new Date(), tz).slice(0, 10)
  }

  const { data, error } = await db
    .from('weight_logs')
    .insert({ user_id: userId, weight_kg: weightKg, logged_at: date })
    .select('id, weight_kg, logged_at, created_at')
    .single()

  if (error) {
    // Postgres unique-violation error code
    if ((error as { code?: string }).code === '23505') {
      throw new DuplicateWeightDateError(date)
    }
    throw new Error(`weightLogs.addWeightLog: ${error.message}`)
  }
  if (!data) return null
  return rowToEntry(data as WeightRow)
}

/**
 * Deletes a weight log entry by id (scoped to the user).
 * Returns true if a row was deleted.
 */
export async function deleteWeightLog(
  db: Db,
  userId: string,
  id: string
): Promise<boolean> {
  const { data, error } = await db
    .from('weight_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')

  if (error) throw new Error(`weightLogs.deleteWeightLog: ${error.message}`)
  return (data?.length ?? 0) > 0
}
