import type { createServerClient } from './client'

type Db = ReturnType<typeof createServerClient>

/** Generates a URL-safe random token. */
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Returns the existing iCal feed token for a user, or creates one if none exists.
 */
export async function getOrCreateFeedToken(
  db: Db,
  userId: string
): Promise<{ token: string }> {
  // Try to fetch existing token first
  const { data: existing, error: fetchError } = await db
    .from('calendar_feed_tokens')
    .select('token')
    .eq('user_id', userId)
    .maybeSingle()
  if (fetchError) throw new Error(`calendarFeed.getOrCreateFeedToken: ${fetchError.message}`)
  if (existing) return { token: (existing as { token: string }).token }

  // No token exists — insert a new one
  const token = generateToken()
  const { data, error } = await db
    .from('calendar_feed_tokens')
    .insert({ user_id: userId, token })
    .select('token')
    .single()
  if (error) {
    // Handle race condition: another request may have inserted between our select and insert
    if (error.code === '23505') {
      const { data: retry, error: retryError } = await db
        .from('calendar_feed_tokens')
        .select('token')
        .eq('user_id', userId)
        .single()
      if (retryError) throw new Error(`calendarFeed.getOrCreateFeedToken (retry): ${retryError.message}`)
      return { token: (retry as { token: string }).token }
    }
    throw new Error(`calendarFeed.getOrCreateFeedToken: ${error.message}`)
  }
  return { token: (data as { token: string }).token }
}

/**
 * Deletes the old feed token and creates a new one.
 * Useful when a user wants to invalidate existing shared links.
 */
export async function resetFeedToken(
  db: Db,
  userId: string
): Promise<{ token: string }> {
  await db.from('calendar_feed_tokens').delete().eq('user_id', userId)
  const token = generateToken()
  const { data, error } = await db
    .from('calendar_feed_tokens')
    .insert({ user_id: userId, token })
    .select('token')
    .single()
  if (error) throw new Error(`calendarFeed.resetFeedToken: ${error.message}`)
  return { token: (data as { token: string }).token }
}

/**
 * Revokes the feed token entirely so the public feed endpoint stops working.
 */
export async function revokeFeedToken(
  db: Db,
  userId: string
): Promise<void> {
  const { error } = await db
    .from('calendar_feed_tokens')
    .delete()
    .eq('user_id', userId)
  if (error) throw new Error(`calendarFeed.revokeFeedToken: ${error.message}`)
}

/**
 * Looks up a user by their public feed token.
 * Intended for the public iCal feed endpoint — uses the service role client
 * which bypasses RLS.
 */
export async function getUserByFeedToken(
  db: Db,
  token: string
): Promise<{ userId: string; timezone: string } | null> {
  const { data, error } = await db
    .from('calendar_feed_tokens')
    .select('user_id')
    .eq('token', token)
    .maybeSingle()
  if (error) throw new Error(`calendarFeed.getUserByFeedToken: ${error.message}`)
  if (!data) return null

  const userId = (data as { user_id: string }).user_id

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('timezone')
    .eq('user_id', userId)
    .maybeSingle()
  if (profileError) throw new Error(`calendarFeed.getUserByFeedToken (profile): ${profileError.message}`)

  return {
    userId,
    timezone: (profile as { timezone: string | null } | null)?.timezone || 'Europe/Berlin',
  }
}
