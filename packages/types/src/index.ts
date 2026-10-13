export interface Transaction {
  id: string
  userId: string
  amount: number // negative = expense, positive = income
  currency: 'EUR' | 'GBP' | 'USD'
  description: string
  category: TransactionCategory
  merchant?: string
  date: string // ISO date string
  isRecurring: boolean
  embedding?: number[] // @xenova/transformers embedding
  createdAt?: string
}

export type TransactionCategory =
  | 'food_groceries'
  | 'food_delivery'
  | 'transport'
  | 'housing'
  | 'utilities'
  | 'subscriptions'
  | 'health'
  | 'entertainment'
  | 'shopping'
  | 'income'
  | 'savings'
  | 'other'

export const TRANSACTION_CATEGORIES = [
  'food_groceries',
  'food_delivery',
  'transport',
  'housing',
  'utilities',
  'subscriptions',
  'health',
  'entertainment',
  'shopping',
  'income',
  'savings',
  'other',
] as const satisfies readonly TransactionCategory[]

export interface MonthlySnapshot {
  month: string // YYYY-MM
  totalIncome: number
  totalExpenses: number
  byCategory: Record<TransactionCategory, number>
  savingsRate: number
  balance: number
}

export interface Anomaly {
  id: string
  transactionId: string
  type: 'unusual_amount' | 'forgotten_subscription' | 'category_spike' | 'new_merchant'
  severity: 'high' | 'medium' | 'low'
  description: string
  detectedAt: string
}

export interface Forecast {
  currentBalance: number
  projectedEndOfMonth: number
  projectedSavings: number
  confidence: 'high' | 'medium' | 'low'
  assumptions: string[]
  generatedAt: string
}

export interface SavingsGoal {
  id: string
  userId: string
  name: string
  targetAmount: number
  savedAmount: number
  deadline?: string // ISO date string
  emoji: string
  createdAt: string
}

export interface DetectedSubscription {
  key: string // normalised merchant/description
  displayName: string
  monthlyAmount: number
  currency: 'EUR' | 'GBP' | 'USD'
  lastCharged: string // ISO date
  monthsDetected: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  audioUrl?: string
  timestamp: string
}

export interface TruffleState {
  transactions: Transaction[]
  currentMonth: MonthlySnapshot
  anomalies: Anomaly[]
  forecast: Forecast
  chatHistory: ChatMessage[]
  userQuery?: string
  agentResponse?: string
  intent?: QueryIntent
}

export type QueryIntent =
  | 'spending_summary'
  | 'affordability_check'
  | 'anomaly_review'
  | 'forecast_request'
  | 'category_breakdown'
  | 'savings_goal_check'
  | 'goal_setting'
  | 'add_transaction'
  | 'habit_setting'
  | 'greeting'
  | 'general_advice'

export const INTENT = {
  SPENDING_SUMMARY: 'spending_summary',
  AFFORDABILITY_CHECK: 'affordability_check',
  ANOMALY_REVIEW: 'anomaly_review',
  FORECAST_REQUEST: 'forecast_request',
  CATEGORY_BREAKDOWN: 'category_breakdown',
  SAVINGS_GOAL_CHECK: 'savings_goal_check',
  GOAL_SETTING: 'goal_setting',
  ADD_TRANSACTION: 'add_transaction',
  HABIT_SETTING: 'habit_setting',
  GREETING: 'greeting',
  GENERAL_ADVICE: 'general_advice',
} as const satisfies Record<string, QueryIntent>

export interface SavingsHabit {
  id: string
  userId: string
  name: string
  amount: number
  frequency: 'weekly' | 'monthly'
  emoji: string
  isActive: boolean
  createdAt: string
}

export interface HabitContribution {
  id: string
  habitId: string
  userId: string
  period: string // 'YYYY-MM' or 'YYYY-WNN'
  amount: number
  loggedAt: string
}

export interface HabitWithStats extends SavingsHabit {
  streak: number
  currentPeriodLogged: boolean
  totalSaved: number
}

export interface CategoryBudget {
  id: string
  userId: string
  category: TransactionCategory
  amount: number // monthly spending limit in EUR
  createdAt: string
}
