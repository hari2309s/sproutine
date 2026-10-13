import type { Transaction, MonthlySnapshot, SavingsGoal, Anomaly } from '@truffle/types'

// Synthetic fixtures for eval dataset items only — never used against a real user.
// Berlin/EUR flavoured to match the style of transactions.csv and the demo seed data.

function tx(
  partial: Omit<Transaction, 'id' | 'userId' | 'currency' | 'isRecurring'> & { isRecurring?: boolean }
): Transaction {
  return {
    id: `eval-${partial.description.toLowerCase().replace(/\s+/g, '-')}`,
    userId: 'eval-hari',
    currency: 'EUR',
    isRecurring: false,
    ...partial,
  }
}

export const HARI_TRANSACTIONS: Transaction[] = [
  tx({ date: '2026-09-01', description: 'Miete Wohnung', amount: -850, category: 'housing', merchant: 'Hausverwaltung' }),
  tx({ date: '2026-09-02', description: 'Deutschlandticket', amount: -49, category: 'transport', merchant: 'BVG', isRecurring: true }),
  tx({ date: '2026-09-03', description: 'Wocheneinkauf', amount: -62.4, category: 'food_groceries', merchant: 'REWE' }),
  tx({ date: '2026-09-05', description: 'Netflix', amount: -13.99, category: 'subscriptions', merchant: 'Netflix', isRecurring: true }),
  tx({ date: '2026-09-06', description: 'Lieferando Abendessen', amount: -24.5, category: 'food_delivery', merchant: 'Lieferando' }),
  tx({ date: '2026-09-08', description: 'Gehalt', amount: 2800, category: 'income', merchant: 'Arbeitgeber GmbH' }),
  tx({ date: '2026-09-10', description: 'Fitnessstudio', amount: -34.9, category: 'health', merchant: 'FitX', isRecurring: true }),
  tx({ date: '2026-09-12', description: 'Kino', amount: -18, category: 'entertainment', merchant: 'CineStar' }),
  tx({ date: '2026-09-14', description: 'Wocheneinkauf', amount: -58.1, category: 'food_groceries', merchant: 'REWE' }),
  tx({ date: '2026-09-15', description: 'Strom', amount: -65, category: 'utilities', merchant: 'Vattenfall', isRecurring: true }),
]

export const HARI_SNAPSHOT: MonthlySnapshot = {
  month: '2026-09',
  totalIncome: 2800,
  totalExpenses: -1175.89, // must match the sum of HARI_TRANSACTIONS' expenses exactly
  byCategory: {
    housing: -850,
    transport: -49,
    food_groceries: -120.5,
    subscriptions: -13.99,
    food_delivery: -24.5,
    health: -34.9,
    entertainment: -18,
    utilities: -65,
    shopping: 0,
    income: 2800,
    savings: 0,
    other: 0,
  },
  savingsRate: 0.42,
  balance: 1624.11, // totalIncome + totalExpenses
}

export const HARI_GOALS: SavingsGoal[] = [
  {
    id: 'eval-goal-laptop',
    userId: 'eval-hari',
    name: 'New laptop',
    targetAmount: 1200,
    savedAmount: 480,
    deadline: '2026-12-31',
    emoji: '💻',
    createdAt: '2026-06-01',
  },
  {
    id: 'eval-goal-emergency',
    userId: 'eval-hari',
    name: 'Emergency fund',
    targetAmount: 3000,
    savedAmount: 3000,
    emoji: '🛟',
    createdAt: '2026-01-01',
  },
]

export const HARI_ANOMALIES: Anomaly[] = [
  {
    id: 'eval-anomaly-1',
    transactionId: 'eval-lieferando-abendessen',
    type: 'category_spike',
    severity: 'medium',
    description: 'food_delivery spend is 3x the monthly average so far this month',
    detectedAt: '2026-09-07',
  },
]

export const NO_ANOMALIES: Anomaly[] = []
