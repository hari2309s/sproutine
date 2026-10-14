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
  onSaved?: (meal: SavedMeal) => void
  /** Called on "Not now"; without it the card collapses to a "Not saved" note. */
  onDiscard?: () => void
}

const parseGrams = (g: string) => {
  const n = Number(g.replace(',', '.'))
  return Number.isFinite(n) && n > 0 && n <= MAX_ITEM_GRAMS ? n : null
}

/**
 * The confirm step of meal logging: matched foods with editable grams. Totals
 * here are only a preview; the server recomputes them from the foods table
 * when saving. Nothing is stored until Save.
 */
export function MealLogCard({
  proposal,
  safetyMode,
  traceId,
  fromChat = false,
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

  const kcalLabel =
    preview?.totals.kcal != null
      ? `${preview.partial.includes('kcal') ? `${t.meal.atLeast} ` : ''}${preview.totals.kcal} ${t.meal.kcal}`
      : null
  const macros = preview
    ? (['protein', 'carbs', 'fat'] as const)
        .filter((k) => preview.totals[k] != null)
        .map((k) => `${Math.round(preview.totals[k]!)} g ${t.meal[k]}`)
    : []

  return (
    <section className="card flex w-full max-w-[420px] flex-col gap-3 self-start p-4">
      <div role="radiogroup" aria-label={t.meal.mealLabel} className="flex flex-wrap gap-1.5">
        {MEAL_SLOTS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={slot === s}
            onClick={() => setSlot(s)}
            className={`h-9 rounded-full px-3 text-sm ${
              slot === s
                ? 'bg-sproutine-accent font-semibold text-sproutine-bg'
                : 'bg-sproutine-surface font-medium text-sproutine-text-secondary hover:text-sproutine-text'
            }`}
          >
            {t.meal.slots[s]}
          </button>
        ))}
      </div>

      <ul className="flex flex-col divide-y divide-sproutine-border">
        {items.map((it, i) => {
          if (it.removed) return null
          const food = it.options[it.selected]
          if (!food) {
            return (
              <li key={i} className="flex items-center gap-2 py-2.5 text-sm text-sproutine-muted">
                <Icon name="search_off" size={18} />
                {t.meal.notFound.replace('{name}', it.query)}
              </li>
            )
          }
          const gramsInvalid = parseGrams(it.grams) == null
          return (
            <li key={i} className="flex flex-col gap-1.5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-sproutine-text">
                    {food.name}
                  </span>
                  {food.brand && (
                    <span className="block truncate text-[13px] text-sproutine-muted">
                      {food.brand}
                    </span>
                  )}
                </span>
                <label className="flex items-center gap-1">
                  <span className="sr-only">
                    {t.meal.gramsOf} {food.name}
                  </span>
                  <input
                    inputMode="decimal"
                    value={it.grams}
                    onChange={(e) => update(i, { grams: e.target.value.replace(/[^\d.,]/g, '') })}
                    aria-invalid={gramsInvalid}
                    className={`field h-10 w-[72px] px-2 text-right tabular-nums ${
                      gramsInvalid ? 'border-sproutine-red' : ''
                    }`}
                  />
                  <span className="text-sm text-sproutine-text-secondary">g</span>
                </label>
                <button
                  type="button"
                  onClick={() => update(i, { removed: true })}
                  aria-label={`${t.meal.remove} ${food.name}`}
                  className="icon-btn h-10 w-10"
                >
                  <Icon name="close" size={20} />
                </button>
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
            </li>
          )
        })}
      </ul>

      {!safetyMode && kcalLabel && (
        <p className="text-sm text-sproutine-text">
          <span className="font-semibold">
            {t.meal.total}: {kcalLabel}
          </span>
          {macros.length > 0 && (
            <span className="text-sproutine-text-secondary"> · {macros.join(' · ')}</span>
          )}
        </p>
      )}
      <p className="text-[13px] text-sproutine-muted">{t.meal.estimateNote}</p>
      {error && (
        <p role="alert" className="text-sm font-medium text-sproutine-red">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!valid || status === 'saving'}
          className="btn-primary h-11 flex-1"
        >
          {status === 'saving' ? t.meal.saving : t.meal.save}
        </button>
        <button
          type="button"
          onClick={() => (onDiscard ? onDiscard() : setStatus('discarded'))}
          disabled={status === 'saving'}
          className="btn-ghost h-11 px-4"
        >
          {t.meal.notNow}
        </button>
      </div>
    </section>
  )
}
