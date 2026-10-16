'use client'

import { useCallback, useEffect, useState } from 'react'
import type { MealSlot, Nutrients } from '@sproutine/food/client'
import { BottomSheet } from './BottomSheet'
import { Icon } from './Icon'
import { useLanguage } from '@/contexts/LanguageContext'
import { copyMeal } from '@/lib/mealApi'

interface YesterdayMeal {
  id: string
  slot: MealSlot
  items: { name: string; brand: string | null; grams: number; source: string; sourceId: string }[]
  totals: Nutrients
  eatenAt: string
}

interface MealCopySheetProps {
  slot: MealSlot
  onClose: () => void
  onCopy: (meal: YesterdayMeal) => void
}

export function MealCopySheet({ slot, onClose, onCopy }: MealCopySheetProps) {
  const { t } = useLanguage()
  const [meals, setMeals] = useState<YesterdayMeal[] | null>(null)
  const [copying, setCopying] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/meals/yesterday?slot=${slot}`)
      if (!res.ok) return setMeals([])
      const body = await res.json()
      setMeals(body.meals ?? [])
    } catch {
      setMeals([])
    }
  }, [slot])

  useEffect(() => { void load() }, [load])

  const handleCopy = async (meal: YesterdayMeal) => {
    setCopying(meal.id)
    try {
      const ok = await copyMeal(
        meal.slot,
        meal.items.map((i) => ({ source: i.source, sourceId: i.sourceId, grams: i.grams }))
      )
      if (ok) {
        onCopy(meal)
        onClose()
      }
    } catch {
      /* silent */
    } finally {
      setCopying(null)
    }
  }

  return (
    <BottomSheet title={t.copy.title} onClose={onClose}>
      {meals === null ? (
        <p className="py-8 text-center text-sm text-sproutine-muted">{t.states.loading}</p>
      ) : meals.length === 0 ? (
        <p className="py-8 text-center text-sm text-sproutine-text-secondary">
          {t.copy.noYesterday}
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-sproutine-text-secondary">{t.copy.subtitle}</p>
          {meals.map((meal) => (
            <button
              key={meal.id}
              type="button"
              onClick={() => handleCopy(meal)}
              disabled={copying !== null}
              className="card flex w-full items-center gap-3 p-3 text-left shadow-none transition-colors hover:bg-sproutine-surface disabled:opacity-50"
            >
              <div className="flex-1 space-y-1">
                {meal.items.map((item, i) => (
                  <div key={i} className="flex gap-2 text-[15px]">
                    <span className="min-w-0 flex-1 truncate text-sproutine-text">{item.name}</span>
                    <span className="shrink-0 text-sproutine-text-secondary tabular-nums">
                      {Math.round(item.grams)} g
                    </span>
                  </div>
                ))}
              </div>
              <Icon
                name={copying === meal.id ? 'check' : 'content_copy'}
                size={20}
                className="shrink-0 text-sproutine-accent"
              />
            </button>
          ))}
        </div>
      )}
    </BottomSheet>
  )
}
