'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { BottomSheet } from './BottomSheet'
import { Icon } from './Icon'
import { fetchDayDetail, copyDay, type DayDetail } from '@/lib/calendarApi'

interface CalendarDaySheetProps {
  date: string
  onClose: () => void
  gentle: boolean
  onCopied?: () => void
}

function todayIso() {
  return new Date().toLocaleDateString('sv-SE')
}

function shiftDay(date: string, delta: number): string {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  return d.toLocaleDateString('sv-SE')
}

function formatDate(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function dateKicker(date: string, today: string): string {
  if (date === today) return 'Today'
  if (date < today) return 'Past day'
  return 'Planned'
}

// ── Water drops ────────────────────────────────────────────────────────────

function WaterDrops({ entries, gentle }: { entries: { id: string; ml: number }[]; gentle: boolean }) {
  const count = entries.length
  if (count === 0) return null
  return (
    <div className="flex items-center gap-1">
      {entries.map((e, i) => (
        <Icon
          key={e.id ?? i}
          name="water_drop"
          size={18}
          filled
          className="text-sproutine-blue"
        />
      ))}
      {!gentle && (
        <span className="ml-1 text-[12px] text-sproutine-muted">
          {count} glass{count !== 1 ? 'es' : ''}
        </span>
      )}
    </div>
  )
}

// ── Macro bar ──────────────────────────────────────────────────────────────

function MacroBar({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein + carbs + fat || 1
  const pPct = (protein / total) * 100
  const cPct = (carbs / total) * 100
  const fPct = (fat / total) * 100

  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded-full">
        <div style={{ width: `${pPct}%`, backgroundColor: 'var(--t-green)' }} />
        <div style={{ width: `${cPct}%`, backgroundColor: 'var(--t-amber)' }} />
        <div style={{ width: `${fPct}%`, backgroundColor: 'var(--t-muted)' }} />
      </div>
      <div className="flex gap-4">
        <span className="flex items-center gap-1.5 text-[12px] text-sproutine-text-secondary">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--t-green)' }} />
          {Math.round(protein)}g protein
        </span>
        <span className="flex items-center gap-1.5 text-[12px] text-sproutine-text-secondary">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--t-amber)' }} />
          {Math.round(carbs)}g carbs
        </span>
        <span className="flex items-center gap-1.5 text-[12px] text-sproutine-text-secondary">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--t-muted)' }} />
          {Math.round(fat)}g fat
        </span>
      </div>
    </div>
  )
}

// ── Meal slot card ─────────────────────────────────────────────────────────

function MealSlotCard({
  meal,
  onCopySlot,
}: {
  meal: DayDetail['meals'][number]
  onCopySlot: (slot: string) => void
}) {
  const kcal = meal.kcal

  return (
    <div className="rounded-[18px] border border-sproutine-border bg-sproutine-card px-4 py-3 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-sproutine-text-secondary capitalize">
          {meal.slot}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold tabular-nums text-sproutine-muted">
            {kcal} kcal
          </span>
          <button
            type="button"
            onClick={() => onCopySlot(meal.slot)}
            className="icon-btn h-8 w-8"
            aria-label={`Copy ${meal.slot}`}
          >
            <Icon name="content_copy" size={16} />
          </button>
        </div>
      </div>
      <ul className="mt-1.5 space-y-0.5">
        {meal.items.map((item, i) => (
          <li key={i} className="text-[14px] text-sproutine-text">{item.name}</li>
        ))}
      </ul>
    </div>
  )
}

// ── Planned meal card ──────────────────────────────────────────────────────

function PlannedMealCard({ slot, foods }: { slot: string; foods: string }) {
  return (
    <div className="rounded-[18px] border-[1.5px] border-dashed border-sproutine-accent bg-sproutine-card px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-semibold text-sproutine-text-secondary capitalize">{slot}</span>
        <span className="rounded-full bg-sproutine-accent-soft px-2 py-0.5 text-[10px] font-semibold text-sproutine-accent">
          Planned
        </span>
        <span className="flex-1" />
        <Icon name="drag_indicator" size={18} className="text-sproutine-muted" />
      </div>
      <p className="mt-1 text-[14px] text-sproutine-text">{foods}</p>
    </div>
  )
}

// ── Empty slot card ────────────────────────────────────────────────────────

function EmptySlotCard({ slot }: { slot: string }) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-[18px] border-[1.5px] border-dashed border-sproutine-border-strong px-4 py-3.5"
    >
      <span className="text-[14px] text-sproutine-muted capitalize">{slot} — Plan something?</span>
      <Icon name="add" size={20} className="text-sproutine-accent" />
    </button>
  )
}

// ── Toast overlay ──────────────────────────────────────────────────────────

