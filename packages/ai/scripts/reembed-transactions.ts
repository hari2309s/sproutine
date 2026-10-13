/**
 * Re-embed every stored transaction with the current embedding model.
 *
 * Run with: pnpm --filter @truffle/ai reembed
 *
 * Why: `transactions.embedding` vectors are model-specific. Whenever the model in
 * `src/embeddings.ts` changes (e.g. gemini-embedding-001 -> gemini-embedding-2),
 * previously stored vectors live in a different space and `match_transactions`
 * cosine search silently returns irrelevant rows. This backfill rewrites them all.
 * It is idempotent — safe to interrupt and re-run.
 *
 * The embedding column dimensionality (768) is unchanged, so no SQL migration is
 * needed — only the vector values.
 *
 * Requires env vars (use the PROD values — the service-role key bypasses RLS so
 * every user's rows can be updated):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
 *
 * Env resolution order:
 *   1. anything already exported in the shell (wins)
 *   2. the file named by ENV_FILE — absolute, or relative to the repo root
 *   3. .env.local at the repo root
 * e.g.  ENV_FILE=.env.production.local pnpm --filter @truffle/ai reembed
 * (pnpm runs this with cwd=packages/ai, so ENV_FILE is resolved from the repo
 * root, not the current directory.)
 *
 * Tuning knobs (env vars):
 *   DRY_RUN=1              — verify connection + print row count, write nothing
 *   REEMBED_RPM=90         — max embedding requests/minute (free tier caps at 100)
 *   REEMBED_CONCURRENCY=2  — parallel in-flight requests (RPM is the real limiter)
 *   REEMBED_AFTER_ID=<uuid>— skip all rows with id <= this (resume a partial run)
 *
 * On the Gemini free tier the embeddings endpoint is limited to ~100 req/min
 * (and a daily cap), so a full backfill takes ~10+ min. Enabling billing on the
 * API project lifts both limits substantially.
 */

// Load env before importing anything that reads process.env
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { isAbsolute, resolve } from 'path'

const repoRoot = resolve(__dirname, '../../..')
const envFile = process.env.ENV_FILE ?? '.env.local'
const envPath = isAbsolute(envFile) ? envFile : resolve(repoRoot, envFile)
if (!existsSync(envPath)) {
  console.error(`env file not found: ${envPath}`)
  process.exit(1)
}
console.log(`loading env from ${envPath}`)
config({ path: envPath })

import { createClient } from '@supabase/supabase-js'
import type { Transaction } from '@truffle/types'
import { embedTransaction } from '../src/embeddings'

const PAGE_SIZE = 200
const MAX_RETRIES = 3
// Honor a server-supplied `retryDelay` up to this (covers a full per-minute
// window); the blind exponential fallback is capped much lower.
const MAX_SERVER_RETRY_MS = 65_000
const MAX_BACKOFF_MS = 8_000

// Read a positive-integer env var, falling back to `def` on unset / garbage / <1.
function intEnv(name: string, def: number): number {
  const n = Math.floor(Number(process.env[name]))
  return Number.isFinite(n) && n >= 1 ? n : def
}

const CONCURRENCY = intEnv('REEMBED_CONCURRENCY', 2)
const RPM = intEnv('REEMBED_RPM', 90)
const MIN_GAP_MS = 60_000 / RPM

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Global pacing: space out request *starts* so we stay under the RPM cap even
// with multiple workers. Each caller awaits its slot.
let nextSlot = 0
async function rateLimit() {
  const now = Date.now()
  const slot = Math.max(now, nextSlot)
  nextSlot = slot + MIN_GAP_MS
  if (slot > now) await sleep(slot - now)
}

// Config errors (wrong model, wrong dimensionality) are not transient.
function isTransient(e: unknown): boolean {
  const msg = (e as Error).message ?? ''
  if (/expected 768/.test(msg)) return false
  return /429|RESOURCE_EXHAUSTED|rate limit|quota|timeout|ECONN|ETIMEDOUT|\b50[0234]\b/i.test(msg)
}

// A blown *daily* quota (vs. a brief per-minute spike) won't recover during this
// run — grinding through every row is pointless. Count consecutive quota errors
// (across all workers and their retries); once we hit the threshold, set
// `aborted` so in-flight retries bail immediately too. Any success resets it.
const CIRCUIT_BREAK_AFTER = 15
let consecutiveQuotaErrors = 0
let aborted = false
class QuotaExhaustedError extends Error {}

function noteQuotaError(e: unknown) {
  if (!/429|RESOURCE_EXHAUSTED|quota/i.test((e as Error).message ?? '')) return
  if (++consecutiveQuotaErrors >= CIRCUIT_BREAK_AFTER) aborted = true
}

// Pull the server-suggested wait out of a 429 body ("retry in 35.4s" / "retryDelay":"35s").
function retryDelayMs(e: unknown): number | null {
  const msg = (e as Error).message ?? ''
  const m = msg.match(/retry in (\d+(?:\.\d+)?)s/i) ?? msg.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/)
  return m ? Math.ceil(parseFloat(m[1]!) * 1000) + 500 : null
}

function shortErr(e: unknown): string {
  const msg = (e as Error).message ?? String(e)
  const code = msg.match(/"code":\s*(\d+)/)?.[1]
  const reason = msg.match(/"message":\s*"([^"]+)"/)?.[1]
  const result = code || reason ? `${code ?? '?'} ${reason ?? ''}`.trim() : msg.slice(0, 200)
  // Strip newlines so a value can't forge extra log lines (CRLF log injection).
  return result.replace(/[\r\n]/g, ' ')
}

