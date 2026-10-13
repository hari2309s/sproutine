'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { CategoryBudget, Transaction, TransactionCategory } from '@truffle/types'
import { TRANSACTION_CATEGORIES } from '@truffle/types'
import { CATEGORY_EMOJI } from '@/lib/categories'
import { SkeletonPulse } from './PageMotion'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useSectionAddForm } from '@/contexts/SectionAddFormContext'

interface MonthlyBudgetsProps {
  userId: string
  transactions: Transaction[]
}

function mapBudget(row: Record<string, unknown>): CategoryBudget {
  return {
    id: row.id as string,
    userId: (row.user_id ?? row.userId) as string,
    category: row.category as TransactionCategory,
    amount: Number(row.amount),
    createdAt: (row.created_at ?? row.createdAt) as string,
  }
}

function currentYearMonth() {
  return new Date().toISOString().slice(0, 7)
}

/** Single pass over transactions building a category -> spend map, instead of
 * filtering+reducing the full array once per budget on every render. */
function useSpendByCategory(transactions: Transaction[]): Partial<Record<TransactionCategory, number>> {
  return useMemo(() => {
    const prefix = currentYearMonth()
    const map: Partial<Record<TransactionCategory, number>> = {}
    for (const tx of transactions) {
      if (tx.amount < 0 && tx.date.startsWith(prefix)) {
        map[tx.category] = (map[tx.category] ?? 0) + Math.abs(tx.amount)
      }
    }
    return map
  }, [transactions])
}

export function MonthlyBudgets({ userId, transactions }: MonthlyBudgetsProps) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { open: showAdd, setOpen: setShowAdd } = useSectionAddForm()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const spendByCategory = useSpendByCategory(transactions)

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets', userId],
    queryFn: async () => {
      const res = await fetch(`/api/budgets?userId=${userId}`)
      if (!res.ok) throw new Error('Failed to fetch budgets')
      const json = await res.json()
      return (json.budgets ?? []).map(mapBudget) as CategoryBudget[]
    },
  })

  const handleDelete = async (budgetId: string) => {
    setDeletingId(budgetId)
    try {
      await fetch(`/api/budgets?userId=${userId}&budgetId=${budgetId}`, { method: 'DELETE' })
      await queryClient.invalidateQueries({ queryKey: ['budgets', userId] })
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  return (
    <>
      {showAdd && (
        <AddBudgetForm
          userId={userId}
          existingCategories={budgets.map((b) => b.category)}
          onDone={() => {
            setShowAdd(false)
            queryClient.invalidateQueries({ queryKey: ['budgets', userId] })
          }}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <SkeletonPulse key={i} className="card h-16" />
          ))}
        </div>
      ) : budgets.length === 0 && !showAdd ? (
        <div className="card border-dashed text-center text-truffle-muted text-sm py-6">
          {t.monthlyBudgets.noBudgets}
        </div>
      ) : (
        <div className="space-y-2">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              spent={spendByCategory[budget.category] ?? 0}
              onDelete={() => handleDelete(budget.id)}
              isDeleting={deletingId === budget.id}
              isConfirmingDelete={confirmDeleteId === budget.id}
              onRequestDelete={() => setConfirmDeleteId(budget.id)}
              onCancelDelete={() => setConfirmDeleteId(null)}
            />
          ))}
        </div>
      )}
    </>
  )
}

