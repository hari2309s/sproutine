'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SkeletonPulse } from './PageMotion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { usePostHog } from 'posthog-js/react'
import type { SavingsGoal } from '@truffle/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useSectionAddForm } from '@/contexts/SectionAddFormContext'

const GOAL_EMOJIS = ['🎯', '✈️', '🏠', '🚗', '💻', '🎓', '💍', '🏖️', '🎸', '📱', '🏋️', '🌍']

function mapGoal(row: Record<string, unknown>): SavingsGoal {
  return {
    id: row.id as string,
    userId: (row.user_id ?? row.userId) as string,
    name: row.name as string,
    targetAmount: Number(row.target_amount ?? row.targetAmount),
    savedAmount: Number(row.saved_amount ?? row.savedAmount),
    deadline: (row.deadline as string | undefined) ?? undefined,
    emoji: row.emoji as string,
    createdAt: (row.created_at ?? row.createdAt) as string,
  }
}

interface SavingsGoalsBodyProps {
  userId: string
  showAdd: boolean
  onShowAddChange: (open: boolean) => void
}

/** Shared content — fetches goals, renders the add form and goal list. No section wrapper or header. */
function SavingsGoalsBody({ userId, showAdd, onShowAddChange }: SavingsGoalsBodyProps) {
  const { t } = useLanguage()
  const { currency } = useCurrency()
  const queryClient = useQueryClient()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [fundsError, setFundsError] = useState<string | null>(null)

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals', userId],
    queryFn: async () => {
      const res = await fetch('/api/goals')
      if (!res.ok) throw new Error('Failed to fetch goals')
      const json = await res.json()
      return (json.goals ?? []).map(mapGoal) as SavingsGoal[]
    },
  })

  const handleAddFunds = async (goalId: string, currentSaved: number, deposit: number) => {
    setFundsError(null)
    const goal = goals.find((g) => g.id === goalId)
    if (!goal) return
    const newAmount = Math.min(currentSaved + deposit, goal.targetAmount)
    const payload = { goalId, savedAmount: newAmount, currency }

    const res = await fetch('/api/goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.status === 409) {
      // Concurrent update — invalidate to get the latest state; the user can retry
      await queryClient.invalidateQueries({ queryKey: ['goals', userId] })
      return
    }
    if (!res.ok) {
      // Invalidate stale cache (e.g. targetAmount changed concurrently) before showing error
      await queryClient.invalidateQueries({ queryKey: ['goals', userId] })
      setFundsError('Failed to add funds. Please try again.')
      return
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['goals', userId] }),
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] }),
    ])
  }

  const handleDelete = async (goalId: string) => {
    setDeletingId(goalId)
    try {
      await fetch(`/api/goals?goalId=${encodeURIComponent(goalId)}`, { method: 'DELETE' })
      await queryClient.invalidateQueries({ queryKey: ['goals', userId] })
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  return (
    <>
      {showAdd && (
        <AddGoalForm
          userId={userId}
          onDone={() => {
            onShowAddChange(false)
            queryClient.invalidateQueries({ queryKey: ['goals', userId] })
          }}
        />
      )}

      {fundsError && <p className="text-xs text-truffle-red mb-2">{fundsError}</p>}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <SkeletonPulse key={i} className="card h-20" />
          ))}
        </div>
      ) : goals.length === 0 && !showAdd ? (
        <div className="card border-dashed text-center text-truffle-muted text-sm py-6">
          {t.savingsGoals.noGoals}
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onAddFunds={(amount) => handleAddFunds(goal.id, goal.savedAmount, amount)}
              onDelete={() => handleDelete(goal.id)}
              isDeleting={deletingId === goal.id}
              isConfirmingDelete={confirmDeleteId === goal.id}
              onRequestDelete={() => setConfirmDeleteId(goal.id)}
              onCancelDelete={() => setConfirmDeleteId(null)}
            />
          ))}
        </div>
      )}
    </>
  )
}

interface SavingsGoalsProps {
  userId: string
}

/** Standalone savings goals section: owns its own open/close state and renders its own header + wrapper. */
export function SavingsGoals({ userId }: SavingsGoalsProps) {
  const { t } = useLanguage()
  const [showAdd, setShowAdd] = useState(false)

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-truffle-text-secondary uppercase tracking-wide">
          {t.savingsGoals.title}
        </h2>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-truffle-amber hover:text-truffle-amber-light transition-colors"
        >
          {showAdd ? t.savingsGoals.cancel : t.savingsGoals.newGoal}
        </button>
      </div>

      <SavingsGoalsBody userId={userId} showAdd={showAdd} onShowAddChange={setShowAdd} />
    </section>
  )
}

/**
 * Variant for embedding inline inside an `InsightsAccordionSection`: no wrapper, no header —
 * the section owns the header/toggle button itself. Open/close state comes from the
 * `SectionAddFormProvider` the accordion section is wrapped in, rather than controlled props.
 */
export function SavingsGoalsEmbedded({ userId }: SavingsGoalsProps) {
  const { open, setOpen } = useSectionAddForm()
  return <SavingsGoalsBody userId={userId} showAdd={open} onShowAddChange={setOpen} />
}

