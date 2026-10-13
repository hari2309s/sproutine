'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { staggerItemVariants, staggerListVariants } from '@/lib/motion'
import { SkeletonPulse } from './PageMotion'
import { CATEGORY_EMOJI } from '@/lib/categories'
import { useTransactionFilters } from '@/hooks/useTransactionFilters'
import { useTransactionsQuery } from '@/hooks/useTransactionsQuery'
import { TransactionFilterPanel } from './TransactionFilterPanel'
import { TRANSACTION_CATEGORIES } from '@truffle/types'
import type { Transaction, TransactionCategory } from '@truffle/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { toDateLocale } from '@/lib/date'

function exportToCSV(transactions: Transaction[]) {
  const header = ['Date', 'Description', 'Category', 'Merchant', 'Amount', 'Currency']
  const rows = transactions.map((tx) => [
    tx.date,
    `"${tx.description.replace(/"/g, '""')}"`,
    tx.category,
    `"${(tx.merchant ?? '').replace(/"/g, '""')}"`,
    tx.amount.toFixed(2),
    tx.currency,
  ])
  const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `truffle-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

interface TransactionListProps {
  userId: string
}

const EDIT_CATEGORIES = TRANSACTION_CATEGORIES

interface EditFormState {
  description: string
  amount: string
  category: TransactionCategory
  merchant: string
  date: string
}

function EditForm({
  tx,
  userId,
  onSave,
  onCancel,
}: {
  tx: Transaction
  userId: string
  onSave: () => void
  onCancel: () => void
}) {
  const { t } = useLanguage()
  const { symbol } = useCurrency()
  const [form, setForm] = useState<EditFormState>({
    description: tx.description,
    amount: tx.amount.toString(),
    category: tx.category,
    merchant: tx.merchant ?? '',
    date: tx.date,
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(form.amount)
    if (isNaN(amt)) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          transactionId: tx.id,
          description: form.description.trim(),
          amount: amt,
          category: form.category,
          merchant: form.merchant.trim() || undefined,
          date: form.date,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      onSave()
    } catch {
      // Keep form open on error
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3 border-truffle-amber/40">
      <div className="flex gap-2">
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder={t.transactions.descriptionPlaceholder}
          required
          className="flex-1 bg-truffle-surface border border-truffle-border rounded-xl px-3 py-2 text-sm text-truffle-text placeholder-truffle-muted focus:outline-none focus:border-truffle-amber"
        />
        <div className="relative w-28">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-truffle-muted text-sm">
            {symbol}
          </span>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="-0.00"
            step="0.01"
            required
            className="w-full bg-truffle-surface border border-truffle-border rounded-xl pl-7 pr-3 py-2 text-sm text-truffle-text placeholder-truffle-muted focus:outline-none focus:border-truffle-amber"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <select
          value={form.category}
          onChange={(e) =>
            setForm((f) => ({ ...f, category: e.target.value as TransactionCategory }))
          }
          className="flex-1 bg-truffle-surface border border-truffle-border rounded-xl px-3 py-2 text-sm text-truffle-text focus:outline-none focus:border-truffle-amber"
        >
          {EDIT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_EMOJI[c]} {t.categories[c] ?? c}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          required
          className="bg-truffle-surface border border-truffle-border rounded-xl px-3 py-2 text-sm text-truffle-text focus:outline-none focus:border-truffle-amber"
        />
      </div>

      <input
        type="text"
        value={form.merchant}
        onChange={(e) => setForm((f) => ({ ...f, merchant: e.target.value }))}
        placeholder={t.transactions.merchantPlaceholder}
        className="w-full bg-truffle-surface border border-truffle-border rounded-xl px-3 py-2 text-sm text-truffle-text placeholder-truffle-muted focus:outline-none focus:border-truffle-amber"
      />

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 btn-ghost text-xs py-2">
          {t.transactions.cancel}
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 btn-primary text-xs py-2 disabled:opacity-50"
        >
          {isSaving ? `${t.transactions.save}…` : t.transactions.save}
        </button>
      </div>
    </form>
  )
}

export function TransactionList({ userId }: TransactionListProps) {
  const { t, locale } = useLanguage()
  const { formatAmount } = useCurrency()
  const queryClient = useQueryClient()
  const { data, isLoading } = useTransactionsQuery(userId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const allTransactions = data?.transactions ?? []
  const [visibleMonthCount, setVisibleMonthCount] = useState(1)

  const filters = useTransactionFilters(allTransactions)
  const { filtered, isFiltered, clearFilters } = filters

  const cutoffDate = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() - (visibleMonthCount - 1), 1)
      .toISOString()
      .slice(0, 10)
  }, [visibleMonthCount])

  const windowed = useMemo(
    () => allTransactions.filter((tx) => tx.date >= cutoffDate),
    [allTransactions, cutoffDate]
  )

  const hasMore = useMemo(
    () => !isFiltered && allTransactions.some((tx) => tx.date < cutoffDate),
    [isFiltered, allTransactions, cutoffDate]
  )

  const nextMonthLabel = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() - visibleMonthCount, 1).toLocaleDateString(
      toDateLocale(locale),
      { month: 'long', year: 'numeric' }
    )
  }, [visibleMonthCount, locale])

  const displayed = isFiltered ? filtered : windowed

  const handleSaveEdit = async () => {
    setEditingId(null)
    await queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
  }

  const handleDelete = async (txId: string) => {
    setDeletingId(txId)
    try {
      await fetch(`/api/transactions?userId=${userId}&transactionId=${txId}`, { method: 'DELETE' })
      await queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <SkeletonPulse key={i} className="card flex gap-3">
            <div className="w-10 h-10 bg-truffle-border rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-truffle-border rounded w-2/3" />
              <div className="h-3 bg-truffle-border rounded w-1/3" />
            </div>
            <div className="h-4 bg-truffle-border rounded w-16 flex-shrink-0" />
          </SkeletonPulse>
        ))}
      </div>
    )
  }

  if (allTransactions.length === 0) {
    return (
      <motion.div
        className="card border-dashed text-center py-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: [0.4, 0, 0.2, 1] }}
      >
        <p className="text-truffle-muted text-sm">{t.transactions.noTransactions}</p>
        <p className="text-truffle-muted text-xs mt-1">{t.transactions.noTransactionsHint}</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3">
      <TransactionFilterPanel filters={filters} />

      <div className="flex items-center justify-between">
        <p className="text-xs text-truffle-muted">
          {isFiltered
            ? t.transactions.filteredCount(filtered.length, allTransactions.length)
            : t.transactions.count(windowed.length)}
        </p>
        <div className="flex items-center gap-3">
          {isFiltered && (
            <button
              onClick={clearFilters}
              className="text-xs text-truffle-muted hover:text-truffle-text underline underline-offset-2"
            >
              {t.transactions.clear}
            </button>
          )}
          <button
            onClick={() => exportToCSV(filtered)}
            className="text-xs text-truffle-amber hover:text-truffle-amber-light transition-colors"
          >
            {t.transactions.exportCSV}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {displayed.length === 0 ? (
          <motion.div
            key="empty"
            className="card border-dashed text-center py-6"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-truffle-muted text-sm">
              {isFiltered ? t.transactions.noMatching : t.transactions.noThisMonth}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            className="space-y-2"
            initial="hidden"
            animate="show"
            variants={staggerListVariants}
          >
            {displayed.map((tx) => {
              const isEditing = editingId === tx.id
              const isConfirmingDelete = confirmDeleteId === tx.id
              const isBeingDeleted = deletingId === tx.id

              if (isEditing) {
                return (
                  <motion.div key={tx.id} variants={staggerItemVariants}>
                    <EditForm
                      tx={tx}
                      userId={userId}
                      onSave={handleSaveEdit}
                      onCancel={() => setEditingId(null)}
                    />
                  </motion.div>
                )
              }

              return (
                <motion.div
                  key={tx.id}
                  variants={staggerItemVariants}
                  className={`space-y-2 transition-opacity ${isBeingDeleted ? 'opacity-40 pointer-events-none' : ''}`}
                >
                  <div className="card flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-truffle-surface flex items-center justify-center text-lg flex-shrink-0">
                      {CATEGORY_EMOJI[tx.category] ?? '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-truffle-text truncate">
                        {tx.description}
                      </p>
                      <p className="text-xs text-truffle-muted">
                        {t.categories[tx.category] ?? tx.category} ·{' '}
                        {new Date(tx.date).toLocaleDateString(toDateLocale(locale), {
                          day: 'numeric',
                          month: 'short',
                        })}
                        {tx.merchant ? ` · ${tx.merchant}` : ''}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold flex-shrink-0 ${tx.amount > 0 ? 'text-truffle-green' : 'text-red-400'}`}
                    >
                      {tx.amount > 0 ? '+' : '-'}
                      {formatAmount(tx.amount)}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                      <button
                        onClick={() => {
                          setEditingId(tx.id)
                          setConfirmDeleteId(null)
                        }}
                        aria-label={t.transactions.edit}
                        className="p-1.5 rounded-lg text-truffle-muted hover:text-truffle-text hover:bg-truffle-surface transition-colors"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(isConfirmingDelete ? null : tx.id)}
                        aria-label={t.transactions.delete}
                        className={`p-1.5 rounded-lg transition-colors ${isConfirmingDelete ? 'text-red-400 bg-truffle-surface' : 'text-truffle-muted hover:text-red-400 hover:bg-truffle-surface'}`}
                      >
                        <TrashIcon />
                      </button>
                    </div>
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
                          <p className="text-xs text-truffle-muted">
                            {t.transactions.deleteConfirm}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs text-truffle-muted hover:text-truffle-text transition-colors px-2 py-1"
                            >
                              {t.transactions.cancel}
                            </button>
                            <button
                              onClick={() => handleDelete(tx.id)}
                              className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors px-2 py-1"
                            >
                              {t.transactions.delete}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {hasMore && (
        <button
          onClick={() => setVisibleMonthCount((n) => n + 1)}
          className="w-full py-2.5 text-xs text-truffle-muted hover:text-truffle-text border border-truffle-border hover:border-truffle-amber rounded-xl transition-colors"
        >
          {t.transactions.loadMonth(nextMonthLabel)}
        </button>
      )}
    </div>
  )
}

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}
