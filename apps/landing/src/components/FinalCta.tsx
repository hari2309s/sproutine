import { APP_URL } from '@/lib/config'
import { Icon, Sprout } from './ui'

export function FinalCta() {
  return (
    <section className="mx-auto max-w-[1200px] px-[clamp(20px,5vw,48px)] py-[clamp(72px,10vw,128px)]">
      <div
        data-reveal
        className="relative flex flex-col items-center gap-5 overflow-hidden rounded-[clamp(28px,4vw,40px)] bg-accent-soft px-[clamp(24px,5vw,64px)] py-[clamp(40px,7vw,80px)] text-center"
      >
        <span
          aria-hidden
          className="absolute -top-15 -right-15 size-60 rounded-[50%_46%_54%_50%] bg-bg opacity-35"
        />
        <Sprout size={120} alt="Rosie, the Sproutine sprout" className="relative" />
        <h2 className="relative m-0 max-w-[760px] font-display text-[clamp(34px,5vw,64px)] leading-[1.05] font-normal text-balance">
          Ready when you are. Start with one meal.
        </h2>
        <p className="relative m-0 max-w-[520px] text-lg leading-[1.55] text-ink2">
          Look around the demo first if you like. Works in any browser, and you can add it to your
          home screen.
        </p>
        <a
          href={APP_URL}
          className="relative flex h-14 items-center gap-2 rounded-full bg-accent px-[30px] text-[17px] font-semibold text-bg no-underline hover:brightness-110"
        >
          Start free
          <Icon name="arrow_forward" />
        </a>
        <span className="relative -mt-2 text-sm text-ink2">
          Includes 14 days of Pro. No card needed.
        </span>
      </div>
    </section>
  )
}
