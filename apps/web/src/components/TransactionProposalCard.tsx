'use client'

import { motion } from 'framer-motion'
import { memo } from 'react'
import { usePostHog } from 'posthog-js/react'
import { truffleEase } from '@/lib/motion'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TransactionCategory } from '@truffle/types'
import { CATEGORY_EMOJI } from '@/lib/categories'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { toDateLocale } from '@/lib/date'
import { useProposalCard } from './GoalProposalCard'

export interface TransactionProposal {
  description: string
  amount: number
  category: TransactionCategory
  merchant?: string
  date: string
}

interface TransactionProposalCardProps {
  proposal: TransactionProposal
  userId: string
  onResult: (confirmed: boolean) => void
}

export const TransactionProposalCard = memo(function TransactionProposalCard({
  proposal,
  userId,
  onResult,
}: TransactionProposalCardProps) {
  const { t, locale } = useLanguage()
  const { formatAmount, currency } = useCurrency()
  const queryClient = useQueryClient()
  const posthog = usePostHog()

  const isExpense = proposal.amount < 0
  const formattedAmount = `${isExpense ? '-' : '+'}${formatAmount(proposal.amount)}`
  const amountColor = isExpense ? 'text-red-400' : 'text-green-400'
  const emoji = CATEGORY_EMOJI[proposal.category] ?? '📝'
  const categoryLabel = t.categories[proposal.category] ?? proposal.category.replace(/_/g, ' ')
  const formattedDate = new Date(proposal.date).toLocaleDateString(toDateLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const { status, error, handleYes, handleNo } = useProposalCard({
    onResult,
    errorMessage: t.proposals.transaction.error,
    onConfirm: async () => {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          transactions: [
            {
              userId,
              amount: proposal.amount,
              currency,
              description:
                proposal.description.charAt(0).toUpperCase() + proposal.description.slice(1),
              category: proposal.category,
              merchant: proposal.merchant ?? null,
              date: proposal.date,
              isRecurring: false,
            },
          ],
        }),
      })
      if (!res.ok) throw new Error('Failed to log transaction')

      posthog.capture('transaction_added', {
        category: proposal.category,
        is_expense: proposal.amount < 0,
        source: 'voice',
      })

      await queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
      await supabase.from('chat_messages').insert({
        user_id: userId,
        role: 'assistant',
        content: `${emoji} ${proposal.description} logged — ${formattedAmount}`,
      })
    },
  })

  // Return null on done/declined — ChatPage's inv.state === 'result' branch
  // renders the persistent confirmation, avoiding a double bubble.
  if (status === 'done' || status === 'declined') return null

  return (
    <motion.div
      className="flex justify-start mb-3"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.36, ease: truffleEase }}
    >
      <div className="max-w-[85%] bg-truffle-card border border-truffle-amber/40 rounded-2xl rounded-bl-sm px-4 py-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{emoji}</span>
          <div>
            <p className="font-semibold text-truffle-text text-sm">{proposal.description}</p>
            <p className="text-xs text-truffle-muted">
              {proposal.merchant ? `${proposal.merchant} · ` : ''}
              {categoryLabel} · {formattedDate}
            </p>
          </div>
          <span className={`ml-auto font-semibold text-sm ${amountColor}`}>{formattedAmount}</span>
        </div>

        <p className="text-sm font-medium text-truffle-text">{t.proposals.transaction.logThis}</p>

        {error && <p className="text-xs text-truffle-red">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={handleNo}
            disabled={status === 'saving'}
            className="flex-1 btn-ghost text-sm py-2"
          >
            {t.proposals.transaction.noThanks}
          </button>
          <button
            onClick={handleYes}
            disabled={status === 'saving'}
            className="flex-1 btn-primary text-sm py-2 disabled:opacity-50"
          >
            {status === 'saving' ? t.proposals.transaction.saving : t.proposals.transaction.add}
          </button>
        </div>
      </div>
    </motion.div>
  )
})
