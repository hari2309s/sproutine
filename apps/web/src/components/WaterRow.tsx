'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { useLanguage } from '@/contexts/LanguageContext'

interface WaterEntry {
  id: string
  ml: number
  loggedAt: string
}

interface WaterRowProps {
  gentle: boolean
}

export function WaterRow({ gentle }: WaterRowProps) {
  const { t } = useLanguage()
  const [entries, setEntries] = useState<WaterEntry[]>([])
  const [goalMl, setGoalMl] = useState(2000)
  const [glassMl, setGlassMl] = useState(250)
  const [holding, setHolding] = useState(false)
  const holdingRef = useRef(false)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/water')
      if (!res.ok) return
      const body = await res.json()
      setEntries(body.entries ?? [])
      setGoalMl(body.goalMl ?? 2000)
      setGlassMl(body.glassMl ?? 250)
    } catch {
      /* silent */
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const totalMl = entries.reduce((sum, e) => sum + e.ml, 0)
  const glasses = entries.length
  const goalGlasses = Math.ceil(goalMl / glassMl)
  const progress = Math.min(totalMl / goalMl, 1)
  const goalReached = totalMl >= goalMl

  const addGlass = async () => {
    try {
      const res = await fetch('/api/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ml: glassMl }),
      })
      if (!res.ok) return
      const { entry } = await res.json()
      setEntries((prev) => [...prev, entry])
    } catch {
      /* silent */
    }
  }

  const removeLastGlass = async () => {
    const last = entries[entries.length - 1]
    if (!last) return
    try {
      const res = await fetch('/api/water', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: last.id }),
      })
      if (!res.ok) return
      setEntries((prev) => prev.slice(0, -1))
    } catch {
      /* silent */
    }
  }

  const handlePointerDown = () => {
    holdingRef.current = false
    holdTimer.current = setTimeout(() => {
      holdingRef.current = true
      setHolding(true)
      void removeLastGlass().then(() => {
        holdingRef.current = false
        setHolding(false)
      })
    }, 600)
  }

  const handlePointerUp = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
    if (!holdingRef.current) {
      void addGlass()
    }
  }

  const handlePointerLeave = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  // Conic gradient for progress ring
  const ringSize = 48
  const strokeWidth = 4
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)

  // In gentle mode, show simpler UI without numbers
  const label = gentle
    ? t.water.glasses(glasses)
    : goalReached
      ? t.water.goalReached
      : `${glasses} / ${goalGlasses}`

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className="card flex items-center gap-3 px-4 py-3 transition-transform active:scale-[0.98]"
      aria-label={t.water.addGlass}
    >
      {/* Progress ring */}
      <div className="relative flex shrink-0 items-center justify-center" style={{ width: ringSize, height: ringSize }}>
        <svg width={ringSize} height={ringSize} className="-rotate-90">
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke="var(--t-border)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke={goalReached ? 'var(--t-green)' : 'var(--t-accent)'}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <span className="absolute">
          {goalReached ? (
            <Icon name="check" size={20} className="text-sproutine-green" />
          ) : (
            <Icon name="water_drop" size={20} className="text-sproutine-accent" />
          )}
        </span>
      </div>

      <div className="flex flex-1 flex-col">
        <span className="text-[15px] font-semibold text-sproutine-text">{t.water.title}</span>
        <span className="text-[13px] text-sproutine-text-secondary">{label}</span>
      </div>

      {holding ? (
        <Icon name="remove" size={22} className="text-sproutine-text-secondary" />
      ) : (
        <Icon name="add" size={22} className="text-sproutine-text-secondary" />
      )}
    </button>
  )
}