async function embedWithRetry(tx: Transaction): Promise<number[]> {
  for (let attempt = 0; ; attempt++) {
    if (aborted) throw new QuotaExhaustedError('aborted')
    await rateLimit()
    try {
      const v = await embedTransaction(tx)
      consecutiveQuotaErrors = 0
      return v
    } catch (e) {
      noteQuotaError(e)
      if (aborted || attempt >= MAX_RETRIES || !isTransient(e)) throw e
      const server = retryDelayMs(e)
      const wait =
        server != null
          ? Math.min(server, MAX_SERVER_RETRY_MS)
          : Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS)
      await sleep(wait)
    }
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const missing = [
    !url && 'NEXT_PUBLIC_SUPABASE_URL',
    !key && 'SUPABASE_SERVICE_ROLE_KEY',
    !process.env.GEMINI_API_KEY && 'GEMINI_API_KEY',
  ].filter(Boolean)
  if (missing.length) {
    throw new Error(
      `Missing env vars: ${missing.join(', ')}. ` +
        `Check they exist in the loaded env file (Vercel names may differ).`
    )
  }

  const db = createClient(url!, key!)

  const dryRun = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run')
  if (dryRun) {
    const { count, error } = await db
      .from('transactions')
      .select('id', { count: 'exact', head: true })
    if (error) throw error
    console.log(`[dry-run] connected OK. ${count ?? 0} transactions would be re-embedded.`)
    return
  }

  type Row = Record<string, unknown> & { id: string }
  const toTx = (row: Row): Transaction =>
    ({
      id: row.id,
      userId: row.user_id as string,
      amount: Number(row.amount),
      currency: (row.currency as Transaction['currency']) ?? 'EUR',
      description: row.description as string,
      category: (row.category as Transaction['category']) ?? 'other',
      merchant: (row.merchant as string | null) ?? undefined,
      date: row.date as string,
      isRecurring: Boolean(row.is_recurring),
    }) as Transaction

  let pageStart = process.env.REEMBED_AFTER_ID ?? '' // last fully-completed page boundary
  let processed = 0
  const failedRows: Row[] = []

  // On Ctrl-C, print a resume hint and exit. `pageStart` only advances past a
  // page once every row in it has been *attempted*, so resuming from it skips
  // rows that failed — only offer it when nothing has failed.
  process.on('SIGINT', () => {
    const canFastResume = failedRows.length === 0 && pageStart
    console.log(
      `\nInterrupted after ${processed} ok / ${failedRows.length} failed.\n` +
        (canFastResume
          ? `Resume:  REEMBED_AFTER_ID=${pageStart} <same command>`
          : `Re-run the same command (no REEMBED_AFTER_ID) to finish — writes are idempotent.`)
    )
    process.exit(130)
  })

  console.log(
    `pacing at ${RPM} req/min, concurrency ${CONCURRENCY}` +
      (pageStart ? `, resuming after id ${pageStart}` : '')
  )

  const runRow = async (row: Row) => {
    try {
      const embedding = await embedWithRetry(toTx(row))
      const { error } = await db.from('transactions').update({ embedding }).eq('id', row.id)
      if (error) throw error
      processed++
      return true
    } catch (e) {
      if (!(e instanceof QuotaExhaustedError)) console.error(`  ✗ ${row.id}: ${shortErr(e)}`)
      return false
    }
  }

  const runInBatches = async (rows: Row[]) => {
    for (let i = 0; i < rows.length && !aborted; i += CONCURRENCY) {
      const batch = rows.slice(i, i + CONCURRENCY)
      const results = await Promise.all(batch.map(runRow))
      results.forEach((ok, j) => {
        if (!ok) failedRows.push(batch[j]!)
      })
    }
    if (aborted) {
      throw new QuotaExhaustedError(
        `Hit ${CIRCUIT_BREAK_AFTER} consecutive quota errors — stopping. Gemini embeddings ` +
          `free tier is ~100/min and 1000/day.\n` +
          `  • per-minute limit -> wait ~1 min and re-run\n` +
          `  • daily limit / large table -> enable billing on the API project, or wait for ` +
          `the daily reset (midnight Pacific), then re-run`
      )
    }
  }

  for (;;) {
    let query = db
      .from('transactions')
      .select('id, user_id, amount, currency, description, category, merchant, date, is_recurring')
      .order('id', { ascending: true })
      .limit(PAGE_SIZE)
    if (pageStart) query = query.gt('id', pageStart)

    const { data, error } = await query
    if (error) throw error
    if (!data || data.length === 0) break

    await runInBatches(data as Row[])
    pageStart = (data[data.length - 1] as Row).id
    console.log(`re-embedded ${processed} rows (${failedRows.length} failed so far)…`)
  }

  // One more pass over anything that failed (usually transient per-minute limits).
  if (failedRows.length > 0) {
    const retry = failedRows.splice(0)
    console.log(`\nretrying ${retry.length} failed row(s)…`)
    consecutiveQuotaErrors = 0
    await runInBatches(retry)
  }

  console.log(`\nDone. ${processed} transactions re-embedded, ${failedRows.length} still failing.`)
  if (failedRows.length > 0) {
    console.log('Still-failing ids:', failedRows.map((r) => r.id).join(', '))
    console.log('Re-run the same command (without REEMBED_AFTER_ID) to retry — writes are idempotent.')
    process.exit(1)
  }
}

main().catch((e) => {
  if (e instanceof QuotaExhaustedError) {
    console.error(`\n${e.message}`)
    console.error('Re-run the same command (no REEMBED_AFTER_ID) once quota is back — writes are idempotent.')
  } else {
    console.error(e)
  }
  process.exit(1)
})
