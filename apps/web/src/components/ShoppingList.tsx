'use client'

import { AISLES, type buildShoppingList } from '@sproutine/food/client'
import { useLanguage } from '@/contexts/LanguageContext'

const euro = (cents: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)

const grams = (g: number) => (g >= 1000 ? `${(g / 1000).toLocaleString('en-GB')} kg` : `${g} g`)

interface ShoppingListProps {
  shopping: ReturnType<typeof buildShoppingList>
  ticked: Set<string>
  toggle: (id: string) => void
}

export function ShoppingList({ shopping, ticked, toggle }: ShoppingListProps) {
  const { t } = useLanguage()

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[15px] font-semibold text-sproutine-text">
          {t.week.estimateTotal(euro(shopping.totalCents))}
        </p>
        <p className="text-[13px] text-sproutine-muted">{t.week.estimateNote}</p>
      </div>
      {AISLES.filter((a) => shopping.items.some((i) => i.aisle === a)).map((aisle) => (
        <div key={aisle} className="card px-4 py-3">
          <h2 className="eyebrow mb-1">{t.week.aisles[aisle]}</h2>
          <ul>
            {shopping.items
              .filter((i) => i.aisle === aisle)
              .map((item) => (
                <li key={item.ingredientId}>
                  <label className="flex min-h-11 items-center gap-3 text-[15px]">
                    <input
                      type="checkbox"
                      checked={ticked.has(item.ingredientId)}
                      onChange={() => toggle(item.ingredientId)}
                      className="h-5 w-5 shrink-0 accent-sproutine-accent"
                    />
                    <span
                      className={`min-w-0 flex-1 ${
                        ticked.has(item.ingredientId)
                          ? 'text-sproutine-muted line-through'
                          : 'text-sproutine-text'
                      }`}
                    >
                      {item.name}
                      <span className="block text-xs text-sproutine-muted">
                        {item.nameDe} ·{' '}
                        {t.week.packs(item.packs, grams(item.packGrams))}
                      </span>
                    </span>
                    <span className="text-sm text-sproutine-text-secondary tabular-nums">
                      {euro(item.cents)}
                    </span>
                  </label>
                </li>
              ))}
          </ul>
        </div>
      ))}
      {shopping.pantry.length > 0 && (
        <p className="text-sm text-sproutine-text-secondary">
          <span className="font-semibold">{t.week.checkPantry}: </span>
          {shopping.pantry.map((p) => p.name).join(', ')}
        </p>
      )}
    </section>
  )
}
