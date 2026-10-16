import type { createServerClient } from './client'
import { midnightInTz } from './tzHelpers'

type Db = ReturnType<typeof createServerClient>

export interface WaterEntry {
  id: string
  ml: number
  loggedAt: string
}

/**
 * Returns today's water entries for a user (all entries since midnight in their timezone).
 */
export async function getTodayWater(
  db: Db,
  userId: string,
  timezone: string
): Promise<WaterEntry[]> {
  // Compute start of today in the user's timezone
  const sinceIso = midnightInTz(new Date(), timezone)

  const { data, error } = await db
    .from('water_logs')
    .select('id, ml, logged_at')
    .eq('user_id', userId)
    .gte('logged_at', sinceIso)
    .order('logged_at', { ascending: true })
  if (error) throw new Error(`water_logs.getTodayWater: ${error.message}`)
  return ((data ?? []) as { id: string; ml: number; logged_at: string }[]).map((r) => ({
    id: r.id,
    ml: r.ml,
    loggedAt: r.logged_at,
  }))
}

export async function addWater(
  db: Db,
  userId: string,
  ml: number
): Promise<WaterEntry> {
  const { data, error } = await db
    .from('water_logs')
    .insert({ user_id: userId, ml })
    .select('id, ml, logged_at')
    .single()
  if (error) throw new Error(`water_logs.addWater: ${error.message}`)
  const r = data as { id: string; ml: number; logged_at: string }
  return { id: r.id, ml: r.ml, loggedAt: r.logged_at }
}

export async function removeWater(
  db: Db,
  userId: string,
  entryId: string
): Promise<boolean> {
  const { data, error } = await db
    .from('water_logs')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId)
    .select('id')
  if (error) throw new Error(`water_logs.removeWater: ${error.message}`)
  return (data?.length ?? 0) > 0
}
