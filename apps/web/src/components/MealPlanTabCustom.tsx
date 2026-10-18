'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from './Icon'

interface ParsedFood {
  name: string
  grams: number
}

interface MealPlanTabCustomProps {
  date: string
  slot: string
  onPlanned: () => void
}

export function MealPlanTabCustom({ date, slot, onPlanned }: MealPlanTabCustomProps) {
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParsedFood[] | null>(null)
  const [parsing, setParsing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const dayLabel = new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
  })
  const slotLabel = slot.charAt(0).toUpperCase() + slot.slice(1)

  const handleParse = async () => {
    if (!text.trim() || parsing) return
    setParsing(true)
    try {
      const res = await fetch('/api/meals/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      if (res.ok) {
        const body = await res.json()
        setParsed(body.foods ?? [])
      }
    } catch {
      /* silent */
    } finally {
      setParsing(false)
    }
  }

  const handleSubmit = async () => {
    if (!parsed || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/plans/meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, slot, foods: parsed, text: text.trim() }),
      })
      if (res.ok) onPlanned()
    } catch {
      /* silent */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setParsed(null) }}
        placeholder="Porridge with banana and honey, a glass of orange juice..."
        rows={3}
        className="w-full rounded-2xl border-2 border-sproutine-border-strong bg-sproutine-card px-4 py-3 text-[15px] text-sproutine-text placeholder:text-sproutine-muted transition-shadow focus:border-sproutine-accent focus:shadow-[0_0_0_4px_var(--t-accent-soft)] focus:outline-none"
      />
      <p className="text-xs text-sproutine-muted">
        Write it however you like. Rosie works out the foods.
      </p>

      {!parsed && (
        <button
          type="button"
          onClick={handleParse}
          disabled={!text.trim() || parsing}
          className="btn-secondary w-full"
        >
          <Icon name="auto_awesome" size={20} />
          {parsing ? 'Reading...' : 'Let Rosie read it'}
        </button>
      )}

      <AnimatePresence>
        {parsed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="space-y-3"
          >
            {/* Rosie's result */}
            <div className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sproutine-accent-soft text-sm">
                🌱
              </span>
              <p className="text-sm text-sproutine-text-secondary">
                Here&apos;s how I read that:
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {parsed.map((food, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full bg-sproutine-surface px-3 py-1.5 text-sm text-sproutine-text"
                >
                  {food.name}
                  <span className="text-sproutine-muted">{food.grams}g</span>
                  <button
                    type="button"
                    aria-label={`Edit ${food.name}`}
                    className="ml-0.5 text-sproutine-accent"
                  >
                    <Icon name="edit" size={14} />
                  </button>
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary w-full"
            >
              {submitting ? 'Adding...' : `Add to ${dayLabel}\u2019s ${slotLabel}`}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
