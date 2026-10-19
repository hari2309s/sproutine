'use client'

import { useState } from 'react'
import { Icon, ProPill, SectionHeading } from './ui'

type Way = 'free' | 'pro'

function StepHead({ n, last }: { n: number; last?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-11 flex-none items-center justify-center rounded-full bg-accent font-display text-xl text-bg">
        {n}
      </span>
      <span
        className={`flex-1 border-t-2 border-dashed ${last ? 'border-transparent' : 'border-line-strong'}`}
      />
    </div>
  )
}

function StepCard({
  title,
  body,
  pro,
  children,
}: {
  title: string
  body: string
  pro?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 rounded-[28px] border border-line bg-card p-[22px] shadow-soft">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="m-0 font-display text-2xl font-normal">{title}</h3>
          {pro && <ProPill />}
        </div>
        <p className="m-0 text-[15px] leading-[1.55] text-ink2">{body}</p>
      </div>
      {children}
    </div>
  )
}

const TABS: { key: Way; label: string; icon: 'search' | 'mic' }[] = [
  { key: 'free', label: 'Search or scan', icon: 'search' },
  { key: 'pro', label: 'Just tell Rosie', icon: 'mic' },
]

export function HowItWorks() {
  const [way, setWay] = useState<Way>('free')
  const pro = way === 'pro'

  return (
    <section
      id="how"
      className="mx-auto flex max-w-[1200px] flex-col gap-[clamp(32px,4vw,48px)] px-[clamp(20px,5vw,48px)] pt-[clamp(72px,10vw,128px)]"
    >
      <SectionHeading eyebrow="How it works" title="Three small steps. About ten seconds." />
      <div
        data-reveal
        role="tablist"
        aria-label="Ways to log"
        className="-mt-3 flex gap-1 self-start rounded-full bg-surface p-1"
      >
        {TABS.map((t) => {
          const on = way === t.key
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`how-tab-${t.key}`}
              aria-selected={on}
              aria-controls="how-steps"
              onClick={() => setWay(t.key)}
              className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-none pr-3.5 pl-3 text-sm whitespace-nowrap sm:pr-4 sm:text-[15px] ${
                on
                  ? 'bg-card font-semibold text-ink shadow-soft'
                  : 'bg-transparent font-medium text-ink2'
              }`}
            >
              <Icon name={t.icon} size={18} />
              {t.label}
              {t.key === 'pro' && (
                <span className="hidden sm:inline-flex">
                  <ProPill />
                </span>
              )}
            </button>
          )
        })}
      </div>

      <ol
        id="how-steps"
        role="tabpanel"
        aria-labelledby={`how-tab-${way}`}
        className="m-0 flex list-none flex-wrap gap-5 p-0"
      >
        <li data-reveal className="flex flex-[1_1_300px] flex-col gap-4">
          <StepHead n={1} />
          {pro ? (
            <StepCard
              pro
              title="Just tell Rosie"
              body="Talk, type or snap a photo. However it comes out is fine."
            >
              <div className="flex items-center gap-3 rounded-[20px] bg-surface p-4">
                <span className="flex size-[52px] flex-none items-center justify-center rounded-full bg-accent text-bg shadow-[0_0_0_6px_var(--accent-soft)]">
                  <Icon name="mic" size={24} filled />
                </span>
                <span className="text-[15px] leading-[1.45]">
                  &ldquo;Two slices of rye with Quark&rdquo;
                </span>
              </div>
            </StepCard>
          ) : (
            <StepCard title="Search or scan" body="Type a food or scan the barcode on the pack.">
              <div className="flex items-center gap-2.5 rounded-[20px] bg-surface p-4">
                <span className="flex h-12 flex-1 items-center gap-2 rounded-2xl border border-line-strong bg-card px-3 text-[15px]">
                  <Icon name="search" className="text-ink2" />
                  Roggenbrot
                </span>
                <span className="flex size-12 flex-none items-center justify-center rounded-full bg-accent text-bg">
                  <Icon name="barcode_scanner" size={22} />
                </span>
              </div>
            </StepCard>
          )}
        </li>
        <li data-reveal className="flex flex-[1_1_300px] flex-col gap-4">
          <StepHead n={2} />
          <StepCard
            title={pro ? 'Rosie matches real foods' : 'Pick the right food'}
            body={
              pro
                ? 'She understands the words. The numbers come from food databases.'
                : 'Every result shows where its numbers come from.'
            }
          >
            <div className="flex flex-col rounded-[20px] bg-surface px-3.5 py-2.5">
              {['Roggenbrot', 'Speisequark 20%'].map((name, i) => (
                <div
                  key={name}
                  className={`flex min-h-11 items-center gap-2 text-sm ${i ? 'border-t border-dashed border-line' : ''}`}
                >
                  <span className="flex-1 font-semibold">{name}</span>
                  <span className="flex h-[26px] items-center rounded-full bg-card px-[9px] text-[11px] font-bold text-green">
                    BLS 4.0
                  </span>
                </div>
              ))}
            </div>
          </StepCard>
        </li>
        <li data-reveal className="flex flex-[1_1_300px] flex-col gap-4">
          <StepHead n={3} last />
          <StepCard
            title="Check and save"
            body="Both ways end here. Nudge a portion if it looks off, then save."
          >
            <div className="flex flex-col gap-2.5 rounded-[20px] bg-surface p-3.5">
              <div className="grid grid-cols-4 gap-1">
                {[
                  ['385', 'kcal'],
                  ['25 g', 'protein'],
                  ['46 g', 'carbs'],
                  ['9 g', 'fat'],
                ].map(([v, l]) => (
                  <span key={l} className="flex flex-col">
                    <span className="font-display text-lg">{v}</span>
                    <span className="text-[11px] text-ink2">{l}</span>
                  </span>
                ))}
              </div>
              <span className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-accent text-sm font-semibold text-bg">
                <Icon name="check" size={18} />
                Saved to Today
              </span>
            </div>
          </StepCard>
        </li>
      </ol>
    </section>
  )
}
