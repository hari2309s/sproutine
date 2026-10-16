'use client'

import { useCallback, useEffect, useState } from 'react'
import { Icon } from './Icon'
import { useLanguage } from '@/contexts/LanguageContext'
import type { MealSlot, Nutrients } from '@sproutine/food/client'

interface QuickItem {
  id: string
  slot: MealSlot
  items: { name: string; brand: string | null; grams: number; source: string; sourceId: string }[]
  totals: Nutrients
  eatenAt: string
  isFavourite: boolean
}

interface QuickAddSectionProps {
  gentle: boolean
  onReplay: (item: QuickItem) => void
}

export function QuickAddSection({ gentle, onReplay }: QuickAddSectionProps) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const [items, setItems] = useState<QuickItem[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/meals/quick')
      if (!res.ok) return
      const body = await res.json()
      setItems([...(body.favourites ?? []), ...(body.recents ?? [])])
      setLoaded(true)
    } catch {
      /* silent */
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (!loaded || items.length === 0) return null

  const favCount = items.filter((i) => i.isFavourite).length

  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-1"
      >
        <Icon name="bolt" size={18} className="text-sproutine-accent" />
        <span className="flex-1 text-left text-[15px] font-semibold text-sproutine-text">
          {t.quickAdd.title}
        </span>
        {favCount > 0 && (
          <span className="rounded-full bg-sproutine-accent-soft px-2 py-0.5 text-xs font-semibold text-sproutine-accent">
            {favCount}
          </span>
        )}
        <Icon
          name={expanded ? 'expand_less' : 'expand_more'}
          size={22}
          className="text-sproutine-text-secondary"
        />
      </button>

      {expanded && (
        <div className="scroll-fade-x -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {items.map((item) => {
            const names = item.items.map((i) => i.name)
            const label = names.length > 2
              ? `${names.slice(0, 2).join(', ')} +${names.length - 2}`
              : names.join(', ')
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onReplay(item)}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-sproutine-border bg-sproutine-card px-3 py-2 text-[13px] font-medium text-sproutine-text transition-colors hover:bg-sproutine-surface"
              >
                {item.isFavourite && (
                  <Icon name="favorite" filled size={14} className="text-sproutine-accent" />
                )}
                <span className="max-w-[180px] truncate">{label}</span>
                {!gentle && item.totals?.kcal != null && (
                  <span className="text-sproutine-muted">{Math.round(item.totals.kcal)}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
