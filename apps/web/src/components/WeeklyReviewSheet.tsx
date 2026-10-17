'use client'

import { BottomSheet } from './BottomSheet'
import { Icon } from './Icon'

export interface WeeklyStats {
  avgKcal: number
  totalMeals: number
  avgWaterGlasses: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  dailyKcal: { day: string; kcal: number }[]
  bestDay: { day: string; reason: string } | null
  missedDays: string[]
}

interface WeeklyReviewSheetProps {
  stats: WeeklyStats
  streak: number
  gentle: boolean
  weekRange: string
  onClose: () => void
  onShare?: () => void
}

const RosieAvatar = () => (
  <img src="/icons/sproutine.png" alt="" width={28} height={28} className="mt-0.5 shrink-0 rounded-full" />
)

const ShareButton = ({ onShare }: { onShare?: () => void }) => (
  <button type="button" onClick={onShare} className="btn-primary w-full">
    <Icon name="ios_share" size={20} /> Share my week
  </button>
)

// ── Gentle mode view ──────────────────────────────────────────────────────────

function GentleView({ stats, weekRange, onShare }: { stats: WeeklyStats; weekRange: string; onShare?: () => void }) {
  const loggedDays = stats.dailyKcal.filter((d) => d.kcal > 0).length
  const totalDays = stats.dailyKcal.length

  const highlights = [
    stats.totalMeals > 0 && { icon: 'restaurant' as const, text: `${stats.totalMeals} meals logged this week` },
    stats.avgWaterGlasses > 0 && { icon: 'local_drink' as const, text: `${stats.avgWaterGlasses.toFixed(1)} glasses of water on average` },
    stats.bestDay && { icon: 'star' as const, text: `Best day: ${stats.bestDay.day} — ${stats.bestDay.reason}` },
  ].filter(Boolean) as { icon: 'restaurant' | 'local_drink' | 'star'; text: string }[]

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow mb-1">{weekRange}</p>
        <p className="font-display text-[36px] leading-tight text-sproutine-text">
          {loggedDays} of {totalDays} days
        </p>
        <p className="mt-1 text-[15px] text-sproutine-text-secondary">You checked in almost every day.</p>
      </div>

      {/* Day dots */}
      <div className="flex gap-2">
        {stats.dailyKcal.map(({ day, kcal }) => (
          <div key={day} className="flex flex-1 flex-col items-center gap-1">
            <span className={`flex h-9 w-9 items-center justify-center rounded-full ${
              kcal > 0
                ? 'bg-sproutine-accent text-sproutine-bg'
                : 'border-2 border-dashed border-sproutine-border-strong text-sproutine-muted'
            }`}>
              {kcal > 0 && <Icon name="check" size={18} />}
            </span>
            <span className="text-[11px] text-sproutine-muted">{day.slice(0, 2)}</span>
          </div>
        ))}
      </div>

      {/* Qualitative highlights */}
      {highlights.length > 0 && (
        <div className="rounded-[18px] border border-sproutine-border bg-sproutine-surface p-4 space-y-3">
          {highlights.map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <Icon name={icon} size={20} className="shrink-0 text-sproutine-accent" />
              <span className="text-[14px] text-sproutine-text">{text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-3">
        <RosieAvatar />
        <p className="font-display text-[17px] italic leading-snug text-sproutine-text-secondary">
          "Consistency over perfection. Every day you showed up counts."
        </p>
      </div>

      <ShareButton onShare={onShare} />
    </div>
  )
}

// ── Normal mode view ──────────────────────────────────────────────────────────

function StatCard({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[18px] bg-sproutine-surface p-4">
      <span className="font-display text-[24px] leading-none text-sproutine-text">
        {value}
        {unit && <span className="ml-1 text-[14px] font-sans font-normal text-sproutine-muted">{unit}</span>}
      </span>
      <span className="text-[12px] text-sproutine-text-secondary">{label}</span>
    </div>
  )
}

function NormalView({ stats, streak, weekRange, onShare }: { stats: WeeklyStats; streak: number; weekRange: string; onShare?: () => void }) {
  const maxKcal = Math.max(...stats.dailyKcal.map((d) => d.kcal), 1)
  const avgKcal = stats.avgKcal

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow mb-1">{weekRange}</p>
        <p className="font-display text-[26px] leading-tight text-sproutine-text">Your Week in Review</p>
      </div>

      {/* Stats grid 2×2 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard value={Math.round(avgKcal).toLocaleString()} unit="kcal" label="Daily average" />
        <StatCard value={String(stats.totalMeals)} label="Meals logged" />
        <StatCard value={stats.avgWaterGlasses.toFixed(1)} label="Water glasses / day" />
        <StatCard value={String(streak)} label="Day streak" />
      </div>

      {/* Week totals */}
      <div className="rounded-[18px] border border-sproutine-border bg-sproutine-card p-4">
        <p className="eyebrow mb-3">Week totals</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sproutine-green" />
            <span className="text-[14px] font-bold text-sproutine-green">{Math.round(stats.totalProtein)}g</span>
            <span className="text-[12px] text-sproutine-muted">protein</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--t-amber)' }} />
            <span className="text-[14px] font-bold" style={{ color: 'var(--t-amber)' }}>{Math.round(stats.totalCarbs)}g</span>
            <span className="text-[12px] text-sproutine-muted">carbs</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sproutine-muted" />
            <span className="text-[14px] font-bold text-sproutine-text">{Math.round(stats.totalFat)}g</span>
            <span className="text-[12px] text-sproutine-muted">fat</span>
          </span>
        </div>
      </div>

      {/* Bar chart: Energy by day */}
      <div>
        <p className="text-[14px] font-semibold text-sproutine-text mb-3">Energy by day</p>
        <div className="relative">
          {/* Dashed average line */}
          <div
            className="absolute left-0 right-0 border-t border-dashed border-sproutine-border-strong"
            style={{ bottom: `calc(22px + ${(avgKcal / maxKcal) * 100}%)` }}
          />
          {/* Bars */}
          <div className="flex items-end gap-1.5 h-28">
            {stats.dailyKcal.map(({ day, kcal }) => (
              <div key={day} className="flex flex-1 flex-col items-center gap-1">
                <div className="relative flex w-full flex-1 items-end">
                  {kcal === 0 ? (
                    <div className="w-full h-4 rounded-t-sm border-2 border-dashed border-sproutine-border-strong" />
                  ) : (
                    <div
                      className="w-full rounded-t-sm bg-sproutine-accent"
                      style={{ height: `${Math.max((kcal / maxKcal) * 100, 4)}%` }}
                    />
                  )}
                </div>
                <span className="text-[10px] text-sproutine-muted">{day.slice(0, 2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Missing day note */}
      {stats.missedDays.length > 0 && (
        <div className="flex items-center gap-2 text-[13px] text-sproutine-muted">
          <Icon name="event_busy" size={18} className="shrink-0" />
          <span>
            Nothing logged on {stats.missedDays.join(', ')}.{' '}
            {stats.missedDays.some((d) => d === 'Saturday' || d === 'Sunday') ? 'Weekends happen.' : 'Life happens.'}
          </span>
        </div>
      )}

      {/* Best day */}
      {stats.bestDay && (
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sproutine-accent-soft">
            <Icon name="star" size={20} className="text-sproutine-accent" />
          </span>
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-sproutine-text">Best day · {stats.bestDay.day}</span>
            <span className="text-[13px] text-sproutine-text-secondary">{stats.bestDay.reason}</span>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        <RosieAvatar />
        <p className="font-display text-[17px] italic leading-snug text-sproutine-text-secondary">
          "Every logged meal is a small act of care for yourself. Keep going."
        </p>
      </div>

      <ShareButton onShare={onShare} />
    </div>
  )
}

// ── Sheet wrapper ─────────────────────────────────────────────────────────────

export function WeeklyReviewSheet({ stats, streak, gentle, weekRange, onClose, onShare }: WeeklyReviewSheetProps) {
  return (
    <BottomSheet title="Weekly Review" onClose={onClose}>
      {gentle
        ? <GentleView stats={stats} weekRange={weekRange} onShare={onShare} />
        : <NormalView stats={stats} streak={streak} weekRange={weekRange} onShare={onShare} />
      }
    </BottomSheet>
  )
}
