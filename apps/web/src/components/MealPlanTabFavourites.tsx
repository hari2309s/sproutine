'use client'

import { useCallback, useEffect, useState } from 'react'
import { Icon } from './Icon'

interface FavouriteItem {
  id: string
  slot: string
  items: { name: string; brand: string | null; grams: number; source: string; sourceId: string }[]
  isFavourite: boolean
}

interface MealPlanTabFavouritesProps {
  onSelect: (meal: { slot: string; items: any[] }) => void
}

export function MealPlanTabFavourites({ onSelect }: MealPlanTabFavouritesProps) {
  const [favourites, setFavourites] = useState<FavouriteItem[] | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/meals/quick')
      if (!res.ok) return setFavourites([])
      const body = await res.json()
      setFavourites(body.favourites ?? [])
    } catch {
      setFavourites([])
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (favourites === null) {
    return <p className="py-8 text-center text-sm text-sproutine-muted">Loading favourites...</p>
  }

  if (favourites.length === 0) {
    return (
      <div className="py-8 text-center">
        <Icon name="favorite" size={32} className="mx-auto mb-2 text-sproutine-muted" />
        <p className="text-sm text-sproutine-text-secondary">No favourites yet.</p>
        <p className="mt-1 text-xs text-sproutine-muted">
          Tap the heart on any logged meal to save it here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-sproutine-muted">Tap a meal to add it as a plan</p>
      <div className="grid grid-cols-2 gap-3">
        {favourites.map((fav) => {
          const foodList = fav.items.map((i) => i.name).join(', ')
          return (
            <button
              key={fav.id}
              type="button"
              onClick={() => onSelect({ slot: fav.slot, items: fav.items })}
              className="card flex flex-col items-start gap-2 p-3 text-left shadow-none transition-colors hover:bg-sproutine-surface"
            >
              <div className="flex w-full items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sproutine-accent-soft">
                  <Icon name="restaurant" size={18} className="text-sproutine-accent" />
                </span>
                <Icon name="favorite" filled size={16} className="text-sproutine-accent" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-sproutine-text">
                  {fav.items[0]?.name ?? 'Meal'}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-sproutine-muted">{foodList}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
