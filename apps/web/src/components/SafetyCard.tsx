'use client'

import { SAFETY_CONTACTS, type SafetyContact } from '@sproutine/types'
import { Icon } from './Icon'
import { useLanguage } from '@/contexts/LanguageContext'

/**
 * Shown in place of a normal reply when the safety gate routes a message.
 * Caring and serious, never alarming: no red, no warning icons, and no
 * feedback buttons. Every number is a tappable tel: link.
 */
export function SafetyCard({ category }: { category: 'crisis' | 'ed_risk' }) {
  const { t } = useLanguage()
  const copy = category === 'crisis' ? t.safety.crisis : t.safety.edRisk
  const rows: { label: string; contact: SafetyContact }[] =
    category === 'crisis'
      ? [
          { label: t.safety.crisis.helplineLabel, contact: SAFETY_CONTACTS.telefonSeelsorge },
          { label: t.safety.crisis.emergencyLabel, contact: SAFETY_CONTACTS.emergency },
        ]
      : [{ label: t.safety.edRisk.helplineLabel, contact: SAFETY_CONTACTS.eatingDisorders }]

  return (
    <div className="card flex flex-col gap-3 p-[18px]">
      <p className="font-display text-xl leading-tight text-sproutine-text">{copy.title}</p>
      <p className="text-[15px] leading-normal text-sproutine-text">{copy.body}</p>
      {rows.map(({ label, contact }) => (
        <a
          key={contact.tel}
          href={`tel:${contact.tel}`}
          className="flex min-h-[60px] items-center gap-3 rounded-2xl bg-sproutine-surface px-3.5 hover:bg-sproutine-accent-soft"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sproutine-accent-soft text-sproutine-accent">
            <Icon name="call" size={22} />
          </span>
          <span className="flex flex-1 flex-col leading-tight">
            <span className="text-[13px] text-sproutine-text-secondary">{label}</span>
            <span className="text-[17px] font-semibold text-sproutine-text">{contact.number}</span>
          </span>
          <Icon name="chevron_right" size={22} className="text-sproutine-text-secondary" />
        </a>
      ))}
      <p className="text-[15px] leading-normal text-sproutine-text-secondary">{copy.closing}</p>
    </div>
  )
}
