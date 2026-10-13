import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Transaction } from '@truffle/types'
import { embedTransaction, embedText } from './embeddings'

let _supabase: SupabaseClient | null = null

function getSupabase() {
  if (_supabase) return _supabase
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not set')
  _supabase = createClient(url, key)
  return _supabase
}

export async function upsertTransaction(transaction: Transaction): Promise<void> {
  const embedding = transaction.embedding ?? (await embedTransaction(transaction))
  const db = getSupabase()
  await db.from('transactions').update({ embedding }).eq('id', transaction.id)
}

export async function queryTransactions(
  userId: string,
  query: string,
  nResults = 20
): Promise<Transaction[]> {
  const queryEmbedding = await embedText(query)
  const db = getSupabase()

  const { data, error } = await db.rpc('match_transactions', {
    query_embedding: queryEmbedding,
    match_user_id: userId,
    match_count: nResults,
  })

  if (error) throw error
  if (!data?.length) return []

  return (data as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    amount: Number(row.amount),
    currency: (row.currency as 'EUR' | 'GBP' | 'USD') ?? 'EUR',
    description: row.description as string,
    category: (row.category as Transaction['category']) ?? 'other',
    merchant: (row.merchant as string | null) ?? undefined,
    date: row.date as string,
    isRecurring: Boolean(row.is_recurring),
  }))
}

export async function deleteUserTransactions(userId: string): Promise<void> {
  // Embeddings are stored on the transactions table — cascade handles deletion
  const db = getSupabase()
  await db.from('transactions').update({ embedding: null }).eq('user_id', userId)
}
