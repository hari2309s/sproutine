import { Icon } from './Icon'

/** The one Pro marker: sparkle plus the word, so it never relies on colour alone. */
export function ProPill({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full bg-sproutine-accent-soft font-bold text-sproutine-accent ${
        size === 'sm'
          ? 'h-5 gap-0.5 pr-[7px] pl-[5px] text-[11px]'
          : 'h-6 gap-[3px] pr-[9px] pl-1.5 text-xs'
      } ${className}`}
    >
      <Icon name="auto_awesome" size={size === 'sm' ? 12 : 14} filled />
      Pro
    </span>
  )
}
