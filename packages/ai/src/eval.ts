import { createClient } from '@supabase/supabase-js'
import type { Provider, EvalLogEntry } from './types'

function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not set')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function logEval(entry: EvalLogEntry): Promise<void> {
  const db = getDb()
  await db.from('eval_logs').insert({
    provider: entry.provider,
    task: entry.task,
    input: entry.input,
    output: entry.output,
    latency_ms: entry.latencyMs,
    tokens_used: entry.tokensUsed,
    trace_id: entry.traceId ?? null,
  })
}

export async function incrementUsage(provider: Provider): Promise<void> {
  const today = new Date().toISOString().split('T')[0]!
  const db = getDb()
  await db.rpc('increment_llm_usage', { p_date: today, p_provider: provider })
}

export async function getGlobalUsage(): Promise<Record<string, number>> {
  const today = new Date().toISOString().split('T')[0]!
  const db = getDb()
  const { data } = await db.from('daily_llm_usage').select('*').eq('date', today).single()
  return (data as Record<string, number> | null) ?? {}
}
