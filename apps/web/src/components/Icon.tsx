import type { IconName } from '@/lib/icons'

export type { IconName } from '@/lib/icons'

interface IconProps {
  name: IconName
  /** Filled variant — only for active or selected states. */
  filled?: boolean
  size?: number
  className?: string
}

export function Icon({ name, filled, size = 24, className = '' }: IconProps) {
  return (
    <span
      aria-hidden
      className={`icon ${filled ? 'icon-filled' : ''} ${className}`}
      style={{ fontSize: size, width: size, height: size }}
    >
      {name}
    </span>
  )
}
