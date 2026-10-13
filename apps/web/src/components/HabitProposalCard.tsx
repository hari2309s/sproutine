'use client'

import { motion } from 'framer-motion'
import { memo } from 'react'
import { truffleEase } from '@/lib/motion'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useProposalCard } from './GoalProposalCard'

export interface HabitProposal {
  name: string
  amount: number
  frequency: 'weekly' | 'monthly'
  emoji: string
  pitch: string
}

interface HabitProposalCardProps {
  proposal: HabitProposal
  userId: string
  onResult: (confirmed: boolean) => void
}

export const HabitProposalCard = memo(function HabitProposalCard({
  proposal,
  userId,
  onResult,
}: HabitProposalCardProps) {
  const { t } = useLanguage()
  const { formatAmount } = useCurrency()
  const queryClient = useQueryClient()

  const periodLabel =
    proposal.frequency === 'weekly' ? t.savingsHabits.periodWeek : t.savingsHabits.periodMonth
  const frequencyLabel =
    proposal.frequency === 'weekly' ? t.proposals.habit.weeklyLabel : t.proposals.habit.monthlyLabel

  const { status, error, handleYes, handleNo } = useProposalCard({
    onResult,
    errorMessage: t.proposals.habit.error,
    onConfirm: async () => {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: proposal.name,
          amount: proposal.amount,
          frequency: proposal.frequency,
          emoji: proposal.emoji,
        }),
      })
      if (!res.ok) throw new Error('Failed to create habit')
      await queryClient.invalidateQueries({ queryKey: ['habits', userId] })
      await supabase.from('chat_messages').insert({
        user_id: userId,
        role: 'assistant',
        content: `${proposal.emoji} ${proposal.name} — ${formatAmount(proposal.amount)}/${periodLabel}. ${t.proposals.habit.logEachPeriod(periodLabel)}`,
      })
    },
  })

  if (status === 'done' || status === 'declined') return null

  return (
    <motion.div
      className="flex justify-start mb-3"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.36, ease: truffleEase }}
    >
      <div className="max-w-[85%] bg-truffle-card border border-truffle-green/40 rounded-2xl rounded-bl-sm overflow-hidden">
        {/* Header band */}
        <div className="bg-truffle-green/10 px-4 py-3 flex items-center gap-2">
          <span className="text-base">🔁</span>
          <span className="text-xs font-semibold text-truffle-green uppercase tracking-wide">
            {frequencyLabel}
          </span>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Habit identity */}
          <div className="flex items-center gap-3">
            <span className="text-3xl">{proposal.emoji}</span>
            <div>
              <p className="font-semibold text-truffle-text text-sm">{proposal.name}</p>
              <p className="text-xs text-truffle-muted">
                {t.proposals.habit.logEachPeriod(periodLabel)}
              </p>
            </div>
          </div>

          {/* Amount callout */}
          <div className="bg-truffle-surface rounded-xl px-4 py-3 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-truffle-green">
              {formatAmount(proposal.amount)}
            </span>
            <span className="text-sm text-truffle-muted">/ {periodLabel}</span>
          </div>

          {/* Pitch */}
          <p className="text-xs text-truffle-muted leading-relaxed">{proposal.pitch}</p>

          {error && <p className="text-xs text-truffle-red">{error}</p>}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleNo}
              disabled={status === 'saving'}
              className="flex-1 btn-ghost text-sm py-2"
            >
              {t.proposals.habit.notNow}
            </button>
            <button
              onClick={handleYes}
              disabled={status === 'saving'}
              className="flex-1 text-sm py-2 rounded-xl font-semibold bg-truffle-green text-truffle-bg disabled:opacity-50 transition-opacity"
            >
              {status === 'saving' ? t.proposals.habit.settingUp : t.proposals.habit.startSaving}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
})
