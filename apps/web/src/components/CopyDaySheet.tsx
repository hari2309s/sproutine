'use client'

import { useMemo, useState } from 'react'
import { BottomSheet } from './BottomSheet'
import { Icon } from './Icon'

interface CopyDaySheetProps {
  fromDate: string
  meals: { slot: string; foods: string }[]
  onClose: () => void
  onCopied: () => void
}

type Preset = 'next-week' | 'rest-of-week' | 'every-day'
type ConflictMode = 'empty-only' | 'replace'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function weekDays(startOffset: number): Date[] {
  const today = new Date()
  const dayOfWeek = (today.getDay() + 6) % 7 // Mon=0
  const monday = new Date(today)
  monday.setDate(today.getDate() - dayOfWeek + startOffset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export function CopyDaySheet({ fromDate, meals, onClose, onCopied }: CopyDaySheetProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [preset, setPreset] = useState<Preset | null>(null)
  const [conflictMode, setConflictMode] = useState<ConflictMode>('empty-only')
  const [submitting, setSubmitting] = useState(false)

  const fromLabel = new Date(`${fromDate}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const thisWeek = useMemo(() => weekDays(0), [])
  const nextWeek = useMemo(() => weekDays(1), [])

  const mealSummary = meals.map((m) => m.foods).join(' \u00B7 ')

  const handlePreset = (p: Preset) => {
    const today = new Date()
    const todayStr = isoDate(today)
    setPreset(p)
    const days = new Set<string>()
    if (p === 'next-week') {
      nextWeek.slice(0, 5).forEach((d) => days.add(isoDate(d)))
    } else if (p === 'rest-of-week') {
      thisWeek.filter((d) => isoDate(d) > todayStr).forEach((d) => days.add(isoDate(d)))
    } else if (p === 'every-day') {
      ;[...thisWeek, ...nextWeek]
        .filter((d) => isoDate(d) > todayStr && isoDate(d) !== fromDate)
        .forEach((d) => days.add(isoDate(d)))
    }
    days.delete(fromDate)
    setSelected(days)
  }

  const toggleDay = (iso: string) => {
    if (iso === fromDate) return
    setPreset(null)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(iso)) next.delete(iso)
      else next.add(iso)
      return next
    })
  }

  const handleCopy = async () => {
    if (selected.size === 0 || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/calendar/copy-day-multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromDate,
          toDates: [...selected],
          conflictMode,
        }),
      })
      if (res.ok) {
        onCopied()
        onClose()
      }
    } catch {
      /* silent */
    } finally {
      setSubmitting(false)
    }
  }

  const renderWeek = (days: Date[], label: string) => (
    <div key={label}>
      <p className="eyebrow mb-2">{label}</p>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const iso = isoDate(d)
          const isSource = iso === fromDate
          const isSelected = selected.has(iso)
          return (
            <button
              key={iso}
              type="button"
              onClick={() => toggleDay(iso)}
              disabled={isSource}
              className={`flex h-11 flex-col items-center justify-center rounded-xl text-xs font-semibold transition-colors ${
                isSource
                  ? 'border-2 border-dashed border-sproutine-accent bg-sproutine-accent-soft text-sproutine-accent'
                  : isSelected
                    ? 'bg-sproutine-accent text-sproutine-bg'
                    : 'border border-sproutine-border text-sproutine-text-secondary hover:bg-sproutine-surface'
              }`}
            >
              <span className="text-[10px] leading-none">{DAY_NAMES[i]}</span>
              <span>{d.getDate()}</span>
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <BottomSheet title="Copy this day to..." onClose={onClose}>
      <p className="text-sm text-sproutine-muted -mt-1 mb-1">From {fromLabel}</p>
      <p className="mb-4 text-sm text-sproutine-text-secondary">
        {meals.length} planned meal{meals.length !== 1 ? 's' : ''}: {mealSummary}
      </p>

      {/* Presets */}
      <div className="-mx-5 mb-4 overflow-x-auto scroll-fade-x px-5">
        <div className="flex gap-2">
          {([
            { key: 'next-week' as Preset, label: 'Next week, Mon\u2013Fri' },
            { key: 'rest-of-week' as Preset, label: 'Rest of this week' },
            { key: 'every-day' as Preset, label: 'Every day' },
          ]).map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => handlePreset(p.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                preset === p.key
                  ? 'bg-sproutine-accent text-sproutine-bg'
                  : 'border border-sproutine-border bg-sproutine-card text-sproutine-text-secondary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Week grids */}
      <div className="space-y-4 mb-5">
        {renderWeek(thisWeek, 'This week')}
        {renderWeek(nextWeek, 'Next week')}
      </div>

      {/* Conflict mode */}
      <div className="mb-5 space-y-2">
        {([
          { key: 'empty-only' as ConflictMode, label: 'Only fill empty slots' },
          { key: 'replace' as ConflictMode, label: "Replace what\u2019s already planned" },
        ]).map((opt) => (
          <label key={opt.key} className="flex cursor-pointer items-center gap-3 py-1">
            <Icon
              name={conflictMode === opt.key ? 'radio_button_checked' : 'radio_button_unchecked'}
              filled={conflictMode === opt.key}
              size={22}
              className={conflictMode === opt.key ? 'text-sproutine-accent' : 'text-sproutine-muted'}
            />
            <span className="text-[15px] text-sproutine-text">{opt.label}</span>
          </label>
        ))}
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleCopy}
        disabled={selected.size === 0 || submitting}
        className="btn-primary w-full"
      >
        {submitting
          ? 'Copying...'
          : `Copy to ${selected.size} day${selected.size !== 1 ? 's' : ''}`}
      </button>
    </BottomSheet>
  )
}
