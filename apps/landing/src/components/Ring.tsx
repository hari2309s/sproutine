import type { IconName } from '@/lib/icons'
import { Icon } from './ui'

const CIRC = 2 * Math.PI * 15

/** A progress ring that fills when its nearest `[data-reveal]` ancestor scrolls in. */
export function Ring({
  size,
  pct,
  color,
  stroke = 4,
  delay = 0,
  icon,
  iconSize,
}: {
  size: number
  pct: number
  color: string
  stroke?: number
  delay?: number
  icon: IconName
  iconSize: number
}) {
  return (
    <span className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 36 36" className="absolute inset-0" aria-hidden>
        <circle cx="18" cy="18" r="15" fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          className="ring-arc"
          style={{ '--offset': CIRC * (1 - pct), '--delay': `${delay}ms` } as React.CSSProperties}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center" style={{ color }}>
        <Icon name={icon} size={iconSize} filled={icon === 'water_drop'} />
      </span>
    </span>
  )
}
