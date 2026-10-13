import { createClient } from '@supabase/supabase-js'
import type { Provider, EvalLogEntry } from './types'

function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Supabase env vars not set')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// Operational metrics only. Prompt and reply text is deliberately not stored
// here: it can contain health data with no link to a user, so it couldn't be
// erased on account deletion. Content lives in Langfuse, keyed by pseudonym.
export async function logEval(entry: EvalLogEntry): Promise<void> {
  const { error } = await getDb().from('eval_logs').insert({
    provider: entry.provider,
    task: entry.task,
    latency_ms: entry.latencyMs,
    tokens_used: entry.tokensUsed,
    trace_id: entry.traceId ?? null,
  })
  if (error) throw new Error(`logEval: ${error.message}`)
}

export async function incrementUsage(provider: Provider): Promise<void> {
  const today = new Date().toISOString().split('T')[0]!
  const { error } = await getDb().rpc('increment_llm_usage', { p_date: today, p_provider: provider })
  // Thrown so callers' .catch logs it — a silently failing counter would
  // leave the daily budget at 0 and the router would never fall back.
  if (error) throw new Error(`incrementUsage: ${error.message}`)
}

export async function getGlobalUsage(): Promise<Record<string, number>> {
  const today = new Date().toISOString().split('T')[0]!
  const { data, error } = await getDb()
    .from('daily_llm_usage')
    .select('*')
    .eq('date', today)
    .maybeSingle()
  if (error) throw new Error(`getGlobalUsage: ${error.message}`)
  return (data as Record<string, number> | null) ?? {}
}

/**
 * Per-user daily quota (supabase/migrations/*_user_usage.sql). Returns false
 * once the user is over `limit` for today. Fails open if the check itself
 * errors, so a database blip doesn't lock everyone out of the app.
 */
export async function consumeUserQuota(
  userId: string,
  kind: 'chat' | 'voice',
  limit: number
): Promise<boolean> {
  const { data, error } = await getDb().rpc('consume_user_quota', {
    p_user: userId,
    p_kind: kind,
    p_limit: limit,
  })
  if (error) {
    console.error('[consumeUserQuota]', error.message)
    return true
  }
  return data === true
}
