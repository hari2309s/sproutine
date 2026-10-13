import { useQuery } from '@tanstack/react-query'
import type { Transaction } from '@truffle/types'

/** Maps a raw Supabase row (snake_case) or already-mapped object to a Transaction. */
function mapTransactionRow(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    userId: (row.user_id ?? row.userId) as string,
    amount: Number(row.amount),
    currency: row.currency as Transaction['currency'],
    description: row.description as string,
    category: row.category as Transaction['category'],
    merchant: row.merchant as string,
    date: row.date as string,
    isRecurring: (row.is_recurring ?? row.isRecurring) as boolean,
  }
}

/**
 * Canonical query for the ['transactions', userId] cache key.
 *
 * All components that read transaction data must use this hook so that
 * TanStack Query's shared cache is always populated with a consistent shape.
 */
export function useTransactionsQuery(userId: string) {
  return useQuery({
    queryKey: ['transactions', userId],
    queryFn: async () => {
      const res = await fetch('/api/transactions')
      if (!res.ok) throw new Error('Failed to fetch transactions')
      const json = await res.json()
      const transactions: Transaction[] = (json.transactions ?? []).map(mapTransactionRow)
      return { transactions }
    },
  })
}
