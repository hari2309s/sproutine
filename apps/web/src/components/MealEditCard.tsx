'use client'

import { useState } from 'react'
import { MEAL_SLOTS, type MealSlot } from '@sproutine/food/client'
import { Icon } from './Icon'
import { useLanguage } from '@/contexts/LanguageContext'

export interface MealEditAction {
  type: 'move' | 'delete'
  mealId: string
  mealName: string
  mealTime: string
  currentSlot: MealSlot
  suggestedSlot?: MealSlot
}

interface MealEditCardProps {
  action: MealEditAction
  onDone?: () => void
}

/**
 * Compact card for moving a meal's slot or deleting it.
 * Design: 2a Kitchen Table — edit icon circle, slot pills, Cancel/Update buttons.
 */
export function MealEditCard({ action, onDone }: MealEditCardProps) {
  const { t } = useLanguage()
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>(
    action.suggestedSlot ?? action.currentSlot
  )
  const [status, setStatus] = useState<'editing' | 'saving' | 'done'>('editing')
  const [error, setError] = useState<string | null>(null)

  if (action.type === 'delete') {
    return <MealDeleteCard action={action} onDone={onDone} />
  }

  const handleUpdate = async () => {
    if (status === 'saving' || selectedSlot === action.currentSlot) return
    setStatus('saving')
    setError(null)
    try {
      const res = await fetch(`/api/meals/${action.mealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot: selectedSlot }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStatus('done')
      onDone?.()
    } catch {
      setStatus('editing')
      setError(t.meal.saveFailed)
    }
  }

  const handleUndo = async () => {
    try {
      await fetch(`/api/meals/${action.mealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot: action.currentSlot }),
      })
      setStatus('editing')
      setSelectedSlot(action.currentSlot)
    } catch {
      // Undo failed — user can still correct manually
    }
  }

  // ── Done state: compact receipt ──
  if (status === 'done') {
    return (
      <div className="flex min-h-14 items-center gap-2.5 rounded-[20px] border border-sproutine-border bg-sproutine-card py-1.5 pr-1.5 pl-3.5">
        <Icon name="check_circle" size={22} className="text-sproutine-accent" filled />
        <span className="flex flex-1 flex-col leading-snug">
          <span className="text-[15px] font-semibold">
            {t.meal.movedTo.replace('{slot}', t.meal.slots[selectedSlot])}
          </span>
          <span className="text-[13px] text-sproutine-text-secondary">
            <span className="line-through">{t.meal.slots[action.currentSlot]}</span>
            {' · '}
            {action.mealName}
          </span>
        </span>
        <button
          type="button"
          onClick={handleUndo}
          className="flex h-11 items-center rounded-full px-3.5 text-sm font-semibold text-sproutine-accent"
        >
          {t.meal.undo}
        </button>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-sproutine-border bg-sproutine-card p-3.5 shadow-soft">
      <div className="flex flex-col gap-3">
        {/* ── Meal being edited ── */}
        <div className="flex items-center gap-3 px-0.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sproutine-accent-soft text-sproutine-accent">
            <Icon name="edit" size={20} />
          </span>
          <span className="flex flex-col leading-snug">
            <span className="text-[15px] font-semibold">{action.mealName}</span>
            <span className="text-[13px] text-sproutine-text-secondary">
              Logged today, {action.mealTime}
            </span>
          </span>
        </div>

        {/* ── Slot change visualization ── */}
        <div className="flex items-center gap-2.5 px-0.5">
          <span className="flex h-9 items-center rounded-full bg-sproutine-surface px-3.5 text-[15px] text-sproutine-text-secondary line-through">
            {t.meal.slots[action.currentSlot]}
          </span>
          <Icon name="arrow_forward" size={22} className="text-sproutine-muted" />
          <span className="flex h-9 items-center gap-1 rounded-full bg-sproutine-accent px-3.5 text-[15px] font-semibold text-sproutine-bg">
            <Icon name="check" size={18} />
            {t.meal.slots[selectedSlot]}
          </span>
        </div>

        {/* ── Slot picker ── */}
        <div className="flex flex-col gap-1.5 border-t border-sproutine-border pt-2.5">
          <span className="px-0.5 text-xs font-semibold uppercase tracking-wide text-sproutine-muted">
            {t.meal.orPickAnother}
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {MEAL_SLOTS.map((slot) => {
              const isOld = slot === action.currentSlot
              const isSelected = slot === selectedSlot
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => !isOld && setSelectedSlot(slot)}
                  disabled={isOld}
                  className={`flex h-11 items-center justify-center rounded-full text-[13px] font-medium ${
                    isSelected
                      ? 'border-[1.5px] border-sproutine-accent bg-sproutine-accent-soft font-bold'
                      : isOld
                        ? 'border border-dashed border-sproutine-border-strong text-sproutine-muted line-through'
                        : 'border border-sproutine-border-strong'
                  }`}
                >
                  {t.meal.slots[slot]}
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-sproutine-red">{error}</p>
        )}

        {/* ── Action buttons ── */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDone}
            disabled={status === 'saving'}
            className="h-12 rounded-full px-[18px] text-[15px] font-semibold text-sproutine-text-secondary"
          >
            {t.chat.cancel}
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            disabled={selectedSlot === action.currentSlot || status === 'saving'}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-sproutine-accent text-[15px] font-semibold text-sproutine-bg disabled:bg-sproutine-surface disabled:text-sproutine-muted"
          >
            <Icon name="check" size={20} />
            {t.meal.update}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Delete confirmation card — soft berry tint, Keep as easy as Delete. */
function MealDeleteCard({ action, onDone }: MealEditCardProps) {
  const { t } = useLanguage()
  const [status, setStatus] = useState<'confirming' | 'deleting' | 'deleted'>('confirming')

  const handleDelete = async () => {
    setStatus('deleting')
    try {
      const res = await fetch(`/api/meals/${action.mealId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStatus('deleted')
      onDone?.()
    } catch {
      setStatus('confirming')
    }
  }

  if (status === 'deleted') {
    return (
      <div className="flex items-center gap-2 self-start rounded-full bg-sproutine-surface px-3.5 py-2 text-sm font-medium text-sproutine-text-secondary">
        <Icon name="check_circle" size={18} className="text-sproutine-accent" />
        {t.meal.deleted}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-sproutine-border bg-sproutine-card p-3.5 shadow-soft">
      <div className="flex flex-col gap-3">
        {/* ── Meal being deleted ── */}
        <div className="flex items-center gap-3 px-0.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sproutine-surface text-sproutine-text-secondary">
            <Icon name="nutrition" size={20} />
          </span>
          <span className="flex flex-col leading-snug">
            <span className="text-[15px] font-semibold">
              {t.meal.slots[action.currentSlot]} · {action.mealTime}
            </span>
            <span className="text-[13px] text-sproutine-text-secondary">{action.mealName}</span>
          </span>
        </div>

        {/* ── Action buttons ── */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDone}
            disabled={status === 'deleting'}
            className="flex h-12 flex-1 items-center justify-center rounded-full border-[1.5px] border-sproutine-border-strong text-[15px] font-semibold"
          >
            {t.meal.keep}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={status === 'deleting'}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-red-50 text-[15px] font-semibold text-red-600 dark:bg-red-950/30 dark:text-red-400"
          >
            <Icon name="delete" size={20} />
            {t.meal.deleteMeal}
          </button>
        </div>
      </div>
    </div>
  )
}
