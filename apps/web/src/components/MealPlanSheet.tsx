'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BottomSheet } from './BottomSheet'
import { Icon } from './Icon'
import { MealPlanTabFavourites } from './MealPlanTabFavourites'
import { MealPlanTabRecent } from './MealPlanTabRecent'
import { MealPlanTabRecipes } from './MealPlanTabRecipes'
import { MealPlanTabCustom } from './MealPlanTabCustom'

interface MealPlanSheetProps {
  date: string
  slot: string
  onClose: () => void
  onPlanned: () => void
}

const TABS = [
  { key: 'favourites', label: 'Favourites', icon: 'favorite' as const },
  { key: 'recent', label: 'Recent', icon: 'history' as const },
  { key: 'recipes', label: 'Recipes', icon: 'restaurant' as const },
  { key: 'custom', label: 'Custom', icon: 'edit' as const },
] as const

type TabKey = (typeof TABS)[number]['key']

export function MealPlanSheet({ date, slot, onClose, onPlanned }: MealPlanSheetProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('favourites')
  const [submitting, setSubmitting] = useState(false)

  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const slotLabel = slot.charAt(0).toUpperCase() + slot.slice(1)

  const handleSelect = async (meal: { slot?: string; items?: any[]; foods?: string }) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/plans/meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, slot, ...meal }),
      })
      if (res.ok) {
        onPlanned()
        onClose()
      }
    } catch {
      /* silent */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <BottomSheet title={`Plan ${slotLabel}`} onClose={onClose}>
      <p className="text-sm text-sproutine-muted -mt-1 mb-3">{dateLabel}</p>

      {/* Tab pills */}
      <div className="-mx-5 mb-4 overflow-x-auto scroll-fade-x px-5">
        <div className="flex gap-2">
          {TABS.map((tab) => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'border-2 border-sproutine-accent bg-sproutine-accent-soft text-sproutine-accent'
                    : 'border border-sproutine-border bg-sproutine-card text-sproutine-text-secondary'
                }`}
              >
                <Icon name={tab.icon} size={18} />
                {tab.label}
                {active && (
                  <motion.span
                    layoutId="plan-tab-indicator"
                    className="absolute inset-0 rounded-full border-2 border-sproutine-accent"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-[200px]">
        {activeTab === 'favourites' && (
          <MealPlanTabFavourites onSelect={handleSelect} />
        )}
        {activeTab === 'recent' && (
          <MealPlanTabRecent slot={slot} onSelect={handleSelect} />
        )}
        {activeTab === 'recipes' && (
          <MealPlanTabRecipes onSelect={handleSelect} />
        )}
        {activeTab === 'custom' && (
          <MealPlanTabCustom date={date} slot={slot} onPlanned={onPlanned} />
        )}
      </div>

      {submitting && (
        <div className="absolute inset-0 flex items-center justify-center rounded-t-[28px] bg-sproutine-overlay/30">
          <Icon name="sync" size={28} className="animate-spin text-sproutine-accent" />
        </div>
      )}
    </BottomSheet>
  )
}
