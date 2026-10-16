'use client'

import { forwardRef } from 'react'
import type { MealSlot, Nutrients } from '@sproutine/food/client'
import { MEAL_SLOTS } from '@sproutine/food/client'

interface ShareLog {
  slot: MealSlot
  items: { name: string }[]
  totals?: Nutrients
}

interface SummaryCardProps {
  logs: ShareLog[]
  gentle: boolean
  streak?: number
  format: 'story' | 'square'
}

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

/**
 * Renders the shareable daily summary card at native resolution (360×640 story, 360×360 square).
 * Rendered to PNG via html-to-image at 3× for 1080px output.
 * No white background on the logo per user constraint.
 */
export const SummaryCard = forwardRef<HTMLDivElement, SummaryCardProps>(
  function SummaryCard({ logs, gentle, streak, format }, ref) {
    const isStory = format === 'story'
    const today = new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })

    // Aggregate totals across all logs
    const totals = logs.reduce(
      (acc, l) => ({
        kcal: acc.kcal + (l.totals?.kcal ?? 0),
        protein: acc.protein + (l.totals?.protein ?? 0),
        carbs: acc.carbs + (l.totals?.carbs ?? 0),
        fat: acc.fat + (l.totals?.fat ?? 0),
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    )

    return (
      <div
        ref={ref}
        style={{
          width: 360,
          height: isStory ? 640 : 360,
          background: 'linear-gradient(160deg, #f6efe4 0%, #efe5d5 100%)',
          color: '#2e2219',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
          padding: isStory ? '32px 24px' : '20px 24px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Sprout watermark */}
        <div
          style={{
            position: 'absolute',
            right: isStory ? 16 : 12,
            bottom: isStory ? 16 : 12,
            fontSize: isStory ? 120 : 80,
            opacity: 0.13,
            lineHeight: 1,
          }}
        >
          🌱
        </div>

        {/* Header: logo + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isStory ? 8 : 4 }}>
          <img
            src="/icons/sproutine.png"
            alt=""
            width={28}
            height={28}
            style={{ borderRadius: 6 }}
          />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#ad4128' }}>Sproutine</span>
        </div>

        {/* Date */}
        <div style={{ fontSize: 13, color: '#756555', marginBottom: isStory ? 20 : 12 }}>
          {today}
        </div>

        {/* Meal rows */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: isStory ? 12 : 6 }}>
          {MEAL_SLOTS.map((slot) => {
            const inSlot = logs.filter((l) => l.slot === slot)
            if (!inSlot.length) return null
            const names = inSlot.flatMap((l) => l.items.map((i) => i.name))
            return (
              <div key={slot} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#ad4128',
                    background: '#f5dccf',
                    borderRadius: 6,
                    padding: '3px 8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {SLOT_LABELS[slot]}
                </span>
                <span style={{ fontSize: 14, lineHeight: 1.4, color: '#2e2219' }}>
                  {names.join(', ')}
                </span>
              </div>
            )
          })}
        </div>

        {/* Macro totals */}
        {!gentle && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 4,
              marginTop: isStory ? 16 : 8,
              paddingTop: isStory ? 16 : 8,
              borderTop: '1px solid #e2d5c1',
            }}
          >
            {[
              { label: 'kcal', value: Math.round(totals.kcal) },
              { label: 'protein', value: `${Math.round(totals.protein)}g` },
              { label: 'carbs', value: `${Math.round(totals.carbs)}g` },
              { label: 'fat', value: `${Math.round(totals.fat)}g` },
            ].map((m) => (
              <div key={m.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, serif' }}>
                  {m.value}
                </div>
                <div style={{ fontSize: 11, color: '#756555' }}>{m.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Streak badge */}
        {streak != null && streak > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              marginTop: 12,
              fontSize: 13,
              fontWeight: 600,
              color: '#47711c',
            }}
          >
            🔥 {streak} day streak
          </div>
        )}
      </div>
    )
  }
)
