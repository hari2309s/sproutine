'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Icon } from './Icon'

interface GoalSettingsProps {
  userId: string
  kcalGoal: number | null
  proteinGoalG: number | null
  carbsGoalG: number | null
  fatGoalG: number | null
  onChange: (field: string, value: number | null) => void
  onClearAll?: () => void
}

const GOAL_CONFIG = [
  {
    field: 'kcalGoal',
    labelKey: 'kcal' as const,
    dot: 'var(--t-accent)',
    step: 50,
    min: 1000,
    unit: 'kcal',
  },
  {
    field: 'proteinGoalG',
    labelKey: 'protein' as const,
    dot: 'var(--t-green)',
    step: 5,
    min: 20,
    unit: 'g',
  },
  {
    field: 'carbsGoalG',
    labelKey: 'carbs' as const,
    dot: 'var(--t-amber)',
    step: 5,
    min: 20,
    unit: 'g',
  },
  {
    field: 'fatGoalG',
    labelKey: 'fat' as const,
    dot: 'var(--t-muted)',
    step: 5,
    min: 20,
    unit: 'g',
  },
] as const

function GoalRow({
  label,
  subtitle,
  dotColor,
  value,
  step,
  unit,
  onDecrement,
  onIncrement,
}: {
  label: string
  subtitle: string
  dotColor: string
  value: number | null
  step: number
  unit: string
  onDecrement: () => void
  onIncrement: () => void
}) {
  const display = value == null ? 'Off' : `${value}${unit}`

  return (
    <div className="flex items-center gap-3 py-2.5">
      {/* Colored dot */}
      <span
        className="shrink-0 rounded-full"
        aria-hidden
        style={{ width: 12, height: 12, backgroundColor: dotColor }}
      />
      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-sproutine-text leading-snug">{label}</p>
        <p className="text-[12px] text-sproutine-muted leading-snug">{subtitle}</p>
      </div>
      {/* Stepper pill */}
      <div className="flex items-center gap-1 rounded-full bg-sproutine-surface px-1 py-1 shrink-0">
        <button
          type="button"
          onClick={onDecrement}
          aria-label={`Decrease ${label}`}
          className="icon-btn h-8 w-8"
        >
          <Icon name="remove" size={18} />
        </button>
        <span
          className="min-w-[56px] text-center text-[14px] font-semibold tabular-nums text-sproutine-text"
        >
          {display}
        </span>
        <button
          type="button"
          onClick={onIncrement}
          aria-label={`Increase ${label}`}
          className="icon-btn h-8 w-8"
        >
          <Icon name="add" size={18} />
        </button>
      </div>
    </div>
  )
}

export function GoalSettings({
  kcalGoal,
  proteinGoalG,
  carbsGoalG,
  fatGoalG,
  onChange,
  onClearAll,
}: GoalSettingsProps) {
  const { t } = useLanguage()

  const values: Record<string, number | null> = {
    kcalGoal,
    proteinGoalG,
    carbsGoalG,
    fatGoalG,
  }

  const handleDecrement = (field: string, step: number, min: number) => {
    const current = values[field]
    if (current == null) return
    const next = current - step
    onChange(field, next < min ? null : next)
  }

  const handleIncrement = (field: string, step: number, min: number) => {
    const current = values[field]
    if (current == null) {
      onChange(field, min)
    } else {
      onChange(field, current + step)
    }
  }

  const handleClearAll = onClearAll ?? (() => {
    onChange('kcalGoal', null)
    onChange('proteinGoalG', null)
    onChange('carbsGoalG', null)
    onChange('fatGoalG', null)
  })

  const labelMap: Record<typeof GOAL_CONFIG[number]['labelKey'], string> = {
    kcal: t.goals.kcal,
    protein: t.goals.protein,
    carbs: t.goals.carbs,
    fat: t.goals.fat,
  }

  return (
    <section className="space-y-2.5">
      {/* Eyebrow with "New" badge */}
      <div className="flex items-center gap-2">
        <h3 className="eyebrow">Daily goals</h3>
        <span
          className="rounded-full px-2 py-0.5 text-[12px] font-bold text-sproutine-accent"
          style={{ backgroundColor: 'var(--t-accent-soft)' }}
        >
          New
        </span>
      </div>

      {/* Goal rows card */}
      <div className="card divide-y divide-sproutine-border px-4 shadow-none">
        {GOAL_CONFIG.map(({ field, labelKey, dot, step, min, unit }) => (
          <GoalRow
            key={field}
            label={labelMap[labelKey]}
            subtitle={t.goals.stepsOf(String(step))}
            dotColor={dot}
            value={values[field] ?? null}
            step={step}
            unit={unit}
            onDecrement={() => handleDecrement(field, step, min)}
            onIncrement={() => handleIncrement(field, step, min)}
          />
        ))}
      </div>

      {/* Help text */}
      <p className="text-[13px] leading-normal text-sproutine-muted px-1">
        {t.goals.settingsHint}
      </p>

      {/* Clear all */}
      <button
        type="button"
        onClick={handleClearAll}
        className="text-[15px] font-semibold text-sproutine-accent px-1 py-1"
      >
        {t.goals.clearAll}
      </button>
    </section>
  )
}
