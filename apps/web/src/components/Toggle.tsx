import { Icon } from './Icon'

/** 52×32 switch; the knob shows a check when on so state never relies on colour. */
export function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <span className="relative inline-flex">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full"
      />
      <span
        aria-hidden
        className={`flex h-8 w-[52px] items-center rounded-full px-1 transition-colors peer-focus-visible:shadow-[0_0_0_2px_var(--t-bg),0_0_0_4px_var(--t-text)] ${
          checked
            ? 'justify-end bg-sproutine-accent'
            : 'justify-start border-2 border-sproutine-border-strong bg-sproutine-surface'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <span
          className={`flex items-center justify-center rounded-full ${
            checked
              ? 'h-6 w-6 bg-sproutine-bg text-sproutine-accent'
              : 'h-5 w-5 bg-sproutine-border-strong'
          }`}
        >
          {checked && <Icon name="check" size={16} />}
        </span>
      </span>
    </span>
  )
}
