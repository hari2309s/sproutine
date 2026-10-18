'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from './Icon'
import { fetchMonthSummary, type DaySummary } from '@/lib/calendarApi'

interface CalendarInsightsCardProps {
  gentle: boolean
  onTapCalendar: () => void
}

function todayIso() {
  return new Date().toLocaleDateString('sv-SE')
}

function last30Dates(): string[] {
  const dates: string[] = []
  const d = new Date()
  for (let i = 29; i >= 0; i--) {
    const cur = new Date(d)
    cur.setDate(cur.getDate() - i)
    dates.push(cur.toLocaleDateString('sv-SE'))
  }
  return dates
}

function heatColor(kcal: number, gentle: boolean): string {
  if (!kcal) return 'var(--t-border)'
  if (gentle) return 'var(--t-green)'
  if (kcal < 800) return 'var(--t-green-light)'
  if (kcal < 1600) return 'var(--t-green)'
  return 'var(--t-accent)'
}

export function CalendarInsightsCard({ gentle, onTapCalendar }: CalendarInsightsCardProps) {
  const [days, setDays] = useState<DaySummary[]>([])
  const [loading, setLoading] = useState(true)

  const today = todayIso()
  const thisMonth = today.slice(0, 7)
  const prevMonth = useMemo(() => {
    const [y, m] = thisMonth.split('-').map(Number)
    const pm = m! === 1 ? 12 : m! - 1
    const py = m! === 1 ? y! - 1 : y!
    return `${py}-${String(pm).padStart(2, '0')}`
  }, [thisMonth])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [curr, prev] = await Promise.all([
        fetchMonthSummary(thisMonth),
        fetchMonthSummary(prevMonth),
      ])
      setDays([...prev.days, ...curr.days])
    } catch {
      setDays([])
    } finally {
      setLoading(false)
    }
  }, [thisMonth, prevMonth])

  useEffect(() => { void load() }, [load])

  const dayMap = useMemo(() => {
    const m = new Map<string, DaySummary>()
    days.forEach((d) => m.set(d.date, d))
    return m
  }, [days])

  const dates = useMemo(last30Dates, [])
  const loggedCount = dates.filter((d) => dayMap.get(d)?.logged).length

  if (loading) {
    return (
      <div className="h-20 animate-pulse rounded-[22px] bg-sproutine-surface" aria-hidden />
    )
  }

  if (loggedCount === 0) return null

  return (
    <button
      type="button"
      onClick={onTapCalendar}
      className="card flex w-full flex-col gap-3 px-4 py-4 text-left shadow-soft transition-colors hover:bg-sproutine-surface"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="calendar_month" size={20} className="text-sproutine-blue" />
          <span className="text-[14px] font-semibold text-sproutine-text">Last 30 days</span>
        </div>
        <span className="text-[13px] tabular-nums text-sproutine-muted">
          {gentle ? `${loggedCount} check-ins` : `${loggedCount}/30 days logged`}
        </span>
      </div>

      {/* Heatmap strip */}
      <div className="flex gap-[3px]">
        {dates.map((date) => {
          const day = dayMap.get(date)
          return (
            <span
              key={date}
              className="h-3 flex-1 rounded-[2px]"
              style={{ backgroundColor: heatColor(day?.kcal ?? 0, gentle) }}
              title={date}
            />
          )
        })}
      </div>
    </button>
  )
}
