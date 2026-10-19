import { APP_URL, DEMO_URL } from '@/lib/config'
import { PhoneMockup } from './PhoneMockup'
import { Icon } from './ui'

const WORDS: [string, boolean][] = [
  ['Eat', false],
  ['well,', false],
  ['one', true],
  ['sprout', true],
  ['at', false],
  ['a', false],
  ['time.', false],
]

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <span
        aria-hidden
        className="absolute top-[-60px] right-[-8%] size-[min(72vw,640px)] rounded-[58%_42%_50%_50%/46%_56%_44%_54%] bg-green-soft"
      />
      <span
        aria-hidden
        className="absolute bottom-[-120px] left-[-10%] size-[min(50vw,420px)] rounded-[46%_54%_60%_40%/50%_40%_60%_50%] bg-accent-soft opacity-70"
      />
      <div className="relative mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] items-center gap-[clamp(40px,6vw,72px)] px-[clamp(20px,5vw,48px)] pt-[clamp(32px,6vw,80px)] pb-[clamp(64px,9vw,120px)]">
        <div className="flex flex-col items-start gap-6">
          <span className="flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-card pr-3.5 pl-2.5 text-sm font-semibold text-ink2">
            <Icon name="eco" size={18} className="text-green" />
            Free to start · 14 days of Pro included · Made in Berlin
          </span>
          <h1 className="m-0 font-display text-[clamp(46px,7.2vw,92px)] leading-[1.02] font-normal tracking-[-.01em] text-balance">
            {WORDS.map(([w, accent], i) => (
              <span
                key={w}
                className={`word-in mr-[.24em] ${accent ? 'text-accent' : ''}`}
                style={{ animationDelay: `${80 + i * 90}ms` }}
              >
                {w}
              </span>
            ))}
          </h1>
          <p className="m-0 max-w-[520px] text-[clamp(18px,1.6vw,21px)] leading-[1.55] text-pretty text-ink2">
            Say what you ate. Rosie turns it into a kind, accurate meal log, with numbers from real
            food data.
          </p>
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex flex-col items-center gap-2">
              <a
                href={APP_URL}
                className="flex h-14 items-center gap-2 rounded-full bg-accent px-7 text-[17px] font-semibold text-bg no-underline hover:brightness-110"
              >
                Start free
                <Icon name="arrow_forward" />
              </a>
              <span className="text-[13px] text-ink2">
                Includes 14 days of Pro. No card needed.
              </span>
            </div>
            <a
              href={DEMO_URL}
              className="flex h-14 items-center gap-2 rounded-full border-[1.5px] border-line-strong bg-bg px-6 text-[17px] font-semibold text-ink no-underline hover:bg-surface"
            >
              <Icon name="explore" />
              Explore the demo
            </a>
          </div>
        </div>
        <PhoneMockup />
      </div>
    </section>
  )
}
