'use client'

import { useMemo } from 'react'

export interface WeightPoint {
  date: string // ISO date 'YYYY-MM-DD'
  weightKg: number
}

interface WeightChartProps {
  entries: WeightPoint[]
  locale: string
}

const W = 340
const H = 160
const PAD = { top: 20, right: 16, bottom: 32, left: 38 }
const PW = W - PAD.left - PAD.right
const PH = H - PAD.top - PAD.bottom

/** Linear regression returning slope m and intercept b (or null if n < 2). */
function linReg(xs: number[], ys: number[]) {
  const n = xs.length
  if (n < 2) return null
  const sumX = xs.reduce((a, x) => a + x, 0)
  const sumY = ys.reduce((a, y) => a + y, 0)
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i]!, 0)
  const sumX2 = xs.reduce((a, x) => a + x * x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return null
  const m = (n * sumXY - sumX * sumY) / denom
  const b = (sumY - m * sumX) / n
  return { m, b }
}

export function WeightChart({ entries, locale }: WeightChartProps) {
  const data = useMemo(() => {
    if (entries.length === 0) return null

    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
    const weights = sorted.map((e) => e.weightKg)
    const times = sorted.map((e) => new Date(e.date + 'T12:00:00').getTime())

    const minW = Math.min(...weights)
    const maxW = Math.max(...weights)
    const rng = maxW - minW || 1
    const yMin = minW - rng * 0.2
    const yMax = maxW + rng * 0.2

    const minT = times[0]!
    const maxT = times[times.length - 1]!
    const tRange = maxT - minT || 1

    const toX = (t: number) => PAD.left + ((t - minT) / tRange) * PW
    const toY = (w: number) => PAD.top + PH - ((w - yMin) / (yMax - yMin)) * PH

    const points = sorted.map((e, i) => ({
      x: toX(times[i]!),
      y: toY(e.weightKg),
      weight: e.weightKg,
      date: e.date,
    }))

    // Y axis: 3 evenly-spaced tick values
    const yTicks = [yMin, (yMin + yMax) / 2, yMax].map((v) => ({
      val: v,
      y: toY(v),
    }))

    // X axis: up to 4 evenly-spaced ticks
    const xTickCount = Math.min(sorted.length, 4)
    const xTicks = Array.from({ length: xTickCount }, (_, i) => {
      const idx = Math.round((i * (sorted.length - 1)) / Math.max(xTickCount - 1, 1))
      return { idx, x: points[idx]!.x, date: sorted[idx]!.date }
    })

    // Trend line
    const reg = linReg(times, weights)
    const trendLine = reg
      ? {
          x1: toX(minT),
          y1: toY(reg.m * minT + reg.b),
          x2: toX(maxT),
          y2: toY(reg.m * maxT + reg.b),
        }
      : null

    const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const latest = points[points.length - 1]!

    return { points, polyline, trendLine, yTicks, xTicks, latest }
  }, [entries])

  if (!data) return null

  const { points, polyline, trendLine, yTicks, xTicks, latest } = data

  const fmtDate = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString(locale === 'en' ? 'en-GB' : locale, {
      day: 'numeric',
      month: 'short',
    })

  // Tooltip box: keep it within the chart
  const tipX = Math.min(Math.max(latest.x, PAD.left + 26), W - PAD.right - 26)

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-sproutine-text-secondary">
        <span className="flex items-center gap-1">
          <svg width="18" height="8" aria-hidden>
            <line
              x1="0"
              y1="4"
              x2="18"
              y2="4"
              stroke="var(--color-sproutine-accent)"
              strokeWidth="2"
            />
          </svg>
          Trend
        </span>
        <span className="flex items-center gap-1">
          <svg width="10" height="10" aria-hidden>
            <circle cx="5" cy="5" r="4" fill="transparent" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          Weigh-in
        </span>
      </div>

      {/* SVG chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        aria-label="Weight chart"
        role="img"
        style={{ overflow: 'visible' }}
      >
        {/* Y axis labels */}
        {yTicks.map(({ val, y }, i) => (
          <text
            key={i}
            x={PAD.left - 5}
            y={y + 4}
            textAnchor="end"
            fontSize="10"
            fill="currentColor"
            opacity={0.45}
          >
            {val.toFixed(1)}
          </text>
        ))}

        {/* X axis labels */}
        {xTicks.map(({ idx, x, date }) => (
          <text
            key={idx}
            x={x}
            y={H - 2}
            textAnchor="middle"
            fontSize="10"
            fill="currentColor"
            opacity={0.45}
          >
            {fmtDate(date)}
          </text>
        ))}

        {/* Faint polyline connecting dots */}
        {points.length > 1 && (
          <polyline
            points={polyline}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity={0.18}
          />
        )}

        {/* Trend line */}
        {trendLine && (
          <line
            x1={trendLine.x1.toFixed(1)}
            y1={trendLine.y1.toFixed(1)}
            x2={trendLine.x2.toFixed(1)}
            y2={trendLine.y2.toFixed(1)}
            stroke="var(--color-sproutine-accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}

        {/* Data points — hollow circles */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x.toFixed(1)}
            cy={p.y.toFixed(1)}
            r="4"
            fill="var(--color-sproutine-card)"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity={0.65}
          />
        ))}

        {/* Tooltip on latest point */}
        <circle
          cx={latest.x.toFixed(1)}
          cy={latest.y.toFixed(1)}
          r="5"
          fill="var(--color-sproutine-card)"
          stroke="var(--color-sproutine-accent)"
          strokeWidth="2.5"
        />
        <rect
          x={(tipX - 27).toFixed(1)}
          y={(latest.y - 30).toFixed(1)}
          width="54"
          height="20"
          rx="6"
          fill="var(--color-sproutine-accent)"
        />
        <text
          x={tipX.toFixed(1)}
          y={(latest.y - 15).toFixed(1)}
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill="var(--color-sproutine-bg)"
        >
          {latest.weight} kg
        </text>
      </svg>
    </div>
  )
}