function BudgetCard({
  budget,
  spent,
  onDelete,
  isDeleting,
  isConfirmingDelete,
  onRequestDelete,
  onCancelDelete,
}: {
  budget: CategoryBudget
  spent: number
  onDelete: () => void
  isDeleting: boolean
  isConfirmingDelete: boolean
  onRequestDelete: () => void
  onCancelDelete: () => void
}) {
  const { t } = useLanguage()
  const { formatAmount } = useCurrency()
  const pct = Math.min(100, budget.amount > 0 ? (spent / budget.amount) * 100 : 0)
  const remaining = Math.max(0, budget.amount - spent)
  const isOver = spent > budget.amount

  const barColor = isOver ? 'bg-truffle-red' : pct >= 80 ? 'bg-truffle-amber' : 'bg-truffle-green'
  const amountColor = isOver
    ? 'text-red-400'
    : pct >= 80
      ? 'text-truffle-amber'
      : 'text-truffle-text-secondary'

  return (
    <div
      className={`card space-y-2 transition-opacity ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{CATEGORY_EMOJI[budget.category]}</span>
          <div>
            <p className="text-sm font-medium text-truffle-text">
              {t.categories[budget.category] ?? budget.category}
            </p>
            <p className="text-xs text-truffle-muted">
              {isOver
                ? t.monthlyBudgets.over(formatAmount(spent - budget.amount))
                : t.monthlyBudgets.left(formatAmount(remaining))}{' '}
              · {t.monthlyBudgets.budgetLabel(formatAmount(budget.amount))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold tabular-nums ${amountColor}`}>
            {formatAmount(spent)}
          </span>
          <button
            onClick={() => (isConfirmingDelete ? onCancelDelete() : onRequestDelete())}
            className={`text-xs transition-colors ${isConfirmingDelete ? 'text-truffle-red' : 'text-truffle-muted hover:text-truffle-red'}`}
            aria-label={t.monthlyBudgets.removeBudget}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="h-1.5 bg-truffle-surface rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <AnimatePresence>
        {isConfirmingDelete && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="flex items-center justify-between px-4 py-2 bg-truffle-surface rounded-xl border border-truffle-border">
              <p className="text-xs text-truffle-muted">{t.monthlyBudgets.deleteConfirm}</p>
              <div className="flex gap-2">
                <button
                  onClick={onCancelDelete}
                  className="text-xs text-truffle-muted hover:text-truffle-text transition-colors px-2 py-1"
                >
                  {t.savingsGoals.cancel}
                </button>
                <button
                  onClick={onDelete}
                  className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors px-2 py-1"
                >
                  {t.transactions.delete}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const BUDGET_CATEGORIES = TRANSACTION_CATEGORIES.filter((c) => c !== 'income' && c !== 'savings')

function AddBudgetForm({
  userId,
  existingCategories,
  onDone,
}: {
  userId: string
  existingCategories: TransactionCategory[]
  onDone: () => void
}) {
  const { t } = useLanguage()
  const { symbol } = useCurrency()
  const queryClient = useQueryClient()
  const available = BUDGET_CATEGORIES.filter((c) => !existingCategories.includes(c))
  const [category, setCategory] = useState<TransactionCategory>(available[0] ?? 'other')
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (available.length === 0) {
    return (
      <div className="card border-dashed text-center text-truffle-muted text-sm py-4 mb-2">
        {t.monthlyBudgets.allCategoriesHaveBudget}
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    setIsLoading(true)
    try {
      const payload = { userId, category, amount: amt }

      await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      onDone()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3 mb-2">
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as TransactionCategory)}
        className="w-full bg-truffle-surface border border-truffle-border rounded-xl px-4 py-3 text-sm text-truffle-text focus:outline-none focus:border-truffle-amber"
      >
        {available.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_EMOJI[c]} {t.categories[c] ?? c}
          </option>
        ))}
      </select>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-truffle-muted text-sm">
          {symbol}
        </span>
        <input
          type="number"
          placeholder={t.monthlyBudgets.monthlyLimit}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="1"
          step="1"
          required
          className="w-full bg-truffle-surface border border-truffle-border rounded-xl pl-7 pr-4 py-3 text-sm text-truffle-text placeholder-truffle-muted focus:outline-none focus:border-truffle-amber"
        />
      </div>

      <button type="submit" disabled={isLoading} className="btn-primary w-full disabled:opacity-50">
        {isLoading ? t.monthlyBudgets.saving : t.monthlyBudgets.setBudget}
      </button>
    </form>
  )
}
