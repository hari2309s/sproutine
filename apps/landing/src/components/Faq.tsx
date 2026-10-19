'use client'

import { useState } from 'react'
import { Icon, SectionHeading } from './ui'

const FAQ: [string, string][] = [
  [
    'Is Sproutine a diet app?',
    'No. There are no good or bad foods, no meal scores and no weight-loss promises. It helps you notice what you eat and build routines that feel good.',
  ],
  [
    'What happens after the 14 days?',
    'You stay on Free with everything you’ve logged. Search, scan, plans, calendar and reviews keep working. Rosie, voice and photo logging pause until you choose to upgrade.',
  ],
  [
    'Do I need a card for the trial?',
    'No. Just create an account with your email. We only ask for payment if you decide to keep Pro.',
  ],
  [
    'Why is Rosie paid?',
    'Every message to Rosie costs us real money in AI. The tracker itself doesn’t, so it’s free, and Pro keeps the lights on for both.',
  ],
  [
    'Can I cancel anytime?',
    'Yes, in Settings. You keep Pro until the end of the period you’ve paid for, then you’re back on Free with all your data.',
  ],
  [
    'Is my data private?',
    'Yes. We don’t sell data or show ads, nothing about your health goes to an AI model without your consent, and you can download or delete everything in Settings.',
  ],
  [
    'Is it medical advice?',
    'No. Sproutine offers general wellness guidance. For medical questions, or if you’re living with an eating disorder, please talk to a doctor or a specialist service.',
  ],
]

export function Faq() {
  const [open, setOpen] = useState(1)
  return (
    <section
      id="faq"
      className="mx-auto flex max-w-[820px] flex-col gap-8 px-[clamp(20px,5vw,48px)] pt-[clamp(72px,10vw,128px)]"
    >
      <SectionHeading eyebrow="FAQ" title="Questions, kindly answered" />
      <div className="flex flex-col border-t border-line">
        {FAQ.map(([q, a], i) => {
          const isOpen = open === i
          return (
            <div key={q} className="border-b border-line">
              <h3 className="m-0">
                <button
                  type="button"
                  id={`faq-q-${i}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${i}`}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="flex min-h-[68px] w-full cursor-pointer items-center gap-4 rounded-xl border-none bg-transparent px-1 py-2.5 text-left text-[clamp(17px,1.6vw,19px)] font-semibold text-ink"
                >
                  <span className="flex-1">{q}</span>
                  <span
                    className={`flex size-10 flex-none items-center justify-center rounded-full transition-colors ${
                      isOpen ? 'bg-accent text-bg' : 'bg-surface text-ink'
                    }`}
                  >
                    <Icon name={isOpen ? 'remove' : 'add'} size={22} />
                  </span>
                </button>
              </h3>
              <div id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} hidden={!isOpen}>
                <p className="m-0 pr-14 pb-[22px] pl-1 text-base leading-[1.65] text-pretty text-ink2">
                  {a}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
