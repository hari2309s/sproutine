import type { DetectedSubscription } from '@truffle/types'

interface RawTransaction {
  amount: number | string
  currency?: string
  description: string
  merchant?: string | null
  date: string
}

function normaliseKey(tx: RawTransaction): string {
  const base = (tx.merchant || tx.description).toLowerCase().trim()
  // Strip common suffixes/noise so "Netflix" and "NETFLIX MONTHLY" both normalise
  return base.replace(/\s+(monthly|subscription|sub|payment|charge|fee)$/i, '').trim()
}

function isoWeekMonth(dateStr: string): string {
  // Return YYYY-MM so we can count distinct months
  return String(dateStr).slice(0, 7)
}

export function detectSubscriptions(transactions: RawTransaction[]): DetectedSubscription[] {
  // Only look at expenses
  const expenses = transactions.filter((t) => Number(t.amount) < 0)

  // Group by normalised key
  const groups = new Map<string, RawTransaction[]>()
  for (const tx of expenses) {
    const key = normaliseKey(tx)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(tx)
  }

  const results: DetectedSubscription[] = []

  for (const [key, txs] of groups) {
    // Must appear in at least 2 distinct months
    const months = new Set(txs.map((t) => isoWeekMonth(t.date)))
    if (months.size < 2) continue

    // Compute median absolute amount
    const amounts = txs.map((t) => Math.abs(Number(t.amount))).sort((a, b) => a - b)
    const median = amounts[Math.floor(amounts.length / 2)] ?? 0

    // All amounts within 20% of median (filters out irregular large purchases from same merchant)
    const consistent = txs.filter(
      (t) => Math.abs(Math.abs(Number(t.amount)) - median) / median < 0.2
    )
    if (consistent.length < 2) continue
    const consistentMonths = new Set(consistent.map((t) => isoWeekMonth(t.date)))
    if (consistentMonths.size < 2) continue

    // Most recent transaction
    const sorted = [...consistent].sort((a, b) => (a.date > b.date ? -1 : 1))
    const latest = sorted[0]!

    results.push({
      key,
      displayName: (latest.merchant || latest.description)
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' '),
      monthlyAmount: median,
      currency: (latest.currency as 'EUR' | 'GBP' | 'USD') ?? 'EUR',
      lastCharged: latest.date,
      monthsDetected: consistentMonths.size,
    })
  }

  // Sort by monthly cost descending
  return results.sort((a, b) => b.monthlyAmount - a.monthlyAmount)
}
