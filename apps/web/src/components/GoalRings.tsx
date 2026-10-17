'use client'

import { motion } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { Icon } from './Icon'

interface Goals {
  kcal: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}

interface Totals {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

interface GoalRingsProps {
  goals: Goals
  totals: Totals
  gentle: boolean
  onOpenSettings?: () => void
}

const RING_SIZE = 64
const STROKE_WIDTH = 5
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Amber has a Tailwind utility but requires an inline stroke since the variable
// isn't listed in the @theme `color-*` namespace — use inline style for the SVG
// stroke in both cases; the icon uses its own Tailwind color class.
const NUTRIENT_CONFIG = [
  {
    key: 'kcal' as const,
    icon: 'bolt' as const,
    stroke: 'var(--t-accent)',
    iconClass: 'text-sproutine-accent',
    unit: '' as const,
  },
  {
    key: 'protein' as const,
    icon: 'egg_alt' as const,
    stroke: 'var(--t-green)',
    iconClass: 'text-sproutine-green',
    unit: 'g' as const,
  },
  {
    key: 'carbs' as const,
    icon: 'bakery_dining' as const,
    stroke: 'var(--t-amber)',
    iconClass: 'text-sproutine-amber',
    unit: 'g' as const,
  },
  {
    key: 'fat' as const,
    icon: 'opacity' as const,
    stroke: 'var(--t-muted)',
    iconClass: 'text-sproutine-muted',
    unit: 'g' as const,
  },
] as const

function NutrientRing({
  value,
  goal,
  icon,
  stroke,
  iconClass,
  label,
  unit,
  ofLabel,
}: {
  value: number
  goal: number
  icon: typeof NUTRIENT_CONFIG[number]['icon']
  stroke: string
  iconClass: string
  label: string
  unit: string
  ofLabel: string
}) {
  const rounded = Math.round(value)
  const progress = Math.min(value / goal, 1)
  const dashOffset = CIRCUMFERENCE * (1 - progress)
  const done = value >= goal

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Ring */}
      <div
        className="relative flex shrink-0 items-center justify-center"
        style={{ width: RING_SIZE, height: RING_SIZE }}
      >
        <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90" aria-hidden>
          {/* Track */}
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--t-border)"
            strokeWidth={STROKE_WIDTH}
          />
          {/* Progress arc — animated with Framer Motion */}
          <motion.circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={stroke}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={false}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </svg>
        {/* Inner white/card circle with icon */}
        <div
          className="absolute flex items-center justify-center rounded-full bg-sproutine-card"
          style={{ width: 50, height: 50 }}
        >
          <Icon
            name={done ? 'check' : icon}
            size={20}
            className={iconClass}
          />
        </div>
      </div>
      {/* Numeric value */}
      <span className="text-[15px] font-semibold tabular-nums text-sproutine-text leading-none">
        {rounded}
      </span>
      {/* "of goal" */}
      <span className="text-[12px] text-sproutine-muted leading-none">
        {ofLabel} {goal}{unit}
      </span>
      {/* Nutrient label */}
      <span className="text-[12px] font-semibold text-sproutine-text-secondary leading-none">
        {label}
      </span>
    </div>
  )
}

export function GoalRings({ goals, totals, gentle, onOpenSettings }: GoalRingsProps) {
  const { t } = useLanguage()

  if (gentle) return null

  const hasAnyGoal =
    goals.kcal != null || goals.protein != null || goals.carbs != null || goals.fat != null

  if (!hasAnyGoal) {
    return (
      <button
        type="button"
        onClick={onOpenSettings}
        className="flex w-full items-center gap-3 rounded-[20px] border-[1.5px] border-dashed border-sproutine-border-strong px-4 py-4 min-h-[64px] transition-colors hover:bg-sproutine-surface"
        aria-label={t.goals.setInSettings}
      >
        <Icon name="flag" size={22} className="text-sproutine-text-secondary shrink-0" />
        <div className="flex-1 text-left min-w-0">
          <p className="text-[15px] font-semibold text-sproutine-text leading-snug">
            {t.goals.setInSettings}
          </p>
          <p className="text-[13px] text-sproutine-text-secondary leading-snug">
            {t.goals.setInSettingsSub}
          </p>
        </div>
        <Icon name="chevron_right" size={24} className="text-sproutine-accent shrink-0" />
      </button>
    )
  }

  const nutrientLabels: Record<string, string> = {
    kcal: t.goals.kcal,
    protein: t.goals.protein,
    carbs: t.goals.carbs,
    fat: t.goals.fat,
  }

  return (
    <div
      className="bg-sproutine-card border border-sproutine-border shadow-soft"
      style={{ borderRadius: 24, padding: '12px 8px 14px' }}
    >
      {/* Header */}
      <div className="flex items-baseline justify-between px-2 pb-3">
        <span className="text-[15px] font-semibold text-sproutine-text">{t.goals.title}</span>
        <span className="text-[13px] text-sproutine-muted">{t.goals.subtitle}</span>
      </div>
      {/* Rings — grid adapts to active goal count */}
      {(() => {
        const active = NUTRIENT_CONFIG.filter(({ key }) => goals[key] != null)
        const cols = active.length >= 4 ? 'grid-cols-4' : active.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
        return (
          <div className={`grid ${cols} gap-2`}>
            {active.map(({ key, icon, stroke, iconClass, unit }) => (
              <NutrientRing
                key={key}
                value={totals[key]}
                goal={goals[key]!}
                icon={icon}
                stroke={stroke}
                iconClass={iconClass}
                label={nutrientLabels[key] ?? key}
                unit={unit}
                ofLabel={t.goals.of}
              />
            ))}
          </div>
        )
      })()}
    </div>
  )
}
