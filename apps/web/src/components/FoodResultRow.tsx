'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import type { PickSource, PickedFood } from '@/lib/foodSearchApi'
import { Icon } from './Icon'

export function SourceBadge({ source }: { source: PickSource }) {
  const { t } = useLanguage()
  return (
    <span
      className={`flex h-[22px] shrink-0 items-center rounded-full border border-sproutine-border px-2 text-[11px] font-bold whitespace-nowrap ${
        source === 'bls'
          ? 'bg-sproutine-green-light text-sproutine-green'
          : 'bg-sproutine-surface text-sproutine-text-secondary'
      }`}
    >
      {t.search.sources[source]}
    </span>
  )
}

export function FoodResultRow({
  food,
  sub,
  gentle,
  first,
  onPick,
}: {
  food: PickedFood
  sub: string | null
  gentle: boolean
  first: boolean
  onPick: () => void
}) {
  const { t } = useLanguage()
  const kcal = food.per100g.kcal
  return (
    <li className={first ? '' : 'border-t border-sproutine-border'}>
      <button
        type="button"
        onClick={onPick}
        aria-label={t.search.pick(food.name)}
        className="flex min-h-[68px] w-full items-center gap-2.5 py-2 pr-2 pl-3.5 text-left hover:bg-sproutine-surface/60"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1 leading-[1.3]">
          <span className="text-[15px] font-semibold text-sproutine-text">{food.name}</span>
          <span className="flex min-w-0 items-center gap-2 text-xs text-sproutine-text-secondary">
            <SourceBadge source={food.source} />
            {sub && <span className="min-w-0 truncate">{sub}</span>}
          </span>
        </span>
        {!gentle && kcal != null && (
          <span className="flex shrink-0 flex-col items-end leading-[1.2]">
            <span className="text-sm font-semibold text-sproutine-text tabular-nums">
              {Math.round(kcal)}
            </span>
            <span className="text-[11px] text-sproutine-muted">{t.search.per100}</span>
          </span>
        )}
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-sproutine-border-strong text-sproutine-accent"
        >
          <Icon name="add" size={22} />
        </span>
      </button>
    </li>
  )
}
