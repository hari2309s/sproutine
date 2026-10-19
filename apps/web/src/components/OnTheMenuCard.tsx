'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { PLAN_SLOTS, RECIPES_BY_ID, type PlanSlot } from '@sproutine/food/client'
import { useLanguage } from '@/contexts/LanguageContext'
import { fetchPlannedMeals } from '@/lib/mealApi'

/** Today's planned recipes, linking to the Week tab. Renders nothing without a plan. */
export function OnTheMenuCard() {
  const { t } = useLanguage()
  const [planned, setPlanned] = useState<Partial<Record<PlanSlot, string>> | null>(null)

  useEffect(() => {
    fetchPlannedMeals()
      .then(setPlanned)
      .catch(() => setPlanned(null))
  }, [])

  if (!planned) return null
  return (
    <Link href="/week" className="card block space-y-1 px-4 py-3">
      <h2 className="eyebrow">{t.today.onTheMenu}</h2>
      <ul>
        {PLAN_SLOTS.map((slot) =>
          planned[slot] ? (
            <li key={slot} className="flex gap-3 py-0.5 text-[15px]">
              <span className="w-20 shrink-0 text-sproutine-text-secondary">
                {t.week.slots[slot]}
              </span>
              <span className="text-sproutine-text">
                {RECIPES_BY_ID[planned[slot]!]?.name ?? planned[slot]}
              </span>
            </li>
          ) : null
        )}
      </ul>
    </Link>
  )
}
