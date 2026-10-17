'use client'

import { useState } from 'react'
import { BottomSheet } from './BottomSheet'
import { useLanguage } from '@/contexts/LanguageContext'

interface WeightEntry {
  id: string
  weightKg: number
  loggedAt: string
}

interface WeightLogSheetProps {
  lastEntry: WeightEntry | null
  onClose: () => void
  onSaved: () => void
}

function todayIso() {
  return new Date().toLocaleDateString('sv-SE')
}

export function WeightLogSheet({ lastEntry, onClose, onSaved }: WeightLogSheetProps) {
  const { t, locale } = useLanguage()
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(todayIso)
  const [saving, setSaving] = useState(false)

  const lastDate = lastEntry
    ? new Date(`${lastEntry.loggedAt.slice(0, 10)}T12:00:00`).toLocaleDateString(
        locale === 'en' ? 'en-GB' : locale,
        { day: 'numeric', month: 'short' }
      )
    : null

  const handleSave = async () => {
    const kg = parseFloat(weight)
    if (!kg || kg < 20 || kg > 400) return
    setSaving(true)
    try {
      const res = await fetch('/api/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weightKg: kg, loggedAt: date }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      onSaved()
    } catch (e) {
      console.warn('[WeightLogSheet] save failed:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet title={t.body.logWeight} onClose={onClose}>
      <div className="space-y-5">
        {/* Weight input */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-sproutine-text-secondary" htmlFor="wls-weight">
            {t.body.weight}
          </label>
          <div className="relative flex items-center">
            <input
              id="wls-weight"
              type="number"
              inputMode="decimal"
              placeholder="0.0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full rounded-2xl border-2 border-sproutine-accent bg-transparent py-3 pr-14 pl-4 font-display text-[32px] text-sproutine-text placeholder:text-sproutine-border-strong outline-none focus:shadow-[0_0_0_4px_var(--color-sproutine-accent-soft)]"
              style={{ fontFamily: 'var(--font-display, serif)' }}
            />
            <span className="pointer-events-none absolute right-4 text-base font-medium text-sproutine-muted">
              kg
            </span>
          </div>
          {lastEntry && lastDate && (
            <p className="text-[13px] text-sproutine-muted">
              {t.body.lastEntry(String(lastEntry.weightKg), lastDate)}
            </p>
          )}
        </div>

        {/* Date input */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-sproutine-text-secondary" htmlFor="wls-date">
            {t.body.date}
          </label>
          <input
            id="wls-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-2xl border border-sproutine-border bg-sproutine-surface px-4 py-3 text-[15px] text-sproutine-text outline-none focus:border-sproutine-accent focus:shadow-[0_0_0_3px_var(--color-sproutine-accent-soft)]"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-full border border-sproutine-border bg-sproutine-surface text-[15px] font-semibold text-sproutine-text"
          >
            {t.body.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !weight}
            className="btn-primary h-12 flex-1 text-[15px]"
          >
            {t.body.save}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
