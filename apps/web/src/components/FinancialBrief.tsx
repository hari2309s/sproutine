'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { computeForecast } from '@/lib/forecast'
import { truffleEase } from '@/lib/motion'
import { SkeletonPulse } from './PageMotion'
import { useTransactionsQuery } from '@/hooks/useTransactionsQuery'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { toDateLocale } from '@/lib/date'

interface FinancialBriefProps {
  userId: string
}

function computeAllTimeSummary(
  transactions: { amount: number | string; currency?: string; date: string }[],
  locale: string
) {
  if (!transactions.length) return null

  const balance = transactions.reduce((s, t) => s + Number(t.amount), 0)
  const income = transactions
    .filter((t) => Number(t.amount) > 0)
    .reduce((s, t) => s + Number(t.amount), 0)
  const expenses = transactions
    .filter((t) => Number(t.amount) < 0)
    .reduce((s, t) => s + Number(t.amount), 0)

  const sorted = [...transactions].sort((a, b) => (a.date > b.date ? -1 : 1))
  const latestMonth = sorted[0]?.date?.slice(0, 7) ?? ''
  const label = latestMonth
    ? new Date(latestMonth + '-01').toLocaleString(toDateLocale(locale), {
        month: 'long',
        year: 'numeric',
      })
    : 'All time'

  return { balance, income, expenses: Math.abs(expenses), label }
}

export function FinancialBrief({ userId }: FinancialBriefProps) {
  const { t, locale } = useLanguage()
  const { formatAmount } = useCurrency()
  const { data, isLoading } = useTransactionsQuery(userId)

  const forecast = useMemo(
    () => (data?.transactions ? computeForecast(data.transactions, formatAmount) : null),
    [data?.transactions, formatAmount]
  )
  const allTime = useMemo(
    () =>
      !forecast && data?.transactions?.length
        ? computeAllTimeSummary(data.transactions, locale)
        : null,
    [forecast, data?.transactions, locale]
  )

  if (isLoading) {
    return (
      <SkeletonPulse className="card space-y-3">
        <div className="h-4 bg-truffle-border rounded w-1/3" />
        <div className="h-8 bg-truffle-border rounded w-1/2" />
        <div className="h-3 bg-truffle-border rounded w-2/3" />
      </SkeletonPulse>
    )
  }

  if (!forecast && !allTime) {
    return (
      <motion.div
        className="card border-dashed"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: truffleEase }}
      >
        <p className="text-sm text-truffle-muted text-center py-2">
          {t.financialBrief.addTransactions}
        </p>
      </motion.div>
    )
  }

  if (forecast) {
    const isPositive = forecast.projectedEndOfMonth > 0
    const balanceColor = isPositive ? 'text-truffle-green' : 'text-truffle-red'

    return (
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: truffleEase }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-truffle-text-secondary uppercase tracking-wide">
            {t.financialBrief.endOfMonth}
          </h2>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              forecast.confidence === 'high'
                ? 'bg-truffle-green/20 text-truffle-green'
                : forecast.confidence === 'medium'
                  ? 'bg-truffle-amber/20 text-truffle-amber'
                  : 'bg-truffle-muted/20 text-truffle-muted'
            }`}
          >
            {t.financialBrief.confidence[forecast.confidence]}
          </span>
        </div>

        <p className={`text-3xl font-bold mb-1 ${balanceColor}`}>
          {formatAmount(forecast.projectedEndOfMonth)}
        </p>
        <p className="text-sm text-truffle-text-secondary">{t.financialBrief.projectedBalance}</p>

        <div className="mt-4 pt-4 border-t border-truffle-border">
          <div className="flex justify-between text-sm">
            <span className="text-truffle-text-secondary">{t.financialBrief.current}</span>
            <span className="text-truffle-text">{formatAmount(forecast.currentBalance)}</span>
          </div>
        </div>

        {forecast.assumptions.map((a, i) => (
          <p key={i} className="text-xs text-truffle-muted mt-2">
            {a}
          </p>
        ))}
      </motion.div>
    )
  }

  const isPositive = (allTime?.balance ?? 0) >= 0
  const balanceColor = isPositive ? 'text-truffle-green' : 'text-truffle-red'

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: truffleEase }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-truffle-text-secondary uppercase tracking-wide">
          {allTime?.label ?? 'Overview'}
        </h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-truffle-muted/20 text-truffle-muted">
          {t.financialBrief.noDataThisMonth}
        </span>
      </div>

      <p className={`text-3xl font-bold mb-1 ${balanceColor}`}>
        {formatAmount(allTime?.balance ?? 0)}
      </p>
      <p className="text-sm text-truffle-text-secondary">{t.financialBrief.netBalance}</p>

      <div className="mt-4 pt-4 border-t border-truffle-border space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-truffle-text-secondary">{t.financialBrief.income}</span>
          <span className="text-truffle-green">+{formatAmount(allTime?.income ?? 0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-truffle-text-secondary">{t.financialBrief.expenses}</span>
          <span className="text-truffle-red">-{formatAmount(allTime?.expenses ?? 0)}</span>
        </div>
      </div>

      <p className="text-xs text-truffle-muted mt-3">{t.financialBrief.addForForecast}</p>
    </motion.div>
  )
}
