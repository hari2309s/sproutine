import type { IconName } from '@/lib/icons'
import { Icon } from './ui'

const FACTS: { icon: IconName; text: string }[] = [
  { icon: 'database', text: '7,140 German foods (BLS 4.0)' },
  { icon: 'barcode_scanner', text: 'Open Food Facts + USDA' },
  { icon: 'fact_check', text: 'Numbers from data, not the AI' },
  { icon: 'shield_lock', text: 'GDPR: your data stays yours' },
  { icon: 'wifi_off', text: 'Works offline as a PWA' },
]

export function TrustStrip() {
  return (
    <section aria-label="Facts" className="border-y border-line bg-surface">
      <ul className="mx-auto flex max-w-[1200px] list-none flex-wrap justify-center gap-x-9 gap-y-3.5 px-[clamp(20px,5vw,48px)] py-[22px]">
        {FACTS.map((f) => (
          <li key={f.text} className="flex items-center gap-2 text-[15px] font-medium text-ink2">
            <Icon name={f.icon} className="text-green" />
            {f.text}
          </li>
        ))}
      </ul>
    </section>
  )
}
