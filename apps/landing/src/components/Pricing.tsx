'use client'

import { useState } from 'react'
import { APP_URL, GITHUB_URL } from '@/lib/config'
import { PRICES, PLAN_FREE, PLAN_PRO } from '@/lib/pricing'
import { Icon, ProPill, SectionHeading } from './ui'

function PlanItem({ text, pro, strong }: { text: string; pro?: boolean; strong?: boolean }) {
  return (
    <li className="flex items-start gap-2.5 text-[15px] leading-[1.45]">
      <span
        className={`flex size-6 flex-none items-center justify-center rounded-full ${
          pro ? 'bg-accent-soft text-accent' : 'bg-green-soft text-green'
        }`}
      >
        <Icon name={pro ? 'auto_awesome' : 'check'} size={16} />
      </span>
      <span className={strong ? 'font-semibold' : ''}>{text}</span>
    </li>
  )
}

export function Pricing() {
  const [yearly, setYearly] = useState(true)
  const price = PRICES[yearly ? 'yearly' : 'monthly']

  return (
    <section
      id="pricing"
      className="mx-auto flex max-w-[1200px] flex-col items-center gap-[clamp(28px,4vw,40px)] px-[clamp(20px,5vw,48px)] pt-[clamp(72px,10vw,128px)]"
    >
      <SectionHeading
        center
        eyebrow="Pricing"
        title="Free to track. Pro when you want Rosie."
        lead="Every new account gets 14 days of Pro. Afterwards you stay on Free, and nothing is lost or locked."
      />
      <div
        data-reveal
        role="radiogroup"
        aria-label="Billing period"
        className="flex gap-1 rounded-full bg-surface p-1"
      >
        {([false, true] as const).map((y) => {
          const on = yearly === y
          return (
            <button
              key={String(y)}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setYearly(y)}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-none text-[15px] ${
                y ? 'pr-2 pl-[18px]' : 'px-[18px]'
              } ${on ? 'bg-card font-semibold text-ink shadow-soft' : 'bg-transparent font-medium text-ink2'}`}
            >
              {y ? 'Yearly' : 'Monthly'}
              {y && (
                <span className="flex h-6 items-center rounded-full bg-green-soft px-[9px] text-xs font-bold text-green">
                  Save {PRICES.yearlySaving}%
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex w-full max-w-[920px] flex-wrap items-stretch gap-5">
        <div
          data-reveal
          className="flex flex-[1_1_300px] flex-col gap-[18px] rounded-[28px] border border-line bg-card p-7 shadow-soft"
        >
          <span className="font-display text-[26px]">Free</span>
          <span className="-mt-2 text-[15px] leading-normal text-ink2">
            Everything you need to track, plan and reflect.
          </span>
          <div className="flex min-h-24 flex-col gap-1">
            <span className="flex items-baseline gap-1.5">
              <span className="font-display text-6xl leading-none">€0</span>
              <span className="text-base text-ink2">forever</span>
            </span>
            <span className="text-sm text-ink2">No card, no time limit</span>
          </div>
          <a
            href={APP_URL}
            className="flex h-[52px] items-center justify-center rounded-full border-[1.5px] border-line-strong text-base font-semibold text-ink no-underline hover:bg-surface"
          >
            Start free
          </a>
          <ul className="m-0 flex list-none flex-col gap-3 border-t border-line p-0 pt-[18px]">
            {PLAN_FREE.map((t) => (
              <PlanItem key={t} text={t} />
            ))}
          </ul>
        </div>

        <div
          data-reveal
          className="relative flex flex-[1_1_300px] flex-col gap-[18px] overflow-hidden rounded-[28px] border-2 border-accent bg-card p-[27px] shadow-lift"
        >
          <span className="absolute top-[22px] right-[-38px] flex h-[30px] w-40 rotate-[38deg] items-center justify-center bg-accent text-xs font-bold tracking-[.03em] text-bg">
            14 days free
          </span>
          <span className="flex items-center gap-2">
            <span className="font-display text-[26px]">Pro</span>
            <ProPill />
          </span>
          <span className="-mt-2 text-[15px] leading-normal text-ink2">
            Everything in Free, plus Rosie, your AI companion.
          </span>
          <div className="flex min-h-24 flex-col gap-1" aria-live="polite">
            <span className="flex items-baseline gap-1.5">
              <span className="font-display text-6xl leading-none">{price.price}</span>
              <span className="text-base text-ink2">{price.per}</span>
            </span>
            <span className="text-sm text-ink2">{price.note}</span>
          </div>
          <a
            href={APP_URL}
            className="flex h-[52px] items-center justify-center rounded-full bg-accent text-base font-semibold text-bg no-underline hover:brightness-110"
          >
            Start free trial
          </a>
          <ul className="m-0 flex list-none flex-col gap-3 border-t border-line p-0 pt-[18px]">
            {PLAN_PRO.map((t, i) => (
              <PlanItem key={t} text={t} pro={i > 0} strong={i === 0} />
            ))}
          </ul>
        </div>
      </div>

      <ul
        data-reveal
        className="m-0 flex list-none flex-wrap justify-center gap-x-6 gap-y-2.5 p-0 text-sm text-ink2"
      >
        <li className="flex items-center gap-1.5">
          <Icon name="event_busy" size={18} />
          Cancel anytime
        </li>
        <li className="flex items-center gap-1.5">
          <Icon name="shield_lock" size={18} />
          Your data stays yours
        </li>
        <li>
          <a
            href={GITHUB_URL}
            className="flex min-h-11 items-center gap-1.5 text-ink2 underline underline-offset-[3px] hover:text-accent"
          >
            <Icon name="code" size={18} />
            Open source (MIT)
          </a>
        </li>
        <li className="flex items-center gap-1.5">
          <Icon name="block" size={18} />
          No ads
        </li>
      </ul>
    </section>
  )
}
