'use client'

import { useState } from 'react'
import {
  computeNutrients,
  MAX_ITEM_GRAMS,
  MEAL_SLOTS,
  roundForDisplay,
  type FoodRecord,
  type MealLogProposal,
  type MealSlot,
} from '@sproutine/food/client'
import { Icon } from './Icon'
import { useLanguage } from '@/contexts/LanguageContext'

interface ItemState {
  query: string
  options: FoodRecord[]
  selected: number
  grams: string
  removed: boolean
  showOptions: boolean
}

export interface SavedMeal {
  slot: MealSlot
  names: string[]
}

interface MealLogCardProps {
  proposal: MealLogProposal
  /** Gentle mode: no numbers, only foods and amounts. */
  safetyMode: boolean
  traceId?: string
  /** Shown in chat: the server adds a "Saved to …" line to history. */
  fromChat?: boolean
  /** Photo-based: show dashed gram borders and ≈ prefix on numbers. */
  isEstimate?: boolean
  onSaved?: (meal: SavedMeal) => void
  /** Called on "Not now"; without it the card collapses to a "Not saved" note. */
  onDiscard?: () => void
}

const parseGrams = (g: string) => {
  const n = Number(g.replace(',', '.'))
  return Number.isFinite(n) && n > 0 && n <= MAX_ITEM_GRAMS ? n : null
}

/**
 * 2a "Kitchen Table" meal card — recipe-card feel with surface header strip,
 * editable food list, serif macro totals, and pill buttons.
 */
