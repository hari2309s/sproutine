'use client'

import { useCallback, useEffect, useState } from 'react'
import { Icon } from './Icon'

interface RecentMeal {
  id: string
  slot: string
  items: { name: string; grams: number }[]
  eatenAt: string
}

interface MealPlanTabRecentProps {
  slot: string
  onSelect: (meal: any) => void
}

export function MealPlanTabRecent({ slot, onSelect }: MealPlanTabRecentProps) {
  const [meals, setMeals] = useState<RecentMeal[] | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/meals/recent?days=14&slot=${encodeURIComponent(slot)}`)
      if (!res.ok) return setMeals([])
      const body = await res.json()
      setMeals(body.meals ?? [])
    } catch {
      setMeals([])
    }
  }, [slot])

  useEffect(() => { void load() }, [load])

  if (meals === null) {
    return <p className="py-8 text-center text-sm text-sproutine-muted">Loading recent meals...</p>
  }

  if (meals.length === 0) {
    return (
      <div className="py-8 text-center">
        <Icon name="history" size={32} className="mx-auto mb-2 text-sproutine-muted" />
        <p className="text-sm text-sproutine-text-secondary">No recent meals found.</p>
      </div>
    )
  }

  const slotLabel = slot.charAt(0).toUpperCase() + slot.slice(1)
  const matching = meals.filter((m) => m.slot === slot)
  const others = meals.filter((m) => m.slot !== slot)

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  const renderRow = (meal: RecentMeal) => {
    const mealName = meal.items.map((i) => i.name).join(', ')
    return (
      <div
        key={meal.id}
        className="flex items-center gap-3 py-2.5"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-sproutine-text">{mealName}</p>
          <p className="text-xs text-sproutine-muted">{formatDate(meal.eatenAt)}</p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(meal)}
          aria-label={`Add ${mealName}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sproutine-accent text-sproutine-accent transition-colors hover:bg-sproutine-accent-soft"
        >
          <Icon name="add" size={20} />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {matching.length > 0 && (
        <div>
          <h4 className="eyebrow mb-1">{slotLabel}s &middot; last 14 days</h4>
          <div className="divide-y divide-sproutine-border">{matching.map(renderRow)}</div>
        </div>
      )}
      {others.length > 0 && (
        <div>
          <h4 className="eyebrow mb-1">From other slots</h4>
          <div className="divide-y divide-sproutine-border">{others.map(renderRow)}</div>
        </div>
      )}
    </div>
  )
}
