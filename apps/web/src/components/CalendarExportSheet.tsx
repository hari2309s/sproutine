'use client'

import { useState } from 'react'
import { BottomSheet } from './BottomSheet'
import { Icon } from './Icon'
import { Toggle } from './Toggle'

interface CalendarExportSheetProps {
  onClose: () => void
}

type Range = '7' | '14' | 'all'
type Format = 'file' | 'feed'

const RANGE_OPTIONS: { key: Range; label: string }[] = [
  { key: '7', label: 'Next 7 days' },
  { key: '14', label: '14 days' },
  { key: 'all', label: 'All planned' },
]

const SLOT_TIMES: { slot: string; label: string; time: string }[] = [
  { slot: 'breakfast', label: 'Breakfast', time: '08:00' },
  { slot: 'lunch', label: 'Lunch', time: '12:30' },
  { slot: 'dinner', label: 'Dinner', time: '19:00' },
  { slot: 'snack', label: 'Snack', time: 'All day' },
]

export function CalendarExportSheet({ onClose }: CalendarExportSheetProps) {
  const [range, setRange] = useState<Range>('7')
  const [format, setFormat] = useState<Format>('file')
  const [includeNutrition, setIncludeNutrition] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      if (format === 'file') {
        const res = await fetch(`/api/calendar/export?range=${range}&nutrition=${includeNutrition}`)
        if (!res.ok) return
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'sproutine-meals.ics'
        a.click()
        URL.revokeObjectURL(url)
        onClose()
      } else {
        // Live feed: open webcal link
        const res = await fetch('/api/calendar/feed')
        if (!res.ok) return
        const body = await res.json()
        if (body.token) {
          const feedUrl = `${window.location.origin}/api/calendar/feed/${body.token}`
          window.location.href = feedUrl.replace(/^https?:/, 'webcal:')
          onClose()
        }
      }
    } catch {
      /* silent */
    } finally {
      setExporting(false)
    }
  }

  return (
    <BottomSheet title="Add to calendar" onClose={onClose}>
      {/* Range chips */}
      <div className="mb-5">
        <p className="eyebrow mb-2">Date range</p>
        <div className="flex gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setRange(opt.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                range === opt.key
                  ? 'bg-sproutine-accent text-sproutine-bg'
                  : 'border border-sproutine-border bg-sproutine-card text-sproutine-text-secondary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Event times */}
      <div className="mb-5">
        <p className="eyebrow mb-2">Event times</p>
        <div className="card divide-y divide-sproutine-border px-4 shadow-none">
          {SLOT_TIMES.map((s) => (
            <div key={s.slot} className="flex items-center justify-between py-2.5">
              <span className="text-[15px] text-sproutine-text">{s.label}</span>
              <span className="rounded-full bg-sproutine-surface px-3 py-1 text-xs font-semibold tabular-nums text-sproutine-muted">
                {s.time}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Nutrition toggle */}
      <label className="mb-5 flex cursor-pointer items-center gap-3">
        <span className="flex-1 text-[15px] text-sproutine-text">Nutrition in event notes</span>
        <Toggle checked={includeNutrition} onChange={setIncludeNutrition} />
      </label>

      {/* Export format */}
      <div className="mb-5 space-y-2">
        <p className="eyebrow mb-2">Format</p>
        {([
          {
            key: 'file' as Format,
            title: 'One-time file',
            desc: '.ics snapshot you import once',
            icon: 'download' as const,
          },
          {
            key: 'feed' as Format,
            title: 'Live feed',
            desc: 'webcal link that stays in sync',
            icon: 'sync' as const,
          },
        ]).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setFormat(opt.key)}
            className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${
              format === opt.key
                ? 'border-sproutine-accent bg-sproutine-accent-soft'
                : 'border-sproutine-border bg-sproutine-card'
            }`}
          >
            <Icon
              name={opt.icon}
              size={22}
              className={format === opt.key ? 'text-sproutine-accent' : 'text-sproutine-muted'}
            />
            <div className="flex-1">
              <p className="text-[15px] font-semibold text-sproutine-text">{opt.title}</p>
              <p className="text-xs text-sproutine-muted">{opt.desc}</p>
            </div>
            <Icon
              name={format === opt.key ? 'radio_button_checked' : 'radio_button_unchecked'}
              filled={format === opt.key}
              size={22}
              className={format === opt.key ? 'text-sproutine-accent' : 'text-sproutine-muted'}
            />
          </button>
        ))}
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="btn-primary w-full"
      >
        <Icon name={format === 'file' ? 'download' : 'sync'} size={20} />
        {exporting
          ? 'Preparing...'
          : format === 'file'
            ? 'Create calendar file'
            : 'Subscribe to feed'}
      </button>
    </BottomSheet>
  )
}
