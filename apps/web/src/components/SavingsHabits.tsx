'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getCurrentPeriod } from '@/lib/habits'
import { staggerItemVariants, staggerListVariants, truffleEase } from '@/lib/motion'
import { SkeletonPulse } from './PageMotion'
import type { HabitWithStats } from '@truffle/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrency } from '@/contexts/CurrencyContext'

interface SavingsHabitsProps {
  userId: string
}

export function SavingsHabits({ userId }: SavingsHabitsProps) {
  const { t } = useLanguage()
  const { currency } = useCurrency()
  const queryClient = useQueryClient()
  const [loggingId, setLoggingId] = useState<string | null>(null)
  const [logError, setLogError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['habits', userId],
    queryFn: async () => {
      const res = await fetch('/api/habits')
      if (!res.ok) throw new Error('Failed to fetch habits')
      const json = await res.json()
      return json.habits as HabitWithStats[]
    },
  })

  const habits = data ?? []

  const handleLogContribution = async (habit: HabitWithStats) => {
    setLoggingId(habit.id)
    setLogError(null)
    try {
      const period = getCurrentPeriod(habit.frequency)
      const payload = { habitId: habit.id, period, amount: habit.amount, currency }

      const res = await fetch('/api/habits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        console.error('Failed to log habit contribution:', res.status)
        setLogError('Failed to log contribution. Please try again.')
        return
      }
      await queryClient.invalidateQueries({ queryKey: ['habits', userId] })
    } finally {
      setLoggingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <SkeletonPulse key={i} className="card h-20" />
        ))}
      </div>
    )
  }

  if (habits.length === 0) {
    return (
      <motion.div
        className="card border-dashed text-center text-truffle-muted text-sm py-6"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: truffleEase }}
      >
        {t.savingsHabits.noHabits}
      </motion.div>
    )
  }

  return (
    <motion.div
      className="space-y-3"
      initial="hidden"
      animate="show"
      variants={staggerListVariants}
    >
      {logError && <p className="text-xs text-truffle-red">{logError}</p>}
      {habits.map((habit) => (
        <motion.div key={habit.id} variants={staggerItemVariants}>
          <HabitCard
            habit={habit}
            isLogging={loggingId === habit.id}
            onLog={() => handleLogContribution(habit)}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}

function HabitCard({
  habit,
  isLogging,
  onLog,
}: {
  habit: HabitWithStats
  isLogging: boolean
  onLog: () => void
}) {
  const { t } = useLanguage()
  const { formatAmount } = useCurrency()
  const periodLabel =
    habit.frequency === 'weekly' ? t.savingsHabits.periodWeek : t.savingsHabits.periodMonth
  const streakLabel = habit.streak > 0 ? `🔥 ${habit.streak} in a row` : null

  return (
    <div className="card flex items-center gap-3">
      <span className="text-2xl flex-shrink-0">{habit.emoji}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-truffle-text truncate">{habit.name}</p>
          {streakLabel && (
            <span className="text-xs text-truffle-amber flex-shrink-0">{streakLabel}</span>
          )}
        </div>
        <p className="text-xs text-truffle-muted">
          {formatAmount(habit.amount)}/{periodLabel} ·{' '}
          {t.savingsHabits.totalSaved(formatAmount(habit.totalSaved))}
        </p>
      </div>

      <div className="flex-shrink-0">
        {habit.currentPeriodLogged ? (
          <span className="text-xs px-2 py-1 rounded-full bg-truffle-green/20 text-truffle-green">
            {t.savingsHabits.done}
          </span>
        ) : (
          <button
            onClick={onLog}
            disabled={isLogging}
            className="text-xs px-3 py-1.5 rounded-full bg-truffle-amber/20 text-truffle-amber hover:bg-truffle-amber/30 transition-colors disabled:opacity-50"
          >
            {isLogging ? '…' : t.savingsHabits.log}
          </button>
        )}
      </div>
    </div>
  )
}
