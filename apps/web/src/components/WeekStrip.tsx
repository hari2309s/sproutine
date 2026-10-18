'use client'

import { useMemo } from 'react'
import { Icon } from './Icon'
import type { DaySummary } from '@/lib/calendarApi'

interface WeekStripProps {
  weekStart: string
  selectedDate: string
  onSelectDate: (date: string) => void
  gentle: boolean
  monthSummary: DaySummary[] | null
}

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function todayIso() {
  return new Date().toLocaleDateString('sv-SE')
}

function weekDates(weekStart: string): string[] {
  const dates: string[] = []
  const d = new Date(weekStart + 'T12:00:00')
  for (let i = 0; i < 7; i++) {
    dates.push(d.toLocaleDateString('sv-SE'))
    d.setDate(d.getDate() + 1)
  }
  return dates
}

// ── Kcal ring ──────────────────────────────────────────────────────────────

const RING_SIZE = 40
const STROKE = 3

function KcalRing({ date, progress, selected }: { date: number; progress: number; selected: boolean }) {
  const pct = Math.min(progress, 1) * 100

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: RING_SIZE, height: RING_SIZE }}
    >
      {/* Conic ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(var(--t-accent) 0 ${pct}%, var(--t-border) ${pct}% 100%)`,
        }}
      />
      {/* Inner circle */}
      <div
        className={`relative flex items-center justify-center rounded-full text-[13px] font-semibold ${
          selected
            ? 'bg-sproutine-accent text-sproutine-bg'
            : 'bg-sproutine-card text-sproutine-text'
        }`}
        style={{ width: RING_SIZE - STROKE * 2, height: RING_SIZE - STROKE * 2 }}
      >
        {date}
      </div>
    </div>
  )
}

// ── Future tile ────────────────────────────────────────────────────────────

function FutureTile({ date, selected }: { date: number; selected: boolean }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: RING_SIZE, height: RING_SIZE }}
    >
      <div
        className="absolute inset-0 rounded-full border-[1.5px] border-dashed border-sproutine-border-strong"
      />
      <div
        className={`relative flex items-center justify-center rounded-full text-[13px] font-semibold ${
          selected
            ? 'bg-sproutine-accent text-sproutine-bg'
            : 'text-sproutine-muted'
        }`}
        style={{ width: RING_SIZE - STROKE * 2, height: RING_SIZE - STROKE * 2 }}
      >
        {selected ? date : <Icon name="add" size={14} className="text-sproutine-muted" />}
      </div>
    </div>
  )
}

// ── Water dots ─────────────────────────────────────────────────────────────

function WaterDots({ waterMl, glassMl }: { waterMl: number; glassMl: number }) {
  // Each dot represents 2 glasses (glassMl * 2)
  const dotUnit = glassMl * 2
  const filled = Math.floor(waterMl / dotUnit)

  return (
    <div className="flex justify-center gap-[3px]">
      {Array.from({ length: 4 }).map((_, i) => (
        <span
          key={i}
          className="h-[5px] w-[5px] rounded-full"
          style={{
            backgroundColor: i < filled ? 'var(--t-blue)' : 'var(--t-border)',
          }}
        />
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function WeekStrip({
  weekStart,
  selectedDate,
  onSelectDate,
  gentle,
  monthSummary,
}: WeekStripProps) {
  const today = todayIso()
  const dates = useMemo(() => weekDates(weekStart), [weekStart])

  const dayMap = useMemo(() => {
    const m = new Map<string, DaySummary>()
    monthSummary?.forEach((d) => m.set(d.date, d))
    return m
  }, [monthSummary])

  // Assume 250ml per glass for water dot calculation
  const glassMl = 250

  return (
    <div className="flex gap-1">
      {dates.map((date, i) => {
        const day = dayMap.get(date)
        const selected = date === selectedDate
        const isFuture = date > today
        const dateNum = parseInt(date.slice(8), 10)

        // Kcal progress: assume a rough 2000 kcal goal for ring display
        const kcalGoal = 2000
        const progress = day ? day.kcal / kcalGoal : 0

        return (
          <button
            key={date}
            type="button"
            onClick={() => onSelectDate(date)}
            className={`flex flex-1 flex-col items-center gap-1 rounded-[16px] py-2 transition-colors ${
              selected
                ? 'border border-sproutine-accent bg-sproutine-card shadow-soft'
                : 'border border-transparent'
            }`}
          >
            {/* Weekday label */}
            <span className={`text-[11px] font-semibold ${
              selected ? 'text-sproutine-accent' : 'text-sproutine-muted'
            }`}>
              {WEEKDAY_LABELS[i]}
            </span>

            {/* Ring or future tile */}
            {gentle ? (
              /* Gentle: simple check/unfilled circle */
              <div
                className={`flex items-center justify-center rounded-full ${
                  selected
                    ? 'bg-sproutine-accent text-sproutine-bg'
                    : day?.logged
                      ? 'bg-sproutine-accent-soft text-sproutine-accent'
                      : 'bg-sproutine-surface text-sproutine-muted'
                }`}
                style={{ width: RING_SIZE, height: RING_SIZE }}
              >
                {day?.logged ? (
                  <Icon name="check" size={18} />
                ) : (
                  <span className="text-[13px] font-semibold">{dateNum}</span>
                )}
              </div>
            ) : isFuture ? (
              <FutureTile date={dateNum} selected={selected} />
            ) : (
              <KcalRing date={dateNum} progress={progress} selected={selected} />
            )}

            {/* Meal count badge */}
            {day && day.mealCount > 0 && !gentle && (
              <span className="rounded-full bg-sproutine-surface px-1.5 py-0.5 text-[10px] font-semibold text-sproutine-text-secondary">
                {day.mealCount}
              </span>
            )}

            {/* Water dots (non-gentle, non-future only) */}
            {!gentle && !isFuture && day && (
              <WaterDots waterMl={day.waterMl} glassMl={glassMl} />
            )}
          </button>
        )
      })}
    </div>
  )
}
