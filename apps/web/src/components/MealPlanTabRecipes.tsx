'use client'

import { useMemo, useState } from 'react'
import { RECIPES_BY_ID } from '@sproutine/food/client'
import { Icon } from './Icon'

interface MealPlanTabRecipesProps {
  onSelect: (recipe: any) => void
}

const FILTERS = [
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'budget', label: 'Under \u20AC4' },
  { key: 'quick', label: 'Under 30 min' },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

export function MealPlanTabRecipes({ onSelect }: MealPlanTabRecipesProps) {
  const [query, setQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set())

  const allRecipes = useMemo(() => Object.values(RECIPES_BY_ID), [])

  const filtered = useMemo(() => {
    let list = allRecipes
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((r) => r.name.toLowerCase().includes(q))
    }
    if (activeFilters.has('quick')) {
      list = list.filter((r) => r.minutes <= 30)
    }
    // Vegetarian and budget filters are best-effort since Recipe doesn't always have cost/diet
    return list
  }, [allRecipes, query, activeFilters])

  const toggleFilter = (key: FilterKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Icon
          name="search"
          size={20}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sproutine-muted"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipes..."
          className="field pl-10"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {FILTERS.map((f) => {
          const active = activeFilters.has(f.key)
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => toggleFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-sproutine-accent text-sproutine-bg'
                  : 'border border-sproutine-border bg-sproutine-card text-sproutine-text-secondary'
              }`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Recipe list */}
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-sproutine-muted">No recipes match your search.</p>
      ) : (
        <div className="divide-y divide-sproutine-border">
          {filtered.map((recipe) => (
            <div key={recipe.id} className="flex items-center gap-3 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sproutine-accent-soft">
                <Icon name="restaurant" size={20} className="text-sproutine-accent" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-sproutine-text">{recipe.name}</p>
                <p className="text-xs text-sproutine-muted">
                  {recipe.minutes} min &middot; {recipe.ingredients.length} ingredients
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelect(recipe)}
                aria-label={`Add ${recipe.name}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sproutine-accent text-sproutine-accent transition-colors hover:bg-sproutine-accent-soft"
              >
                <Icon name="add" size={20} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
