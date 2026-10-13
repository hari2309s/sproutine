import { NextRequest, NextResponse, after } from 'next/server'
import { createServerClient } from '@truffle/db'
import { embedTransaction, upsertTransaction } from '@truffle/ai'
import type { Transaction, Anomaly } from '@truffle/types'
import { recomputeSnapshot } from '@/lib/server-db'
import { sendAnomalyNudge, sendBudgetNudge } from '@/lib/proactive-nudge'
import { CATEGORY_EMOJI } from '@/lib/categories'
import { requireUser } from '@/lib/supabase-server'
import { sanitizeForLog } from '@/lib/log'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const userId = user.id

    const db = createServerClient()
    const { data, error } = await db
      .from('transactions')
      .select(
        'id, user_id, amount, currency, description, category, merchant, date, is_recurring, created_at'
      )
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error

    return NextResponse.json(
      { transactions: data },
      { headers: { 'Cache-Control': 'private, no-cache' } }
    )
  } catch (error) {
    console.error('GET transactions error:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const userId = user.id

    const body = await request.json()
    const { transactions }: { transactions: Omit<Transaction, 'id' | 'embedding'>[] } = body

    if (!transactions?.length) {
      return NextResponse.json({ error: 'transactions required' }, { status: 400 })
    }

    const db = createServerClient()

    // Assign IDs upfront so embeddings and DB rows share the same ID
    const txsWithIds: Transaction[] = transactions.map((tx) => ({
      ...tx,
      id: crypto.randomUUID(),
      userId,
    }))

    // Generate all embeddings in parallel (non-fatal per transaction)
    const embeddings = await Promise.all(
      txsWithIds.map((tx) =>
        embedTransaction(tx).catch((e) => {
          console.warn(
            'Embedding failed (non-fatal):',
            sanitizeForLog(e instanceof Error ? e.message : e)
          )
          return [] as number[]
        })
      )
    )

    // Apply embeddings so ChromaDB upserts have the vector attached
    txsWithIds.forEach((tx, i) => {
      if (embeddings[i]!.length > 0) tx.embedding = embeddings[i]
    })

    // Batch insert all transactions in a single round-trip
    const { data: insertedRows, error: insertError } = await db
      .from('transactions')
      .insert(
        txsWithIds.map((tx, i) => ({
          id: tx.id,
          user_id: userId,
          amount: tx.amount,
          currency: tx.currency,
          description: tx.description,
          category: tx.category,
          merchant: tx.merchant,
          date: tx.date,
          is_recurring: tx.isRecurring,
          embedding: embeddings[i]!.length > 0 ? embeddings[i] : null,
        }))
      )
      .select()

    if (insertError) throw insertError

    const results = (insertedRows ?? []) as Record<string, unknown>[]

    // Upsert all to ChromaDB in parallel (non-fatal)
    await Promise.all(
      txsWithIds.map((tx) =>
        upsertTransaction(tx).catch((e) =>
          console.warn(
            'ChromaDB upsert failed (non-fatal):',
            sanitizeForLog(e instanceof Error ? e.message : e)
          )
        )
      )
    )

    // Recompute monthly snapshot — kept before the response since callers
    // that re-fetch the snapshot immediately after this POST expect it to
    // already reflect the newly inserted transactions.
    await recomputeSnapshot(userId, db)

    // Anomaly detection/nudges and the budget-threshold check/nudge below are
    // not needed to answer this request — each nudge involves an LLM call,
    // and the budget check adds extra DB round trips — so they're deferred to
    // run after the response has been sent via Next's `after()` instead of
    // making the client wait on them.
    after(async () => {
      // Run anomaly detection then fire proactive nudges (both non-fatal)
      try {
        const anomalies = await detectAnomalies(userId, results, db)
        if (anomalies.length) {
          const typedTxs = results.map((r) => ({ ...r }) as unknown as Transaction)
          for (const anomaly of anomalies) {
            try {
              await sendAnomalyNudge({ userId, anomaly, transactions: typedTxs, snapshot: null })
            } catch (e) {
              console.error(`Anomaly nudge failed for tx ${anomaly.transactionId}:`, e)
            }
          }
        }
      } catch (e) {
        console.error('Anomaly detection failed:', e)
      }

      // Check budget thresholds and fire nudges when a category hits 80% or 100% (non-fatal)
      try {
        const currentMonth = new Date().toISOString().slice(0, 7)
        const { data: budgets } = await db
          .from('monthly_budgets')
          .select('category, amount')
          .eq('user_id', userId)
        if (budgets?.length) {
          const { data: monthTxs } = await db
            .from('transactions')
            .select('category, amount')
            .eq('user_id', userId)
            .like('date', `${currentMonth}%`)
            .lt('amount', '0')
          const spendByCategory: Record<string, number> = {}
          for (const tx of (monthTxs ?? []) as { category: string; amount: number }[]) {
            spendByCategory[tx.category] =
              (spendByCategory[tx.category] ?? 0) + Math.abs(Number(tx.amount))
          }
          for (const b of budgets as { category: string; amount: number }[]) {
            const spent = spendByCategory[b.category] ?? 0
            const pct = (spent / b.amount) * 100
            if (pct >= 80) {
              try {
                await sendBudgetNudge({
                  userId,
                  category: b.category,
                  categoryEmoji: CATEGORY_EMOJI[b.category as keyof typeof CATEGORY_EMOJI] ?? '📦',
                  spentAmount: spent,
                  budgetAmount: b.amount,
                  percentUsed: pct,
                  month: currentMonth,
                })
              } catch (e) {
                console.error(`Budget nudge failed for ${b.category}:`, e)
              }
            }
          }
        }
      } catch (e) {
        console.error('Budget nudge check failed:', e)
      }
    })

    return NextResponse.json({ transactions: results })
  } catch (error) {
    console.error('POST transactions error:', error)
    return NextResponse.json({ error: 'Failed to save transactions' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const userId = user.id

    const body = await request.json()
    const { transactionId, description, amount, category, merchant, date } = body as {
      transactionId: string
      description: string
      amount: number
      category: string
      merchant?: string
      date: string
    }

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId required' }, { status: 400 })
    }

    const db = createServerClient()
    const { data, error } = await db
      .from('transactions')
      .update({
        description,
        amount,
        category,
        merchant: merchant || null,
        date,
      })
      .eq('id', transactionId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    await recomputeSnapshot(userId, db)
    return NextResponse.json({ transaction: data })
  } catch (error) {
    console.error('PATCH transactions error:', error)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const userId = user.id

    const transactionId = request.nextUrl.searchParams.get('transactionId')

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId required' }, { status: 400 })
    }

    const db = createServerClient()
    const { error } = await db
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', userId)

    if (error) throw error

    await recomputeSnapshot(userId, db)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE transactions error:', error)
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}

async function detectAnomalies(
  userId: string,
  newTxs: Record<string, unknown>[],
  db: ReturnType<typeof createServerClient>
): Promise<Anomaly[]> {
  // Fetch last 90 days of history for statistical baseline, excluding the
  // transactions we just inserted so the new amounts don't inflate the mean/σ.
  const newIds = newTxs.map((tx) => tx.id as string)
  const since = new Date()
  since.setDate(since.getDate() - 90)
  let historyQuery = db
    .from('transactions')
    .select('amount, category, merchant, description')
    .eq('user_id', userId)
    .gte('date', since.toISOString().slice(0, 10))
    .lt('amount', '0') // expenses only
  if (newIds.length > 0) historyQuery = historyQuery.not('id', 'in', `(${newIds.join(',')})`)
  const { data: history } = await historyQuery

  if (!history || history.length < 5) return [] // not enough history

  // Build per-category stats
  const categoryStats: Record<string, { amounts: number[] }> = {}
  for (const tx of history as Record<string, unknown>[]) {
    const cat = tx.category as string
    if (!categoryStats[cat]) categoryStats[cat] = { amounts: [] }
    categoryStats[cat].amounts.push(Math.abs(Number(tx.amount)))
  }

  const anomaliesToInsert: Record<string, unknown>[] = []

  for (const tx of newTxs) {
    const amount = Number(tx.amount)
    if (amount >= 0) continue // skip income

    const cat = tx.category as string
    const stats = categoryStats[cat]
    if (!stats || stats.amounts.length < 3) continue

    const mean = stats.amounts.reduce((s, v) => s + v, 0) / stats.amounts.length
    const variance = stats.amounts.reduce((s, v) => s + (v - mean) ** 2, 0) / stats.amounts.length
    const stdDev = Math.sqrt(variance)
    const absAmount = Math.abs(amount)

    // Flag if > mean + 2σ
    if (stdDev > 0 && absAmount > mean + 2 * stdDev) {
      anomaliesToInsert.push({
        user_id: userId,
        transaction_id: tx.id as string,
        type: 'unusual_amount',
        severity: absAmount > mean + 3 * stdDev ? 'high' : 'medium',
        description: `${tx.description} is unusually high for ${cat.replace(/_/g, ' ')} — €${absAmount.toFixed(2)} vs your usual €${mean.toFixed(2)}`,
      })
    }
  }

  // Detect duplicate subscriptions: same merchant/description charged multiple
  // times in the current month. Compare new transactions against history from
  // the same calendar month.
  const currentMonth = new Date().toISOString().slice(0, 7)
  let monthQuery = db
    .from('transactions')
    .select('id, amount, category, merchant, description, date')
    .eq('user_id', userId)
    .gte('date', `${currentMonth}-01`)
    .lt('amount', '0')
  if (newIds.length > 0) monthQuery = monthQuery.not('id', 'in', `(${newIds.join(',')})`)
  const { data: monthTxs } = await monthQuery

  if (monthTxs) {
    for (const tx of newTxs) {
      if (Number(tx.amount) >= 0) continue
      const cat = tx.category as string
      if (cat !== 'subscriptions') continue

      const desc = (tx.description as string).toLowerCase()
      const merchant = ((tx.merchant as string) ?? '').toLowerCase()

      const duplicate = (monthTxs as Record<string, unknown>[]).find((existing) => {
        const exDesc = (existing.description as string).toLowerCase()
        const exMerchant = ((existing.merchant as string) ?? '').toLowerCase()
        return (
          (merchant && exMerchant && merchant === exMerchant) || (desc && exDesc && desc === exDesc)
        )
      })

      if (duplicate) {
        const existingAmount = Math.abs(Number(duplicate.amount)).toFixed(2)
        const newAmount = Math.abs(Number(tx.amount)).toFixed(2)
        anomaliesToInsert.push({
          user_id: userId,
          transaction_id: tx.id as string,
          type: 'forgotten_subscription',
          severity: 'medium',
          description: `Possible duplicate subscription: ${tx.description} charged €${newAmount} — already charged €${existingAmount} this month`,
        })
      }
    }
  }

  if (anomaliesToInsert.length === 0) return []

  const { data: inserted } = await db
    .from('anomalies')
    .insert(anomaliesToInsert)
    .select('id, transaction_id, type, severity, description, detected_at')

  return (inserted ?? []).map((row) => ({
    id: row.id as string,
    transactionId: row.transaction_id as string,
    type: row.type as Anomaly['type'],
    severity: row.severity as Anomaly['severity'],
    description: row.description as string,
    detectedAt: row.detected_at as string,
  }))
}