export function MealLogCard({
  proposal,
  safetyMode,
  traceId,
  fromChat = false,
  isEstimate = false,
  onSaved,
  onDiscard,
}: MealLogCardProps) {
  const { t } = useLanguage()
  const [slot, setSlot] = useState<MealSlot>(proposal.slot)
  const [items, setItems] = useState<ItemState[]>(() =>
    proposal.items.map((i) => ({
      query: i.query,
      options: i.match ? [i.match, ...i.alternatives] : [],
      selected: 0,
      grams: String(i.grams),
      removed: false,
      showOptions: false,
    }))
  )
  const [status, setStatus] = useState<'editing' | 'saving' | 'saved' | 'discarded'>('editing')
  const [error, setError] = useState<string | null>(null)
  const [createdAt] = useState(() => new Date())

  const update = (index: number, patch: Partial<ItemState>) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))

  const chosen = items
    .filter((it) => !it.removed && it.options.length > 0)
    .map((it) => ({ food: it.options[it.selected]!, grams: parseGrams(it.grams) }))
  const valid = chosen.length > 0 && chosen.every((c) => c.grams != null)

  const preview = (() => {
    if (!valid) return null
    const { totals, partial } = computeNutrients(
      chosen.map((c) => ({ food: c.food, grams: c.grams! }))
    )
    return { totals: roundForDisplay(totals), partial }
  })()

  const save = async () => {
    if (!valid || status === 'saving') return
    setStatus('saving')
    setError(null)
    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot,
          source: proposal.source,
          items: chosen.map((c) => ({
            source: c.food.source,
            sourceId: c.food.sourceId,
            grams: c.grams,
          })),
          eatenAt: new Date().toISOString(),
          ...(traceId ? { traceId } : {}),
          fromChat,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStatus('saved')
      onSaved?.({ slot, names: chosen.map((c) => c.food.name) })
    } catch (e) {
      console.warn('[meal] save failed:', e)
      setStatus('editing')
      setError(t.meal.saveFailed)
    }
  }

  if (status === 'saved' || status === 'discarded') {
    return (
      <div className="flex items-center gap-2 self-start rounded-full bg-sproutine-surface px-3.5 py-2 text-sm font-medium text-sproutine-text-secondary">
        <Icon
          name={status === 'saved' ? 'check_circle' : 'close'}
          size={18}
          className={status === 'saved' ? 'text-sproutine-accent' : undefined}
        />
        {status === 'saved'
          ? t.meal.savedTo.replace('{slot}', t.meal.slots[slot].toLowerCase())
          : t.meal.notSaved}
      </div>
    )
  }

  const timeStr = createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <section className="w-full overflow-hidden rounded-[24px] border border-sproutine-border bg-sproutine-card shadow-soft">
      {/* ── Header strip ── */}
      <div className="flex items-center gap-2 bg-sproutine-surface px-4 py-2.5">
        <Icon name="restaurant" size={20} className="text-sproutine-accent" />
        <span className="text-[15px] font-semibold">{t.meal.slots[slot]}</span>
        <span className="text-[13px] text-sproutine-muted">{timeStr}</span>
        <span className="flex-1" />
        {/* Slot selector as a compact Edit button — tapping opens the slot pills */}
        <button
          type="button"
          onClick={() => {
            const nextIdx = (MEAL_SLOTS.indexOf(slot) + 1) % MEAL_SLOTS.length
            setSlot(MEAL_SLOTS[nextIdx]!)
          }}
          className="rounded-full px-2.5 py-1 text-sm font-semibold text-sproutine-accent"
        >
          {t.meal.editSlot}
        </button>
      </div>

      {/* ── Estimate note ── */}
      {isEstimate && (
        <div className="flex items-center gap-1.5 px-4 pt-2.5 text-[13px] text-sproutine-text-secondary">
          <Icon name="photo_camera" size={16} />
          {t.chat.estimatedPortions}
        </div>
      )}

      {/* ── Food items ── */}
      <div className="flex flex-col px-4 py-0.5">
        {items.map((it, i) => {
          if (it.removed) return null
          const food = it.options[it.selected]
          if (!food) {
            return (
              <div key={i} className="flex items-center gap-2 py-2.5 text-sm text-sproutine-muted">
                <Icon name="search_off" size={18} />
                {t.meal.notFound.replace('{name}', it.query)}
              </div>
            )
          }
          const gramsInvalid = parseGrams(it.grams) == null
          return (
            <div
              key={i}
              className={`flex flex-col gap-1.5 py-3 ${
                i < items.length - 1 && !items[i + 1]?.removed
                  ? 'border-b border-sproutine-border'
                  : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">{food.name}</span>
                  {food.brand && (
                    <span className="block text-[13px] text-sproutine-text-secondary">
                      {food.brand}
                    </span>
                  )}
                </span>
                <label
                  className={`flex h-10 w-[88px] items-center justify-between rounded-xl bg-sproutine-bg px-3 text-[15px] font-semibold ${
                    gramsInvalid
                      ? 'border-[1.5px] border-sproutine-red'
                      : isEstimate
                        ? 'border-[1.5px] border-dashed border-sproutine-border-strong'
                        : 'border border-sproutine-border-strong'
                  }`}
                >
                  <span className="sr-only">
                    {t.meal.gramsOf} {food.name}
                  </span>
                  <input
                    inputMode="decimal"
                    value={it.grams}
                    onChange={(e) => update(i, { grams: e.target.value.replace(/[^\d.,]/g, '') })}
                    aria-invalid={gramsInvalid}
                    className="w-full bg-transparent text-right tabular-nums focus:outline-none"
                  />
                  <span className="ml-1 font-normal text-sproutine-muted">g</span>
                </label>
                {items.filter((x) => !x.removed).length > 1 && (
                  <button
                    type="button"
                    onClick={() => update(i, { removed: true })}
                    aria-label={`${t.meal.remove} ${food.name}`}
                    className="icon-btn h-10 w-10"
                  >
                    <Icon name="close" size={20} />
                  </button>
                )}
              </div>
              {it.options.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => update(i, { showOptions: !it.showOptions })}
                    aria-expanded={it.showOptions}
                    className="self-start text-[13px] font-semibold text-sproutine-accent"
                  >
                    {t.meal.notThisOne}
                  </button>
                  {it.showOptions && (
                    <div className="flex flex-col gap-1">
                      {it.options.map((option, oi) =>
                        oi === it.selected ? null : (
                          <button
                            key={`${option.source}:${option.sourceId}`}
                            type="button"
                            onClick={() => update(i, { selected: oi, showOptions: false })}
                            className="rounded-xl bg-sproutine-surface px-3 py-2 text-left text-sm text-sproutine-text hover:bg-sproutine-accent-soft"
                          >
                            {option.name}
                            {option.brand && (
                              <span className="text-sproutine-muted"> · {option.brand}</span>
                            )}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Macro totals: serif style ── */}
      {!safetyMode && preview && (
        <div className="grid grid-cols-4 border-t border-sproutine-border px-4 py-3">
          {preview.totals.kcal != null && (
            <span className="flex flex-col">
              <span className="font-display text-xl">{isEstimate ? '≈' : ''}{preview.totals.kcal}</span>
              <span className="text-xs text-sproutine-text-secondary">{t.meal.kcal}</span>
            </span>
          )}
          {preview.totals.protein != null && (
            <span className="flex flex-col">
              <span className="font-display text-xl">{isEstimate ? '≈' : ''}{Math.round(preview.totals.protein)} g</span>
              <span className="text-xs text-sproutine-text-secondary">{t.meal.protein}</span>
            </span>
          )}
          {preview.totals.carbs != null && (
            <span className="flex flex-col">
              <span className="font-display text-xl">{isEstimate ? '≈' : ''}{Math.round(preview.totals.carbs)} g</span>
              <span className="text-xs text-sproutine-text-secondary">{t.meal.carbs}</span>
            </span>
          )}
          {preview.totals.fat != null && (
            <span className="flex flex-col">
              <span className="font-display text-xl">{isEstimate ? '≈' : ''}{Math.round(preview.totals.fat)} g</span>
              <span className="text-xs text-sproutine-text-secondary">{t.meal.fat}</span>
            </span>
          )}
        </div>
      )}

      {/* ── Estimate note ── */}
      {!safetyMode && (
        <p className="px-4 pb-2 text-[13px] text-sproutine-muted">{t.meal.estimateNote}</p>
      )}

      {error && (
        <p role="alert" className="px-4 pb-2 text-sm font-medium text-sproutine-red">
          {error}
        </p>
      )}

      {/* ── Action buttons ── */}
      <div className="flex gap-2 px-3 pb-3">
        <button
          type="button"
          onClick={() => (onDiscard ? onDiscard() : setStatus('discarded'))}
          disabled={status === 'saving'}
          className="h-12 rounded-full px-[18px] font-semibold text-[15px] text-sproutine-text-secondary"
        >
          {t.meal.notNow}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!valid || status === 'saving'}
          className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-sproutine-accent text-[15px] font-semibold text-sproutine-bg disabled:bg-sproutine-surface disabled:text-sproutine-muted"
        >
          <Icon name="check" size={20} />
          {status === 'saving' ? t.meal.saving : t.meal.save}
        </button>
      </div>
    </section>
  )
}
