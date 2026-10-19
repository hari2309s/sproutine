'use client'

import { useMemo, useState } from 'react'
import {
  MAX_ITEM_GRAMS,
  MEAL_SLOTS,
  portionOptions,
  scaleNutrients,
  type MealSlot,
} from '@sproutine/food/client'
import { useLanguage } from '@/contexts/LanguageContext'
import { logPickedFood, type PickedFood } from '@/lib/foodSearchApi'
import { Icon } from './Icon'
import { SourceBadge } from './FoodResultRow'
import type { IconName } from '@/lib/icons'

export const SLOT_ICONS: Record<MealSlot, IconName> = {
  breakfast: 'wb_twilight',
  lunch: 'light_mode',
  dinner: 'dark_mode',
  snack: 'nutrition',
}

const MIN_GRAMS = 5
const STEP = 10

function fmt(v: number | null, unit: string): string {
  if (v == null) return '–'
  return `${v < 10 ? Math.round(v * 10) / 10 : Math.round(v)}${unit}`
}

interface FoodDetailStepProps {
  food: PickedFood
  initialSlot: MealSlot
  gentle: boolean
  onBack: () => void
  onSaved: (slot: MealSlot) => void
}

export function FoodDetailStep({
  food,
  initialSlot,
  gentle,
  onBack,
  onSaved,
}: FoodDetailStepProps) {
  const { t } = useLanguage()
  const options = useMemo(() => portionOptions(food), [food])
  const [grams, setGrams] = useState(options[0]?.grams ?? 100)
  const [slot, setSlot] = useState<MealSlot>(initialSlot)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  const n = scaleNutrients(food.per100g, grams)
  const nudge = (delta: number) =>
    setGrams((g) =>
      Math.min(MAX_ITEM_GRAMS, Math.max(MIN_GRAMS, Math.round((g + delta) / STEP) * STEP))
    )

  const save = async () => {
    setSaving(true)
    setError(false)
    const ok = await logPickedFood(food, grams, slot).catch(() => false)
    setSaving(false)
    if (ok) onSaved(slot)
    else setError(true)
  }

  return (
    <div className="flex min-h-[55dvh] flex-col gap-4">
      <div className="-ml-2 flex items-start gap-1">
        <button
          type="button"
          onClick={onBack}
          aria-label={t.search.back}
          className="icon-btn h-11 w-11 shrink-0"
        >
          <Icon name="arrow_back" size={24} />
        </button>
        <div className="flex min-w-0 flex-col gap-1 pt-1">
          <h3 className="font-display text-[26px] leading-[1.1] text-sproutine-text">
            {food.name}
          </h3>
          <span className="flex flex-wrap items-center gap-1.5 text-[13px] text-sproutine-text-secondary">
            <SourceBadge source={food.source} />
            {food.brand ?? t.search.sourcesLong[food.source]}
          </span>
        </div>
      </div>

      {gentle ? (
        <div className="flex items-start gap-2.5 rounded-[18px] bg-sproutine-surface px-3.5 py-3">
          <Icon name="spa" size={20} className="shrink-0 text-sproutine-green" />
          <p className="text-sm leading-normal text-sproutine-text-secondary">
            {t.search.gentleNote}
          </p>
        </div>
      ) : (
        <section className="flex flex-col gap-2.5">
          <h4 className="eyebrow">{t.search.howMuch}</h4>
          <div className="card flex items-center justify-between p-3 shadow-none">
            <button
              type="button"
              onClick={() => nudge(-STEP)}
              disabled={grams <= MIN_GRAMS}
              aria-label={t.search.less}
              className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-[1.5px] border-sproutine-border-strong disabled:opacity-40"
            >
              <Icon name="remove" size={24} />
            </button>
            <label className="flex items-baseline gap-1">
              <input
                type="number"
                inputMode="numeric"
                min={MIN_GRAMS}
                max={MAX_ITEM_GRAMS}
                value={grams}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (Number.isFinite(v))
                    setGrams(Math.min(MAX_ITEM_GRAMS, Math.max(0, Math.round(v))))
                }}
                onBlur={() => setGrams((g) => Math.max(MIN_GRAMS, g))}
                aria-label={t.search.howMuch}
                className="bg-transparent text-right font-display text-[44px] leading-none text-sproutine-text outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                style={{ width: `${Math.max(2, String(grams).length) + 0.4}ch` }}
              />
              <span className="text-base text-sproutine-text-secondary">g</span>
            </label>
            <button
              type="button"
              onClick={() => nudge(STEP)}
              disabled={grams >= MAX_ITEM_GRAMS}
              aria-label={t.search.more}
              className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-[1.5px] border-sproutine-border-strong disabled:opacity-40"
            >
              <Icon name="add" size={24} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {options.map((o) => {
              const on = grams === o.grams
              return (
                <button
                  key={`${o.unit}-${o.count}`}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setGrams(o.grams)}
                  className={`flex min-h-11 items-center gap-1 rounded-full px-3.5 text-sm whitespace-nowrap ${
                    on
                      ? 'border-[1.5px] border-sproutine-accent bg-sproutine-accent-soft pl-2.5 font-semibold text-sproutine-text'
                      : 'border border-sproutine-border-strong font-medium text-sproutine-text'
                  }`}
                >
                  {on && <Icon name="check" size={16} className="text-sproutine-accent" />}
                  {t.search.portion(o.unit, o.count)}
                  {o.unit !== 'g' && <span className="text-sproutine-muted">· {o.grams} g</span>}
                </button>
              )
            })}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <h4 className="eyebrow">{t.search.whichMeal}</h4>
        <div role="radiogroup" aria-label={t.search.whichMeal} className="grid grid-cols-4 gap-1.5">
          {MEAL_SLOTS.map((s) => {
            const on = s === slot
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setSlot(s)}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl text-xs ${
                  on
                    ? 'border-[1.5px] border-sproutine-accent bg-sproutine-accent-soft font-bold text-sproutine-text'
                    : 'border border-sproutine-border-strong font-medium text-sproutine-text-secondary'
                }`}
              >
                <Icon name={SLOT_ICONS[s]} size={20} />
                {t.meal.slots[s]}
              </button>
            )
          })}
        </div>
      </section>

      {!gentle && (
        <div className="grid grid-cols-4 gap-1 rounded-[18px] bg-sproutine-surface px-3.5 py-3">
          {(
            [
              [fmt(n.kcal, ''), t.goals.kcal],
              [fmt(n.protein, ' g'), t.goals.protein],
              [fmt(n.carbs, ' g'), t.goals.carbs],
              [fmt(n.fat, ' g'), t.goals.fat],
            ] as const
          ).map(([v, l]) => (
            <span key={l} className="flex flex-col">
              <span className="font-display text-xl text-sproutine-text">{v}</span>
              <span className="text-xs text-sproutine-text-secondary">{l}</span>
            </span>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-sproutine-accent">
          {t.search.saveFailed}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving || grams < MIN_GRAMS}
        className="btn-primary mt-auto h-14 w-full text-[17px]"
      >
        <Icon name="check" size={20} />
        {saving ? t.search.saving : t.search.save(t.meal.slots[slot])}
      </button>
    </div>
  )
}