function CopyToast({ message, onUndo, onDismiss }: { message: string; onUndo: () => void; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      className="absolute right-4 bottom-4 left-4 z-50 flex items-center justify-between rounded-full bg-sproutine-text px-4 py-2.5 shadow-lg"
    >
      <span className="text-[14px] font-medium text-sproutine-bg">{message}</span>
      <button type="button" onClick={onUndo} className="text-[14px] font-semibold text-sproutine-accent">
        Undo
      </button>
    </motion.div>
  )
}

// ── Main sheet ─────────────────────────────────────────────────────────────

export function CalendarDaySheet({ date, onClose, gentle, onCopied }: CalendarDaySheetProps) {
  const [current, setCurrent] = useState(date)
  const [detail, setDetail] = useState<DayDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  const today = todayIso()
  const isPast = current <= today
  const isFuture = current > today

  const load = useCallback(async (d: string) => {
    setLoading(true)
    try {
      setDetail(await fetchDayDetail(d))
    } catch {
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(current) }, [current, load])

  const handleCopySlot = async (slot: string) => {
    try {
      const copied = await copyDay(current, today, slot)
      if (copied > 0) {
        setToast(`Copied ${slot} to today`)
        onCopied?.()
      }
    } catch { /* silent */ }
  }

  const handleCopyDay = async () => {
    try {
      const copied = await copyDay(current, today)
      if (copied > 0) {
        setToast('Copied whole day to today')
        onCopied?.()
      }
    } catch { /* silent */ }
  }

  const kicker = dateKicker(current, today)
  const title = formatDate(current)
  const hasData = detail?.logged
  const hasPlans = detail?.plannedMeals && detail.plannedMeals.length > 0
  const FUTURE_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack']

  return (
    <BottomSheet title={title} onClose={onClose}>
      <div className="relative space-y-4">
        {/* Kicker + nav */}
        <div className="flex items-center justify-between">
          <span className="eyebrow">{kicker}</span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setCurrent(shiftDay(current, -1))} className="icon-btn h-8 w-8">
              <Icon name="chevron_left" size={20} />
            </button>
            <button type="button" onClick={() => setCurrent(shiftDay(current, 1))} className="icon-btn h-8 w-8">
              <Icon name="chevron_right" size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-[18px] bg-sproutine-surface" />
            <div className="h-16 animate-pulse rounded-[18px] bg-sproutine-surface" />
          </div>
        ) : isPast && hasData && detail ? (
          /* ── Past day with data ── */
          <>
            {!gentle && (
              <div className="card space-y-3 px-4 py-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-[28px] text-sproutine-text">{detail.kcal}</span>
                  <span className="text-[14px] text-sproutine-muted">kcal</span>
                </div>
                <MacroBar protein={detail.protein} carbs={detail.carbs} fat={detail.fat} />
              </div>
            )}

            <WaterDrops entries={detail.waterEntries} gentle={gentle} />

            <div className="space-y-2.5">
              {detail.meals.map((meal) => (
                <MealSlotCard key={meal.id} meal={meal} onCopySlot={handleCopySlot} />
              ))}
            </div>

            {current !== today && (
              <button type="button" onClick={handleCopyDay} className="btn-secondary w-full">
                <Icon name="content_copy" size={18} />
                Copy whole day to today
              </button>
            )}
          </>
        ) : isFuture ? (
          /* ── Future day ── */
          <>
            <div className="space-y-2.5">
              {hasPlans
                ? detail!.plannedMeals!.map((pm) => (
                    <PlannedMealCard key={pm.slot} slot={pm.slot} foods={pm.foods} />
                  ))
                : FUTURE_SLOTS.map((slot) => <EmptySlotCard key={slot} slot={slot} />)}
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1">
                <Icon name="content_copy" size={18} />
                Copy to...
              </button>
              <button type="button" className="btn-primary flex-1">
                <Icon name="edit_calendar" size={18} />
                Plan this day
              </button>
            </div>
          </>
        ) : (
          /* ── Nothing logged (empty past day) ── */
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Image src="/icons/sproutine.png" alt="" width={64} height={64} />
            <p className="font-display text-[18px] text-sproutine-text">No notes for this day</p>
            <p className="max-w-[260px] text-[14px] text-sproutine-text-secondary">
              {isPast
                ? "That's okay — not every day needs to be tracked."
                : 'You can plan meals ahead of time.'}
            </p>
            <button type="button" className="btn-primary mt-1 h-11 text-[14px]">
              <Icon name="add" size={18} />
              {isPast ? 'Add a meal for this day' : 'Plan a meal'}
            </button>
          </div>
        )}

        <AnimatePresence>
          {toast && (
            <CopyToast
              message={toast}
              onUndo={() => setToast(null)}
              onDismiss={() => setToast(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </BottomSheet>
  )
}
