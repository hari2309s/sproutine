import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@truffle/db'
import type { Forecast } from '@truffle/types'
import { currentYearMonth } from '@/lib/date'
import { sendMonthlyReportNudge } from '@/lib/proactive-nudge'
import { requireUser } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const userId = user.id

    // Only fire the monthly report nudge in the first 3 days of the month to
    // avoid re-triggering on every page load for the rest of the month.
    const dayOfMonth = new Date().getDate()
    if (dayOfMonth <= 3) {
      void sendMonthlyReportNudge(userId).catch((e) =>
        console.warn('Monthly report nudge failed (non-fatal):', e)
      )
    }

    const db = createServerClient()
    const currentMonth = currentYearMonth()
    // Compute next month start using Date.UTC so arithmetic is timezone-independent
    const [ymYear, ymMonth] = currentMonth.split('-')
    const year = parseInt(ymYear!, 10)
    const month = parseInt(ymMonth!, 10) - 1 // 0-indexed
    const nextMonthDate = new Date(Date.UTC(year, month + 1, 1))
    const nextMonthStart = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0')}-01`

    // Anomalies — isolated so a missing table never breaks the forecast
    let anomalies: unknown[] = []
    try {
      const { data, error } = await db
        .from('anomalies')
        .select('id, transaction_id, type, severity, description, detected_at, dismissed')
        .eq('user_id', userId)
        .order('detected_at', { ascending: false })
        .limit(10)
      if (error) console.warn('Anomalies query error (non-fatal):', error.message)
      else anomalies = data ?? []
    } catch (e) {
      console.warn('Anomalies query threw (non-fatal):', e)
    }

    // Compute balance live from current-month transactions only
    const { data: txsRaw, error: txErr } = await db
      .from('transactions')
      .select('amount, category, date')
      .eq('user_id', userId)
      .gte('date', `${currentMonth}-01`)
      .lt('date', nextMonthStart)
      .order('date', { ascending: false })
      .limit(2000)

    if (txErr) {
      console.error('Transactions query error:', txErr.message)
      return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 })
    }
    const truncated = (txsRaw?.length ?? 0) === 2000
    if (truncated) console.warn(`[insights] hit 2000-row cap for user ${userId.slice(0, 8)}…`)

    const txs = (txsRaw ?? []) as { amount: number | string; category: string; date: string }[]
    const transactionCount = txs.length

    const totalIncome = txs
      .filter((t) => Number(t.amount) > 0)
      .reduce((s, t) => s + Number(t.amount), 0)

    const totalExpenses = txs
      .filter((t) => Number(t.amount) < 0)
      .reduce((s, t) => s + Number(t.amount), 0)

    const balance = txs.reduce((s, t) => s + Number(t.amount), 0)

    let forecast: Forecast | null = null
    if (transactionCount > 0) {
      const today = new Date()
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
      const daysElapsed = today.getDate()
      const daysRemaining = daysInMonth - daysElapsed

      const dailySpendRate = daysElapsed > 0 ? totalExpenses / daysElapsed : 0
      const projectedRemainingSpend = dailySpendRate * daysRemaining
      const projectedEndOfMonth = balance + projectedRemainingSpend

      const monthName = today.toLocaleString('default', { month: 'long' })

      forecast = {
        currentBalance: balance,
        projectedEndOfMonth,
        projectedSavings: Math.max(0, projectedEndOfMonth),
        confidence: transactionCount >= 10 ? 'high' : transactionCount >= 3 ? 'medium' : 'low',
        assumptions: [
          `Based on ${transactionCount} transaction${transactionCount !== 1 ? 's' : ''} in ${monthName}`,
          `Daily spend rate: €${Math.abs(dailySpendRate).toFixed(2)}`,
          `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`,
          `Income this month: €${totalIncome.toFixed(2)}`,
        ],
        generatedAt: new Date().toISOString(),
      }
    }

    return NextResponse.json(
      { anomalies, forecast, truncated },
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } }
    )
  } catch (error) {
    console.error('Insights error:', error)
    return NextResponse.json({ error: 'Failed to get insights' }, { status: 500 })
  }
}
