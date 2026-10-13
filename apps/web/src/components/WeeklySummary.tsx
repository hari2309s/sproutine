'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { truffleEase } from '@/lib/motion'
import { useTransactionsQuery } from '@/hooks/useTransactionsQuery'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import type { Translations } from '@/lib/i18n'

interface WeeklySummaryProps {
  userId: string
}

function getISOWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getFullYear()}-W${week}`
}

function buildSummary(
  transactions: { amount: number | string; category: string; date: string }[],
  ws: Translations['weeklySummary'],
  formatAmount: (n: number) => string = (n) => `€${Math.abs(n).toFixed(0)}`
): string | null {
  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(today.getDate() - 7)

  const weekTxs = transactions.filter((t) => new Date(t.date) >= weekAgo)
  if (weekTxs.length === 0) return null

  const income = weekTxs
    .filter((t) => Number(t.amount) > 0)
    .reduce((s, t) => s + Number(t.amount), 0)
  const expenses = weekTxs
    .filter((t) => Number(t.amount) < 0)
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)

  const catTotals: Record<string, number> = {}
  for (const tx of weekTxs) {
    if (Number(tx.amount) < 0) {
      catTotals[tx.category] = (catTotals[tx.category] ?? 0) + Math.abs(Number(tx.amount))
    }
  }
  const topCategory = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
  const topLabel = topCategory.replace(/_/g, ' ')

  let text = ws.spent(formatAmount(expenses))
  if (income > 0) text += ws.earned(formatAmount(income))
  if (topLabel) text += ws.topCategory(topLabel)

  return text
}

export function WeeklySummary({ userId }: WeeklySummaryProps) {
  const { t } = useLanguage()
  const { formatAmount } = useCurrency()
  const [visible, setVisible] = useState(false)
  const [summaryText, setSummaryText] = useState<string | null>(null)
  const { speak, isSpeaking } = useTextToSpeech()

  const { data } = useTransactionsQuery(userId)

  useEffect(() => {
    if (!data?.transactions) return
    const currentWeek = getISOWeek(new Date())
    const lastSeen = localStorage.getItem('truffle_weekly_summary')
    if (lastSeen === currentWeek) return

    const text = buildSummary(data.transactions, t.weeklySummary, formatAmount)
    if (!text) return

    setSummaryText(text)
    setVisible(true)
    localStorage.setItem('truffle_weekly_summary', currentWeek)
  }, [data, t.weeklySummary])

  const handleSpeak = () => {
    if (!summaryText || isSpeaking) return
    speak(summaryText)
  }

  if (!visible || !summaryText) return null

  return (
    <motion.div
      className="card border border-truffle-amber/30 bg-truffle-amber/5 space-y-3"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.42, ease: truffleEase }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-truffle-amber uppercase tracking-wide mb-1">
            {t.weeklySummary.title}
          </p>
          <p className="text-sm text-truffle-text">{summaryText}</p>
        </div>
        <button
          onClick={() => setVisible(false)}
          aria-label={t.weeklySummary.dismiss}
          className="text-truffle-muted hover:text-truffle-text transition-colors flex-shrink-0 text-xs mt-0.5"
        >
          ✕
        </button>
      </div>
      <button
        onClick={handleSpeak}
        disabled={isSpeaking}
        className={`text-xs flex items-center gap-1.5 transition-colors ${isSpeaking ? 'text-truffle-muted cursor-default' : 'text-truffle-amber hover:text-truffle-amber-light'}`}
      >
        <span>{isSpeaking ? '🔊' : '▶'}</span>
        {isSpeaking ? t.weeklySummary.playing : t.weeklySummary.readAloud}
      </button>
    </motion.div>
  )
}
