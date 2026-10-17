'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { AppColumn } from './AppColumn'
import { BottomNav } from './BottomNav'
import { TopBar } from './TopBar'
import { PageEnter } from './PageMotion'
import { Icon } from './Icon'
import { WeightChart } from './WeightChart'
import { WeightLogSheet } from './WeightLogSheet'
import { useLanguage } from '@/contexts/LanguageContext'

interface WeightEntry {
  id: string
  weightKg: number
  loggedAt: string
}

type Range = '30' | '90' | 'all'

function todayIso() {
  return new Date().toLocaleDateString('sv-SE')
}

export function BodyPage({ userId, name: _name }: { userId: string; name: string }) {
  const { t, locale } = useLanguage()
  const [entries, setEntries] = useState<WeightEntry[] | null>(null)
  const [range, setRange] = useState<Range>('30')
  const [showLog, setShowLog] = useState(false)

  // Empty-state inline form
  const [inlineWeight, setInlineWeight] = useState('')
  const [inlineDate, setInlineDate] = useState(todayIso)
  const [inlineSaving, setInlineSaving] = useState(false)

  const daysParam = range === 'all' ? 3650 : Number(range)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/weight?days=${daysParam}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = (await res.json()) as { entries: WeightEntry[] }
      setEntries(body.entries)
    } catch (e) {
      console.warn('[BodyPage] load failed:', e)
      setEntries((prev) => prev ?? [])
    }
  }, [daysParam])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = async (id: string) => {
    setEntries((prev) => prev?.filter((e) => e.id !== id) ?? null)
    try {
      const res = await fetch('/api/weight', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        // Revert on failure
        void load()
      }
    } catch {
      void load()
    }
  }

  const handleInlineSave = async () => {
    const kg = parseFloat(inlineWeight)
    if (!kg || kg < 20 || kg > 400) return
    setInlineSaving(true)
    try {
      const res = await fetch('/api/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weightKg: kg, loggedAt: inlineDate }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setInlineWeight('')
      setInlineDate(todayIso())
      void load()
    } catch (e) {
      console.warn('[BodyPage] inline save failed:', e)
    } finally {
      setInlineSaving(false)
    }
  }

  const fmtDate = (iso: string) =>
    new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString(
      locale === 'en' ? 'en-GB' : locale,
      { day: 'numeric', month: 'short', year: 'numeric' }
    )

  const sorted = entries ? [...entries].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)) : []
  const hasEntries = sorted.length > 0

  // Stats
  const current = sorted[0]?.weightKg ?? null
  const start = sorted.length > 0 ? sorted[sorted.length - 1]?.weightKg ?? null : null
  const change = current != null && start != null ? current - start : null

  const rangeOptions: { id: Range; label: string }[] = [
    { id: '30', label: t.body.days30 },
    { id: '90', label: t.body.days90 },
    { id: 'all', label: t.body.all },
  ]

  const lastEntry = sorted[0] ?? null

  return (
    <AppColumn>
      <TopBar userId={userId} />

      <PageEnter className="flex min-h-0 flex-1 flex-col">
        <main className="relative min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pt-3 pb-24">
          {/* Header */}
          <div className="space-y-0.5">
            <h1 className="font-display text-[32px] leading-tight text-sproutine-text">
              {t.body.title}
            </h1>
            <p className="flex items-center gap-1 text-[13px] text-sproutine-text-secondary">
              <Icon name="lock" size={14} />
              {t.body.private}
            </p>
          </div>

          {entries === null ? (
            // Loading skeleton
            <div className="h-48 animate-pulse rounded-[22px] bg-sproutine-surface" aria-hidden />
          ) : !hasEntries ? (
            // Empty state
            <>
              <div className="card space-y-4 px-4 py-4">
                <div className="flex items-center gap-2">
                  <Icon name="monitor_weight" size={20} className="text-sproutine-accent" />
                  <h2 className="font-semibold text-[15px] text-sproutine-text">{t.body.logWeight}</h2>
                </div>

                <div className="space-y-3">
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="0.0"
                      value={inlineWeight}
                      onChange={(e) => setInlineWeight(e.target.value)}
                      className="w-full rounded-2xl border-2 border-sproutine-accent bg-transparent py-3 pr-14 pl-4 font-display text-[32px] text-sproutine-text placeholder:text-sproutine-border-strong outline-none focus:shadow-[0_0_0_4px_var(--color-sproutine-accent-soft)]"
                      style={{ fontFamily: 'var(--font-display, serif)' }}
                      aria-label={t.body.weight}
                    />
                    <span className="pointer-events-none absolute right-4 text-base font-medium text-sproutine-muted">
                      kg
                    </span>
                  </div>

                  <input
                    type="date"
                    value={inlineDate}
                    onChange={(e) => setInlineDate(e.target.value)}
                    aria-label={t.body.date}
                    className="w-full rounded-2xl border border-sproutine-border bg-sproutine-surface px-4 py-3 text-[15px] text-sproutine-text outline-none focus:border-sproutine-accent focus:shadow-[0_0_0_3px_var(--color-sproutine-accent-soft)]"
                  />

                  <button
                    type="button"
                    onClick={handleInlineSave}
                    disabled={inlineSaving || !inlineWeight}
                    className="btn-primary h-12 w-full rounded-full text-[15px]"
                  >
                    {t.body.save}
                  </button>
                </div>
              </div>

              {/* Rosie hint */}
              <div className="flex flex-col items-center gap-2 px-2 text-center">
                <Image
                  src="/icons/sproutine.png"
                  alt=""
                  width={80}
                  height={80}
                  className="-mb-1"
                  priority
                />
                <p className="max-w-[280px] text-[14px] leading-normal text-sproutine-text-secondary text-pretty">
                  {t.body.emptyHint}
                </p>
              </div>
            </>
          ) : (
            // With entries
            <>
              {/* Range tabs */}
              <div
                role="group"
                aria-label="Date range"
                className="flex gap-1 rounded-full bg-sproutine-surface p-1"
              >
                {rangeOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={range === opt.id}
                    onClick={() => setRange(opt.id)}
                    className={`h-9 flex-1 rounded-full text-sm ${
                      range === opt.id
                        ? 'bg-sproutine-card font-semibold text-sproutine-text shadow-soft'
                        : 'font-medium text-sproutine-text-secondary hover:text-sproutine-text'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Chart card */}
              <div className="card rounded-[24px] px-4 py-4 shadow-soft space-y-2">
                <p className="text-[13px] font-semibold text-sproutine-text-secondary">
                  {t.body.weight}, kg
                </p>
                <WeightChart
                  entries={sorted.map((e) => ({ date: e.loggedAt.slice(0, 10), weightKg: e.weightKg }))}
                  locale={locale}
                />
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: t.body.current, value: current != null ? `${current}` : '–' },
                  { label: t.body.start, value: start != null ? `${start}` : '–' },
                  {
                    label: t.body.change,
                    value: change != null ? `${Math.abs(change).toFixed(1)}` : '–',
                    icon:
                      change != null
                        ? change < 0
                          ? 'arrow_downward'
                          : 'arrow_upward'
                        : undefined,
                  },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="card flex flex-col items-center gap-0.5 px-3 py-3">
                    <p className="text-[11px] font-medium text-sproutine-muted">{label}</p>
                    <div className="flex items-center gap-0.5">
                      {icon && (
                        <Icon
                          name={icon as 'arrow_downward' | 'arrow_upward'}
                          size={16}
                          className="text-sproutine-text-secondary"
                        />
                      )}
                      <p className="font-display text-[22px] text-sproutine-text">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent entries */}
              <div className="card px-4 py-3 space-y-0.5">
                <h2 className="eyebrow mb-1">{t.body.recent}</h2>
                <ul className="divide-y divide-sproutine-border">
                  {sorted.slice(0, 20).map((entry) => (
                    <li key={entry.id} className="flex items-center gap-2 py-2.5">
                      <span className="flex-1 text-[14px] text-sproutine-text-secondary">
                        {fmtDate(entry.loggedAt)}
                      </span>
                      <span className="font-display text-[18px] text-sproutine-text tabular-nums">
                        {entry.weightKg} kg
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        aria-label="Delete entry"
                        className="icon-btn h-9 w-9 text-sproutine-muted"
                      >
                        <Icon name="delete" size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </main>

        {/* FAB — only when there are entries */}
        {hasEntries && (
          <div className="pointer-events-none absolute right-5 bottom-[88px] z-10">
            <button
              type="button"
              onClick={() => setShowLog(true)}
              className="pointer-events-auto flex items-center gap-2 rounded-full bg-sproutine-accent px-5 py-3 text-[15px] font-semibold text-sproutine-bg shadow-lg"
            >
              <Icon name="add" size={20} />
              {t.body.logWeight}
            </button>
          </div>
        )}
      </PageEnter>

      <BottomNav active="body" />

      <AnimatePresence>
        {showLog && (
          <WeightLogSheet
            lastEntry={lastEntry}
            onClose={() => setShowLog(false)}
            onSaved={() => { setShowLog(false); void load() }}
          />
        )}
      </AnimatePresence>
    </AppColumn>
  )
}
