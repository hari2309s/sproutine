'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePostHog } from 'posthog-js/react'
import type { TransactionCategory } from '@truffle/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrency } from '@/contexts/CurrencyContext'

const CATEGORY_KEYS: TransactionCategory[] = [
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
]

const CATEGORY_EMOJI: Record<TransactionCategory, string> = {
  food_groceries: '🛒',
  food_delivery: '🍕',
  transport: '🚇',
  housing: '🏠',
  utilities: '💡',
  subscriptions: '📱',
  health: '💊',
  entertainment: '🎬',
  shopping: '🛍️',
  income: '💰',
  savings: '🏦',
  other: '📦',
}

interface AddTransactionFormProps {
  userId: string
  onClose?: () => void
}

export function AddTransactionForm({ userId, onClose }: AddTransactionFormProps) {
  const { t } = useLanguage()
  const { symbol, currency } = useCurrency()
  const queryClient = useQueryClient()
  const posthog = usePostHog()
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'other' as TransactionCategory,
    date: new Date().toISOString().slice(0, 10),
    merchant: '',
    isExpense: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description || !form.amount) return

    setIsLoading(true)
    try {
      const amount = parseFloat(form.amount) * (form.isExpense ? -1 : 1)
      const transaction = {
        description: form.description,
        amount,
        currency,
        category: form.category,
        date: form.date,
        merchant: form.merchant || undefined,
        isRecurring: false,
        userId,
      }

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, transactions: [transaction] }),
      })

      if (!res.ok) throw new Error('Failed to save')

      posthog.capture('transaction_added', {
        category: form.category,
        is_expense: form.isExpense,
      })

      await queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
      await queryClient.invalidateQueries({ queryKey: ['insights', userId] })

      setForm({
        description: '',
        amount: '',
        category: 'other',
        date: new Date().toISOString().slice(0, 10),
        merchant: '',
        isExpense: true,
      })
      onClose?.()
    } catch (err) {
      console.error('Failed to add transaction:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h3 className="font-semibold text-truffle-text">{t.addTransaction.title}</h3>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, isExpense: true }))}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
            form.isExpense
              ? 'bg-truffle-amber text-truffle-bg'
              : 'bg-truffle-surface text-truffle-muted'
          }`}
        >
          {t.addTransaction.expense}
        </button>
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, isExpense: false }))}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
            !form.isExpense
              ? 'bg-truffle-green text-truffle-bg'
              : 'bg-truffle-surface text-truffle-muted'
          }`}
        >
          {t.addTransaction.income}
        </button>
      </div>

      <label htmlFor="tx-description" className="sr-only">
        {t.addTransaction.descriptionPlaceholder}
      </label>
      <input
        id="tx-description"
        type="text"
        placeholder={t.addTransaction.descriptionPlaceholder}
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        className="w-full bg-truffle-surface border border-truffle-border rounded-xl px-4 py-3 text-sm text-truffle-text placeholder-truffle-muted focus:outline-none focus:border-truffle-amber"
        required
      />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-truffle-muted text-sm">
            {symbol}
          </span>
          <label htmlFor="tx-amount" className="sr-only">
            {t.addTransaction.amountLabel}
          </label>
          <input
            id="tx-amount"
            type="number"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            step="0.01"
            min="0"
            className="w-full bg-truffle-surface border border-truffle-border rounded-xl pl-7 pr-4 py-3 text-sm text-truffle-text placeholder-truffle-muted focus:outline-none focus:border-truffle-amber"
            required
          />
        </div>
        <label htmlFor="tx-date" className="sr-only">
          {t.addTransaction.dateLabel}
        </label>
        <input
          id="tx-date"
          type="date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          className="bg-truffle-surface border border-truffle-border rounded-xl px-3 py-3 text-sm text-truffle-text focus:outline-none focus:border-truffle-amber"
        />
      </div>

      <label htmlFor="tx-category" className="sr-only">
        {t.addTransaction.categoryLabel}
      </label>
      <select
        id="tx-category"
        value={form.category}
        onChange={(e) => {
          const category = e.target.value as TransactionCategory
          const isIncome = category === 'income' || category === 'savings'
          setForm((f) => ({ ...f, category, isExpense: !isIncome }))
        }}
        className="w-full bg-truffle-surface border border-truffle-border rounded-xl px-4 py-3 text-sm text-truffle-text focus:outline-none focus:border-truffle-amber"
      >
        {CATEGORY_KEYS.map((key) => (
          <option key={key} value={key}>
            {CATEGORY_EMOJI[key]} {t.categories[key] ?? key}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? t.addTransaction.saving : t.addTransaction.add}
      </button>
    </form>
  )
}
