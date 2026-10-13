import { currentYearMonth } from './date'

export interface Forecast {
  currentBalance: number
  projectedEndOfMonth: number
  confidence: 'high' | 'medium' | 'low'
  assumptions: string[]
}

export function computeForecast(
  transactions: { amount: number | string; currency?: string; date: string }[],
  formatAmount: (n: number) => string = (n) => `€${Math.abs(n).toFixed(2)}`
): Forecast | null {
  const currentMonth = currentYearMonth()
  const txs = transactions.filter((t) => String(t.date).startsWith(currentMonth))
  if (txs.length === 0) return null

  const amounts = txs.map((t) => Number(t.amount))
  const totalIncome = amounts.filter((a) => a > 0).reduce((s, a) => s + a, 0)
  const totalExpenses = amounts.filter((a) => a < 0).reduce((s, a) => s + a, 0)
  const balance = amounts.reduce((s, a) => s + a, 0)

  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const daysElapsed = today.getDate()
  const daysRemaining = daysInMonth - daysElapsed
  const dailySpendRate = daysElapsed > 0 && totalExpenses < 0 ? totalExpenses / daysElapsed : 0
  const projectedEndOfMonth = balance + dailySpendRate * daysRemaining

  const monthName = today.toLocaleString('default', { month: 'long' })
  const count = txs.length

  return {
    currentBalance: balance,
    projectedEndOfMonth,
    confidence: count >= 10 ? 'high' : count >= 3 ? 'medium' : 'low',
    assumptions: [
      `Based on ${count} transaction${count !== 1 ? 's' : ''} in ${monthName}`,
      `Daily spend rate: ${formatAmount(Math.abs(dailySpendRate))}`,
      `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`,
      `Income this month: ${formatAmount(totalIncome)}`,
    ],
  }
}