function GoalCard({
  goal,
  onAddFunds,
  onDelete,
  isDeleting,
  isConfirmingDelete,
  onRequestDelete,
  onCancelDelete,
}: {
  goal: SavingsGoal
  onAddFunds: (amount: number) => void
  onDelete: () => void
  isDeleting: boolean
  isConfirmingDelete: boolean
  onRequestDelete: () => void
  onCancelDelete: () => void
}) {
  const { t } = useLanguage()
  const { formatAmount, symbol } = useCurrency()
  const [showDeposit, setShowDeposit] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')

  const progress = Math.min(100, (goal.savedAmount / goal.targetAmount) * 100)
  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount)
  const done = goal.savedAmount >= goal.targetAmount

  const daysLeft = goal.deadline
    ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86_400_000)
    : null

  return (
    <div
      className={`card space-y-3 transition-opacity ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{goal.emoji}</span>
          <div>
            <p className="font-medium text-truffle-text text-sm">{goal.name}</p>
            <p className="text-xs text-truffle-muted">
              {formatAmount(goal.savedAmount)} / {formatAmount(goal.targetAmount)}
              {daysLeft !== null && daysLeft > 0 && ` · ${t.savingsGoals.daysLeft(daysLeft)}`}
              {daysLeft !== null && daysLeft <= 0 && ` · ${t.savingsGoals.deadlinePassed}`}
            </p>
          </div>
        </div>
        {done ? (
          <span className="text-xs text-truffle-green font-medium">{t.savingsGoals.complete}</span>
        ) : (
          <button
            onClick={() => (isConfirmingDelete ? onCancelDelete() : onRequestDelete())}
            aria-label={t.savingsGoals.deleteGoal}
            className={`text-xs transition-colors ${isConfirmingDelete ? 'text-truffle-red' : 'text-truffle-muted hover:text-truffle-red'}`}
          >
            ✕
          </button>
        )}
      </div>

      <div className="h-1.5 bg-truffle-surface rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-truffle-green' : 'bg-truffle-amber'}`}
          style={{ width: `${progress}%` }}
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
              <p className="text-xs text-truffle-muted">{t.savingsGoals.deleteConfirm}</p>
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

      {!done && (
        <>
          {showDeposit ? (
            <div className="flex gap-2">
              <input
                type="number"
                placeholder={`${symbol}0 — ${t.savingsGoals.remaining(formatAmount(remaining))}`}
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                min="0"
                step="0.01"
                className="flex-1 bg-truffle-surface border border-truffle-border rounded-xl px-3 py-2 text-sm text-truffle-text placeholder-truffle-muted focus:outline-none focus:border-truffle-amber"
              />
              <button
                onClick={() => {
                  const amt = parseFloat(depositAmount)
                  if (amt > 0) {
                    onAddFunds(amt)
                    setDepositAmount('')
                    setShowDeposit(false)
                  }
                }}
                className="btn-primary text-xs px-3 py-2"
              >
                {t.savingsGoals.add}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeposit(true)}
              className="text-xs text-truffle-amber hover:text-truffle-amber-light transition-colors"
            >
              {t.savingsGoals.addFunds}
            </button>
          )}
        </>
      )}
    </div>
  )
}

function AddGoalForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const { t } = useLanguage()
  const { symbol } = useCurrency()
  const queryClient = useQueryClient()
  const posthog = usePostHog()
  const [form, setForm] = useState({ name: '', targetAmount: '', deadline: '', emoji: '🎯' })
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.targetAmount) return
    setIsLoading(true)
    setSubmitError(null)
    // Capture form values immediately so concurrent React renders can't change them mid-submit
    const { name, targetAmount: targetAmountStr, deadline, emoji } = form
    const targetAmount = parseFloat(targetAmountStr)
    try {
      const payload = {
        name,
        targetAmount,
        deadline: deadline || undefined,
        emoji,
      }

      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to create goal')

      posthog.capture('goal_created', {
        target_amount: targetAmount,
        has_deadline: Boolean(deadline),
      })

      onDone()
    } catch {
      setSubmitError('Failed to create goal. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3 mb-3">
      <div className="flex gap-2 flex-wrap">
        {GOAL_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setForm((f) => ({ ...f, emoji: e }))}
            className={`text-xl p-1 rounded-lg transition-all ${form.emoji === e ? 'bg-truffle-amber/20 ring-1 ring-truffle-amber' : 'hover:bg-truffle-surface'}`}
          >
            {e}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder={t.savingsGoals.goalNamePlaceholder}
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        className="w-full bg-truffle-surface border border-truffle-border rounded-xl px-4 py-3 text-sm text-truffle-text placeholder-truffle-muted focus:outline-none focus:border-truffle-amber"
        required
      />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-truffle-muted text-sm">
            {symbol}
          </span>
          <input
            type="number"
            placeholder={t.savingsGoals.targetAmount}
            value={form.targetAmount}
            onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
            min="1"
            step="0.01"
            className="w-full bg-truffle-surface border border-truffle-border rounded-xl pl-7 pr-4 py-3 text-sm text-truffle-text placeholder-truffle-muted focus:outline-none focus:border-truffle-amber"
            required
          />
        </div>
        <input
          type="date"
          value={form.deadline}
          onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
          className="bg-truffle-surface border border-truffle-border rounded-xl px-3 py-3 text-sm text-truffle-text focus:outline-none focus:border-truffle-amber"
        />
      </div>

      {submitError && <p className="text-xs text-truffle-red">{submitError}</p>}
      <button type="submit" disabled={isLoading} className="btn-primary w-full disabled:opacity-50">
        {isLoading ? t.savingsGoals.creating : t.savingsGoals.createGoal}
      </button>
    </form>
  )
}
