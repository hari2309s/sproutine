'use client'

import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Transaction } from '@truffle/types'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { CATEGORY_EMOJI } from '@/lib/categories'
import { toDateLocale } from '@/lib/date'

interface Props {
  transactions: Transaction[]
}

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

// Maps absolute spend to a 0–4 bucket relative to the month's max-spend day
function heatBucket(spend: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (spend === 0 || max === 0) return 0
  const r = spend / max
  if (r < 0.2) return 1
  if (r < 0.45) return 2
  if (r < 0.75) return 3
  return 4
}

// Explicit lookup so the full class strings are statically present for any tooling
const HEAT_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'heat-0',
  1: 'heat-1',
  2: 'heat-2',
  3: 'heat-3',
  4: 'heat-4',
}

export function SpendingHeatmap({ transactions }: Props) {
  const { formatAmount } = useCurrency()
  const { locale } = useLanguage()
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1) // 1-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth() + 1

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
  // Convert JS Sun=0 → Mon-first offset (Mon=0 … Sun=6)
  const firstDayJS = new Date(viewYear, viewMonth - 1, 1).getDay()
  const leadingBlanks = (firstDayJS + 6) % 7

  const { dayMap, maxSpend, monthTotal } = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth).padStart(2, '0')}`
    const map = new Map<string, { spend: number; txs: Transaction[] }>()

    for (const tx of transactions) {
      if (!tx.date.startsWith(prefix) || tx.amount >= 0) continue
      const eur = Math.abs(tx.amount)
      const entry = map.get(tx.date)
      if (entry) {
        entry.spend += eur
        entry.txs.push(tx)
      } else {
        map.set(tx.date, { spend: eur, txs: [tx] })
      }
    }

    const values = Array.from(map.values())
    const max = values.length > 0 ? Math.max(...values.map((v) => v.spend)) : 0
    const total = values.reduce((s, v) => s + v.spend, 0)

    return { dayMap: map, maxSpend: max, monthTotal: total }
  }, [transactions, viewYear, viewMonth])

  function navigate(delta: number) {
    let m = viewMonth + delta
    let y = viewYear
    if (m > 12) {
      m = 1
      y++
    }
    if (m < 1) {
      m = 12
      y--
    }
    setViewMonth(m)
    setViewYear(y)
    setSelectedDate(null)
  }

  const selectedData = selectedDate ? (dayMap.get(selectedDate) ?? null) : null

  // Build flat cell list: null = blank leading cell, number = day-of-month
  const cells: Array<number | null> = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const monthLabel = new Date(viewYear, viewMonth - 1).toLocaleString(toDateLocale(locale), {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="card space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          aria-label="Previous month"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-truffle-muted hover:text-truffle-text hover:bg-truffle-surface transition-colors text-xl leading-none"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-sm font-medium text-truffle-text">{monthLabel}</p>
          {monthTotal > 0 && (
            <p className="text-[10px] text-truffle-muted mt-0.5">
              {formatAmount(monthTotal)} spent · max {formatAmount(maxSpend)}/day
            </p>
          )}
        </div>
        <button
          onClick={() => navigate(1)}
          disabled={isCurrentMonth}
          aria-label="Next month"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-truffle-muted hover:text-truffle-text hover:bg-truffle-surface transition-colors text-xl leading-none disabled:opacity-25 disabled:cursor-default"
        >
          ›
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Week-day headers */}
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className="h-5 flex items-center justify-center text-[10px] font-medium text-truffle-muted"
          >
            {d}
          </div>
        ))}

        {/* Day cells */}
        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} />

          const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const data = dayMap.get(dateStr)
          const bucket = heatBucket(data?.spend ?? 0, maxSpend)
          const isToday = dateStr === todayStr
          const isSelected = selectedDate === dateStr
          const isFuture = dateStr > todayStr

          return (
            <button
              key={dateStr}
              onClick={() => !isFuture && setSelectedDate(isSelected ? null : dateStr)}
              className={[
                'relative aspect-square rounded-lg flex items-center justify-center',
                'transition-all duration-150 select-none',
                HEAT_CLASS[bucket],
                isFuture
                  ? 'opacity-25 cursor-default'
                  : 'cursor-pointer hover:brightness-110 active:scale-95',
                isSelected
                  ? 'ring-2 ring-truffle-amber ring-offset-1 ring-offset-truffle-card'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span
                className={`text-[11px] font-medium leading-none ${
                  isToday ? 'text-truffle-amber' : 'text-truffle-text'
                }`}
              >
                {day}
              </span>
              {isToday && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-truffle-amber" />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-truffle-muted">Less</span>
        <div className="flex gap-1 flex-1 justify-center">
          {([0, 1, 2, 3, 4] as const).map((b) => (
            <div key={b} className={`w-5 h-3 rounded-sm ${HEAT_CLASS[b]}`} />
          ))}
        </div>
        <span className="text-[10px] text-truffle-muted">More</span>
      </div>

      {/* Selected-day detail panel
          Outer (key="detail"): slides open/closed only when selection appears or disappears.
          Inner (key={selectedDate}): cross-fades the content when the selected date changes,
          keeping the container stable so there's no collapse→re-expand on date switch. */}
      <AnimatePresence initial={false}>
        {selectedDate && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={selectedDate}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
                className="pt-3 border-t border-truffle-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-truffle-text">
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString(toDateLocale(locale), {
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                  {selectedData ? (
                    <p className="text-xs font-semibold text-truffle-text-secondary">
                      {formatAmount(selectedData.spend)} spent
                    </p>
                  ) : (
                    <p className="text-xs text-truffle-muted">No spending</p>
                  )}
                </div>

                {selectedData ? (
                  <div className="space-y-2">
                    {[...selectedData.txs]
                      .sort((a, b) => a.amount - b.amount)
                      .map((tx) => (
                        <div key={tx.id} className="flex items-center gap-2">
                          <span className="text-sm leading-none flex-shrink-0">
                            {CATEGORY_EMOJI[tx.category] ?? '📦'}
                          </span>
                          <span className="flex-1 text-xs text-truffle-muted truncate">
                            {tx.description}
                          </span>
                          <span className="text-xs text-red-400 flex-shrink-0 font-medium tabular-nums">
                            -{formatAmount(tx.amount)}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-xs text-truffle-muted">Nothing logged on this day.</p>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
