'use client'

import Image from 'next/image'
import { MEAL_SLOTS, type MealSlot } from '@sproutine/food/client'
import type { TodayLog } from '@/lib/mealApi'
import { useLanguage } from '@/contexts/LanguageContext'
import { Icon } from './Icon'
import { SLOT_ICONS } from './FoodDetailStep'

interface MealLogSectionProps {
  logs: TodayLog[] | null
  gentle: boolean
  dayKcal: { kcal: number; partial: boolean } | null
  onCopySlot: (slot: MealSlot) => void
  onAddToSlot: (slot: MealSlot) => void
  onToggleFavourite: (id: string) => void
  onRemoveLog: (id: string) => void
}

function EmptySlotRow({ slot, onAdd }: { slot: MealSlot; onAdd: () => void }) {
  const { t } = useLanguage()
  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label={t.search.addTo(t.meal.slots[slot])}
      className="flex min-h-[60px] w-full items-center gap-3 rounded-[18px] border-[1.5px] border-dashed border-sproutine-border-strong py-1.5 pr-1 pl-3.5 text-left"
    >
      <Icon name={SLOT_ICONS[slot]} size={22} className="text-sproutine-muted" />
      <span className="flex flex-1 flex-col leading-[1.3]">
        <span className="text-xs font-semibold tracking-[.05em] text-sproutine-muted uppercase">
          {t.meal.slots[slot]}
        </span>
        <span className="text-[15px] text-sproutine-text-secondary">{t.today.noMealLogged}</span>
      </span>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sproutine-surface text-sproutine-accent">
        <Icon name="add" size={20} />
      </span>
    </button>
  )
}

export function MealLogSection({
  logs,
  gentle,
  dayKcal,
  onCopySlot,
  onAddToSlot,
  onToggleFavourite,
  onRemoveLog,
}: MealLogSectionProps) {
  const { t } = useLanguage()
  const hasLogs = !!logs && logs.length > 0

  if (hasLogs) {
    return (
      <section className="space-y-3">
        {dayKcal && (
          <p className="text-[15px] text-sproutine-text-secondary">
            {t.meal.total}:{' '}
            <span className="font-semibold text-sproutine-text">
              {dayKcal.partial ? `${t.meal.atLeast} ` : ''}
              {Math.round(dayKcal.kcal)} {t.meal.kcal}
            </span>
          </p>
        )}
        {MEAL_SLOTS.map((slot) => {
          const inSlot = logs.filter((l) => l.slot === slot)
          if (!inSlot.length)
            return <EmptySlotRow key={slot} slot={slot} onAdd={() => onAddToSlot(slot)} />
          return (
            <div key={slot} className="card space-y-1 px-4 py-3">
              <div className="flex items-center justify-between">
                <h2 className="eyebrow">{t.meal.slots[slot]}</h2>
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onCopySlot(slot)}
                    aria-label={t.copy.repeatSlot(t.meal.slots[slot])}
                    className="icon-btn h-9 w-9 text-sproutine-accent"
                  >
                    <Icon name="repeat" size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddToSlot(slot)}
                    aria-label={t.search.addTo(t.meal.slots[slot])}
                    className="icon-btn h-9 w-9 text-sproutine-accent"
                  >
                    <Icon name="add" size={20} />
                  </button>
                </span>
              </div>
              <ul className="divide-y divide-sproutine-border">
                {inSlot.map((log) => (
                  <li key={log.id} className="flex items-start gap-2 py-2">
                    <ul className="min-w-0 flex-1 space-y-0.5">
                      {log.items.map((item, i) => (
                        <li key={i} className="flex gap-2 text-[15px] text-sproutine-text">
                          <span className="min-w-0 flex-1 truncate">{item.name}</span>
                          <span className="shrink-0 text-sproutine-text-secondary tabular-nums">
                            {Math.round(item.grams)} g
                          </span>
                        </li>
                      ))}
                      {!gentle && log.totals?.kcal != null && (
                        <li className="text-[13px] text-sproutine-muted">
                          {Math.round(log.totals.kcal)} {t.meal.kcal}
                        </li>
                      )}
                    </ul>
                    <button
                      type="button"
                      onClick={() => onToggleFavourite(log.id)}
                      aria-label="Favourite"
                      className="icon-btn -mt-1.5 h-10 w-10"
                    >
                      <Icon
                        name="favorite"
                        filled={!!log.isFavourite}
                        size={20}
                        className={log.isFavourite ? 'text-sproutine-accent' : ''}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveLog(log.id)}
                      aria-label={t.meal.removeMeal}
                      className="icon-btn -mt-1.5 h-10 w-10"
                    >
                      <Icon name="delete" size={20} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </section>
    )
  }

  if (logs) {
    return (
      <section className="space-y-3">
        <div className="card flex flex-col items-center gap-2.5 px-5 py-6 text-center">
          <Image
            src="/icons/sproutine.png"
            alt=""
            width={120}
            height={120}
            priority
            className="-mt-3.5 -mb-4"
          />
          <h2 className="font-display text-[22px] text-sproutine-text">{t.today.emptyTitle}</h2>
          <p className="max-w-[280px] text-[15px] leading-normal text-pretty text-sproutine-text-secondary">
            {t.today.emptyBody}
          </p>
        </div>
        {MEAL_SLOTS.map((slot) => (
          <EmptySlotRow key={slot} slot={slot} onAdd={() => onAddToSlot(slot)} />
        ))}
      </section>
    )
  }

  return null
}
