import type { MonthlySnapshot } from '@truffle/types'

export type SpeechTone = 'celebratory' | 'reassuring' | 'concerned' | 'neutral'

function computeProjection(snapshot: MonthlySnapshot): {
  savingsRate: number
  projectedBalance: number
} {
  const { totalIncome, totalExpenses, balance } = snapshot
  const savingsRate = totalIncome > 0 ? (totalIncome + totalExpenses) / totalIncome : 0
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const daysElapsed = today.getDate()
  const daysRemaining = daysInMonth - daysElapsed
  const dailySpend =
    daysElapsed > 0 && totalExpenses < 0 ? Math.abs(totalExpenses) / daysElapsed : 0
  const projectedBalance = balance - dailySpend * daysRemaining
  return { savingsRate, projectedBalance }
}

export function getSpeechTone(snapshot: MonthlySnapshot): SpeechTone {
  const { totalIncome, totalExpenses } = snapshot
  if (totalIncome === 0 && totalExpenses === 0) return 'neutral'

  const { savingsRate, projectedBalance } = computeProjection(snapshot)
  if (projectedBalance < 0) return 'concerned'
  if (savingsRate < 0.1) return 'reassuring'
  if (savingsRate > 0.4) return 'celebratory'
  return 'neutral'
}

export function getToneGuidance(snapshot: MonthlySnapshot): string {
  const { totalIncome, totalExpenses } = snapshot
  if (totalIncome === 0 && totalExpenses === 0) {
    return 'The user is just getting started — be encouraging and welcoming.'
  }

  const { savingsRate, projectedBalance } = computeProjection(snapshot)

  if (projectedBalance < 0) {
    return 'The user is projected to go negative this month — be very reassuring, non-judgmental, and focus on one small practical step they can take. Do not alarm them.'
  }
  if (savingsRate < 0.1) {
    return 'It is a tight month for the user — be warm and reassuring. Acknowledge the difficulty without dwelling on it. Find something positive to mention.'
  }
  if (savingsRate > 0.4) {
    return 'The user is doing really well financially this month — celebrate it genuinely! Be enthusiastic but not over the top.'
  }
  return 'The user is in a solid financial position this month — be calm, informative, and encouraging.'
}
