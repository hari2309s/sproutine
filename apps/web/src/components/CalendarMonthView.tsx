'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Icon } from './Icon'
import { fetchMonthSummary, type DaySummary } from '@/lib/calendarApi'

interface CalendarMonthViewProps {
  month: string
  onDayTap: (date: string) => void
  gentle: boolean
}

const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function todayIso() {
  return new Date().toLocaleDateString('sv-SE')
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y!, m! - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y!, m! - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

/** Build a 6-week calendar grid for the given month. */
function buildGrid(month: string): string[][] {
  const [y, m] = month.split('-').map(Number)
  const first = new Date(y!, m! - 1, 1)
  const startDay = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(start.getDate() - startDay)

  const weeks: string[][] = []
  const cursor = new Date(start)
  for (let w = 0; w < 6; w++) {
    const week: string[] = []
    for (let d = 0; d < 7; d++) {
      week.push(cursor.toLocaleDateString('sv-SE'))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

function isInMonth(date: string, month: string): boolean {
  return date.startsWith(month)
}

/** Find consecutive logged-day runs for streak band rendering. */
function streakRuns(days: Map<string, DaySummary>, week: string[]): boolean[] {
  return week.map((date) => days.get(date)?.logged === true)
}

// ── Dot component ──────────────────────────────────────────────────────────

function DayDots({ day, gentle }: { day: DaySummary | undefined; gentle: boolean }) {
  if (!day || !day.logged) return null
  if (gentle) {
    return (
      <span
        className="mx-auto h-[5px] w-[5px] rounded-full"
        style={{ backgroundColor: 'var(--t-green)' }}
      />
    )
  }
  const dots: { color: string; key: string }[] = [{ color: 'var(--t-green)', key: 'logged' }]
  if (day.waterGoalMet) dots.push({ color: 'var(--t-blue)', key: 'water' })
  if (day.goalsHit) dots.push({ color: 'var(--t-amber)', key: 'goals' })
  return (
    <span className="flex justify-center gap-[3px]">
      {dots.slice(0, 3).map(({ color, key }) => (
        <span
          key={key}
          className="h-[5px] w-[5px] rounded-full"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-7 gap-y-1">
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1 py-1.5">
          <span className="h-8 w-8 animate-pulse rounded-full bg-sproutine-surface" />
          <span
            className="h-[5px] w-[5px] animate-pulse rounded-full"
            style={{ backgroundColor: 'var(--t-border)' }}
          />
        </div>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function CalendarMonthView({ month, onDayTap, gentle }: CalendarMonthViewProps) {
  const [current, setCurrent] = useState(month)
  const [days, setDays] = useState<DaySummary[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (m: string) => {
    setLoading(true)
    try {
      const result = await fetchMonthSummary(m)
      setDays(result.days)
    } catch {
      setDays([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(current) }, [current, load])

  const today = todayIso()
  const grid = useMemo(() => buildGrid(current), [current])
  const dayMap = useMemo(() => {
    const m = new Map<string, DaySummary>()
    days.forEach((d) => m.set(d.date, d))
    return m
  }, [days])

  const totalLogged = days.filter((d) => d.logged).length
  const totalDays = days.filter((d) => d.date <= today).length
  const isNewUser = !loading && days.every((d) => !d.logged)
  const goToToday = () => setCurrent(today.slice(0, 7))

  return (
    <div className="space-y-3">
      {/* Month nav header */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setCurrent(shiftMonth(current, -1))} className="icon-btn">
          <Icon name="chevron_left" size={24} />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-display text-[20px] text-sproutine-text">{monthLabel(current)}</span>
          {current !== today.slice(0, 7) && (
            <button
              type="button"
              onClick={goToToday}
              className="rounded-full bg-sproutine-accent-soft px-2.5 py-0.5 text-[12px] font-semibold text-sproutine-accent"
            >
              Today
            </button>
          )}
        </div>
        <button type="button" onClick={() => setCurrent(shiftMonth(current, 1))} className="icon-btn">
          <Icon name="chevron_right" size={24} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 text-center">
        {DAY_HEADERS.map((d) => (
          <span key={d} className="text-[11px] font-semibold text-sproutine-muted">{d}</span>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <SkeletonGrid />
      ) : (
        <div className="space-y-0.5">
          {grid.map((week, wi) => {
            const runs = streakRuns(dayMap, week)
            return (
              <div key={wi} className="relative grid grid-cols-7">
                {/* Streak band behind consecutive logged days */}
                {runs.some(Boolean) && (
                  <div className="pointer-events-none absolute inset-0 grid grid-cols-7" aria-hidden>
                    {runs.map((on, i) => (
                      <span
                        key={i}
                        className={`h-full ${on ? 'bg-sproutine-green-light' : ''} ${
                          on && i > 0 && runs[i - 1] ? '' : on ? 'rounded-l-full' : ''
                        } ${on && i < 6 && runs[i + 1] ? '' : on ? 'rounded-r-full' : ''}`}
                      />
                    ))}
                  </div>
                )}
                {week.map((date) => {
                  const inMonth = isInMonth(date, current)
                  const isToday = date === today
                  const day = dayMap.get(date)
                  const isFuture = date > today
                  const isPast = date < today
                  const unloggedPast = isPast && inMonth && !day?.logged

                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => onDayTap(date)}
                      className="relative z-10 flex flex-col items-center gap-0.5 py-1.5 transition-colors"
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-semibold ${
                          isToday
                            ? 'ring-2 ring-sproutine-accent text-sproutine-accent'
                            : !inMonth
                              ? 'text-sproutine-muted opacity-40'
                              : unloggedPast
                                ? 'text-sproutine-muted'
                                : 'text-sproutine-text'
                        }`}
                      >
                        {parseInt(date.slice(8), 10)}
                      </span>
                      {isFuture && inMonth ? (
                        <Icon name="add" size={10} className="text-sproutine-muted opacity-40" />
                      ) : (
                        <DayDots day={day} gentle={gentle} />
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      {!loading && !isNewUser && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-1">
          <span className="flex items-center gap-1.5 text-[11px] text-sproutine-muted">
            <span className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: 'var(--t-green)' }} />
            Logged
          </span>
          {!gentle && (
            <>
              <span className="flex items-center gap-1.5 text-[11px] text-sproutine-muted">
                <span className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: 'var(--t-blue)' }} />
                Water goal
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-sproutine-muted">
                <span className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: 'var(--t-amber)' }} />
                Goals hit
              </span>
            </>
          )}
        </div>
      )}

      {/* Rosie summary or new user card */}
      {!loading && isNewUser ? (
        <div className="card flex flex-col items-center gap-3 px-4 py-5 text-center">
          <Image src="/icons/sproutine.png" alt="" width={56} height={56} />
          <p className="font-display text-[18px] text-sproutine-text">Your calendar is empty</p>
          <p className="text-[14px] text-sproutine-text-secondary">
            Start tracking to see your month at a glance.
          </p>
          <button type="button" onClick={() => onDayTap(today)} className="btn-primary mt-1 h-11 text-[14px]">
            Log your first meal
          </button>
        </div>
      ) : !loading && days.length > 0 ? (
        <div className="flex items-center gap-3 rounded-[18px] bg-sproutine-surface px-4 py-3">
          <Image src="/icons/sproutine.png" alt="" width={32} height={32} />
          <p className="text-[14px] text-sproutine-text-secondary">
            {gentle
              ? "You've been checking in regularly"
              : `${totalLogged} of ${totalDays} days so far`}
          </p>
        </div>
      ) : null}
    </div>
  )
}
