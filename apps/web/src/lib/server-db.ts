import { createServerClient } from '@truffle/db'
import { currentYearMonth } from './date'

/**
 * Recomputes the monthly snapshot for a given user from the transactions table.
 * Called after any write that affects balance (new transactions, goal deposits).
 */
export async function recomputeSnapshot(userId: string, db: ReturnType<typeof createServerClient>) {
  const currentMonth = currentYearMonth()
  const startDate = `${currentMonth}-01`
  const [yearStr, monthStr] = currentMonth.split('-')
  const year = parseInt(yearStr!, 10)
  const month = parseInt(monthStr!, 10) - 1 // 0-indexed
  // Use Date.UTC so month rollover arithmetic is timezone-independent
  const nextMonthDate = new Date(Date.UTC(year, month + 1, 1))
  const nextMonthStart = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0')}-01`

  const { data: txs, error: txsError } = await db
    .from('transactions')
    .select('amount, category')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lt('date', nextMonthStart)
    .order('date', { ascending: true })
    .limit(5000)

  if (txsError) throw txsError
  if (!txs) return
  if (txs.length === 5000) {
    console.warn(`[recomputeSnapshot] transaction cap hit for user ${userId} in ${currentMonth}`)
  }

  const rows = txs as { amount: number | string; category: string }[]

  const snapshot = {
    month: currentMonth,
    totalIncome: rows.filter((t) => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0),
    totalExpenses: rows
      .filter((t) => Number(t.amount) < 0)
      .reduce((s, t) => s + Number(t.amount), 0),
    byCategory: {} as Record<string, number>,
    savingsRate: 0,
    balance: rows.reduce((s, t) => s + Number(t.amount), 0),
    transactionCount: rows.length,
  }

  for (const tx of rows) {
    snapshot.byCategory[tx.category] = (snapshot.byCategory[tx.category] ?? 0) + Number(tx.amount)
  }

  if (snapshot.totalIncome > 0) {
    snapshot.savingsRate = Math.max(
      0,
      (snapshot.totalIncome + snapshot.totalExpenses) / snapshot.totalIncome
    )
  }

  await db
    .from('monthly_snapshots')
    .upsert(
      { user_id: userId, month: currentMonth, data: snapshot },
      { onConflict: 'user_id,month' }
    )
}
