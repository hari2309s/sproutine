import Image from 'next/image'
import type { IconName } from '@/lib/icons'

export function Icon({
  name,
  size = 20,
  filled,
  className = '',
}: {
  name: IconName
  size?: number
  filled?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={`icon ${filled ? 'icon-filled' : ''} ${className}`}
      style={{ fontSize: size }}
    >
      {name}
    </span>
  )
}

export function ProPill({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <span
      className={`inline-flex flex-none items-center gap-[3px] rounded-full bg-accent-soft pr-[9px] pl-1.5 font-bold tracking-[.02em] text-accent ${
        size === 'sm' ? 'h-5 text-[11px]' : 'h-6 text-xs'
      }`}
    >
      <Icon name="auto_awesome" size={14} filled />
      Pro
    </span>
  )
}

/** The sprout mark. Always on the page colour: never put it on a white tile. */
export function Sprout({
  size,
  alt = '',
  className = '',
}: {
  size: number
  alt?: string
  className?: string
}) {
  return (
    <Image
      src="/icons/sproutine.png"
      alt={alt}
      width={size}
      height={size}
      className={`flex-none object-contain ${className}`}
    />
  )
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[13px] font-bold tracking-[.1em] text-accent uppercase">{children}</span>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  center,
}: {
  eyebrow: string
  title: string
  lead?: string
  center?: boolean
}) {
  return (
    <div
      data-reveal
      className={`flex max-w-[720px] flex-col gap-3.5 ${center ? 'items-center text-center' : ''}`}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="m-0 font-display text-[clamp(34px,4.6vw,56px)] leading-[1.06] font-normal text-balance">
        {title}
      </h2>
      {lead && <p className="m-0 text-lg leading-[1.55] text-ink2">{lead}</p>}
    </div>
  )
}

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <article
      data-reveal
      className={`flex flex-col gap-[18px] rounded-[28px] border border-line bg-card p-6 shadow-soft ${className}`}
    >
      {children}
    </article>
  )
}

export function CardTitle({ title, body, pro }: { title: string; body: string; pro?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="m-0 font-display text-2xl font-normal">{title}</h3>
        {pro && <ProPill />}
      </div>
      <p className="m-0 text-[15px] leading-[1.55] text-ink2">{body}</p>
    </div>
  )
}
