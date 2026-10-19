import type { IconName } from '@/lib/icons'
import { Eyebrow, Icon } from './ui'

const POINTS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'spa',
    title: 'Gentle mode hides every number',
    body: 'Calories, grams, weight and goals all disappear. What’s left is your meals, your rhythm and kind words.',
  },
  {
    icon: 'support_agent',
    title: 'Human words for hard moments',
    body: 'If you mention a crisis or disordered eating, Rosie replies with a message written and reviewed by people, with German helplines like TelefonSeelsorge 0800 111 0 111.',
  },
  {
    icon: 'shield_lock',
    title: 'Nothing reaches an AI without consent',
    body: 'Your health data is only sent to a model if you’ve said yes. You can download or delete everything, any time.',
  },
]

function Preview({ gentle }: { gentle?: boolean }) {
  return (
    <div className="flex flex-[1_1_240px] flex-col gap-2.5">
      <span
        className={`flex h-[30px] items-center gap-1 self-start rounded-full border border-line-strong text-[13px] font-semibold ${
          gentle ? 'bg-card pr-3 pl-2' : 'px-3 text-ink2'
        }`}
      >
        {gentle && <Icon name="spa" size={16} className="text-green" />}
        {gentle ? 'Gentle mode' : 'Normal'}
      </span>
      <div className="flex flex-col gap-3 rounded-3xl border border-line bg-bg p-4 shadow-soft">
        <span className="font-display text-xl">Good afternoon, Hari</span>
        {gentle ? (
          <>
            <span className="flex items-center gap-2">
              <Icon name="eco" size={18} className="text-green" />
              <span className="text-sm font-semibold">Checking in most days</span>
            </span>
            <div className="rounded-[14px] bg-card px-3 py-2.5 text-[13px] leading-normal">
              Breakfast, lunch and a snack, with something green twice. A lovely rhythm.
            </div>
            <div className="rounded-[14px] bg-card px-3 py-2.5 text-[13px]">
              Lentil salad with feta
            </div>
          </>
        ) : (
          <>
            <span className="flex items-center gap-2">
              <Icon name="eco" size={18} filled className="text-accent" />
              <span className="font-display text-xl">12</span>
              <span className="text-[13px] text-ink2">day streak</span>
            </span>
            <div className="grid grid-cols-4 gap-1 rounded-[14px] bg-card px-2 py-2.5">
              {[
                ['1,240', 'kcal'],
                ['58 g', 'protein'],
                ['142 g', 'carbs'],
                ['41 g', 'fat'],
              ].map(([v, l]) => (
                <span key={l} className="flex flex-col items-center">
                  <b className="text-sm">{v}</b>
                  <span className="text-[11px] text-ink2">{l}</span>
                </span>
              ))}
            </div>
            <div className="flex justify-between rounded-[14px] bg-card px-3 py-2.5 text-[13px]">
              <span>Lentil salad with feta</span>
              <span className="text-ink2">385 kcal</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function Safety() {
  return (
    <section id="safety" className="mt-[clamp(72px,10vw,128px)] border-y border-line bg-surface">
      <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-center gap-[clamp(40px,6vw,72px)] px-[clamp(20px,5vw,48px)] py-[clamp(64px,9vw,112px)]">
        <div data-reveal className="flex flex-col gap-[22px]">
          <Eyebrow>Safety &amp; gentle mode</Eyebrow>
          <h2 className="m-0 font-display text-[clamp(34px,4.6vw,56px)] leading-[1.06] font-normal text-balance">
            Built for good days and hard ones.
          </h2>
          <ul className="m-0 flex list-none flex-col gap-[18px] p-0">
            {POINTS.map((p) => (
              <li key={p.title} className="flex items-start gap-3.5">
                <span className="flex size-11 flex-none items-center justify-center rounded-full bg-card text-green">
                  <Icon name={p.icon} size={22} />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-[17px] font-semibold">{p.title}</span>
                  <span className="text-[15px] leading-[1.55] text-ink2">{p.body}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-3 rounded-[20px] border border-line bg-card px-4 py-3.5">
            <Icon name="lock_open" size={22} className="text-green" />
            <span className="text-[15px] leading-[1.55]">
              <b>Safety features are never behind a paywall.</b> Gentle mode, helplines and your
              data are always free.
            </span>
          </div>
        </div>
        <div data-reveal className="flex flex-wrap gap-4">
          <Preview />
          <Preview gentle />
        </div>
      </div>
    </section>
  )
}
