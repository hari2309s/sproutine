import type { createServerClient } from './client'

type Db = ReturnType<typeof createServerClient>

export interface HabitRow {
  id: string
  title: string
  period: 'daily' | 'weekly'
  /** Check-in dates (YYYY-MM-DD), newest first, enough for streaks. */
  checkins: string[]
}

/** Most active habits one person may have. */
export const MAX_HABITS = 8

export async function listHabits(db: Db, userId: string): Promise<HabitRow[]> {
  const { data: habits, error } = await db
    .from('goals_habits')
    .select('id, title, period')
    .eq('user_id', userId)
    .is('archived_at', null)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`goals_habits.list: ${error.message}`)
  if (!habits?.length) return []
  // ~a year of daily check-ins is plenty for streaks and milestones.
  const { data: checkins, error: cErr } = await db
    .from('habit_checkins')
    .select('habit_id, date')
    .eq('user_id', userId)
    .in(
      'habit_id',
      habits.map((h) => h.id)
    )
    .order('date', { ascending: false })
    .limit(400 * habits.length)
  if (cErr) throw new Error(`habit_checkins.list: ${cErr.message}`)
  return habits.map((h) => ({
    id: h.id as string,
    title: h.title as string,
    period: h.period as HabitRow['period'],
    checkins: (checkins ?? []).filter((c) => c.habit_id === h.id).map((c) => c.date as string),
  }))
}

export async function createHabit(
  db: Db,
  userId: string,
  habit: { title: string; period: HabitRow['period'] }
): Promise<string> {
  const { data, error } = await db
    .from('goals_habits')
    .insert({ user_id: userId, title: habit.title, period: habit.period })
    .select('id')
    .single()
  if (error) throw new Error(`goals_habits.insert: ${error.message}`)
  return data.id as string
}

/** Archives a habit (check-ins are kept). False if it isn't this person's. */
export async function archiveHabit(db: Db, userId: string, habitId: string): Promise<boolean> {
  const { data, error } = await db
    .from('goals_habits')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', habitId)
    .eq('user_id', userId)
    .is('archived_at', null)
    .select('id')
  if (error) throw new Error(`goals_habits.archive: ${error.message}`)
  return !!data?.length
}

/**
 * Checks a habit in for a date, or undoes it if already checked. Returns the
 * new state, or null if the habit isn't this person's active habit.
 */
export async function toggleCheckin(
  db: Db,
  userId: string,
  habitId: string,
  date: string
): Promise<{ checked: boolean } | null> {
  const { data: habit } = await db
    .from('goals_habits')
    .select('id')
    .eq('id', habitId)
    .eq('user_id', userId)
    .is('archived_at', null)
    .maybeSingle()
  if (!habit) return null
  const { data: removed, error: delErr } = await db
    .from('habit_checkins')
    .delete()
    .eq('habit_id', habitId)
    .eq('user_id', userId)
    .eq('date', date)
    .select('id')
  if (delErr) throw new Error(`habit_checkins.delete: ${delErr.message}`)
  if (removed?.length) return { checked: false }
  const { error } = await db
    .from('habit_checkins')
    .insert({ habit_id: habitId, user_id: userId, date })
  // A concurrent check-in for the same day already did the job.
  if (error && error.code !== '23505') throw new Error(`habit_checkins.insert: ${error.message}`)
  return { checked: true }
}

/**
 * Writes a proactive message to chat. The unique (user_id, nudge_key) index
 * makes this idempotent: true if it was new, false if already sent.
 */
export async function writeNudge(
  db: Db,
  userId: string,
  nudge: { key: string; text: string }
): Promise<boolean> {
  const { error } = await db.from('chat_messages').insert({
    user_id: userId,
    role: 'assistant',
    content: nudge.text,
    is_proactive: true,
    nudge_key: nudge.key,
  })
  if (!error) return true
  if (error.code === '23505') return false
  throw new Error(`chat_messages.nudge: ${error.message}`)
}
