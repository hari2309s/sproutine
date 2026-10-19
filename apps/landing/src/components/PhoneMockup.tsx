import { Ring } from './Ring'
import { Icon, ProPill, Sprout } from './ui'
import type { IconName } from '@/lib/icons'

const MEALS: { icon: IconName; label: string; name: string; kcal: string }[] = [
  {
    icon: 'wb_twilight',
    label: 'Breakfast · 08:10',
    name: 'Overnight oats, banana',
    kcal: '420 kcal',
  },
  { icon: 'light_mode', label: 'Lunch · 12:40', name: 'Lentil salad with feta', kcal: '385 kcal' },
]

const TABS: { icon: IconName; label: string; active?: boolean }[] = [
  { icon: 'wb_sunny', label: 'Today', active: true },
  { icon: 'calendar_month', label: 'Week' },
  { icon: 'monitor_weight', label: 'Body' },
  { icon: 'chat_bubble', label: 'Chat' },
]

const WAVE = [8, 14, 20, 12, 22, 16, 9, 18, 24, 12, 16, 8]

function TodayScreen() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[40px] bg-bg text-ink">
      <div className="flex h-9 flex-none items-center justify-between px-6 text-xs font-semibold">
        <span>9:41</span>
        <span className="h-[9px] w-5 rounded-[3px] border-[1.5px] border-ink opacity-70" />
      </div>
      <div className="flex flex-none items-center gap-2 px-4 pt-1 pb-2">
        <Sprout size={28} />
        <span className="flex-1 font-display text-base">Sproutine</span>
        <Icon name="tune" className="text-ink2" />
      </div>
      <div className="flex flex-1 flex-col gap-2.5 px-3.5 py-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-muted">Monday, 19 October</span>
          <span className="font-display text-[23px] leading-[1.1]">Good morning, Hari</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="eco" size={16} filled />
          </span>
          <span className="font-display text-[21px] leading-none">12</span>
          <span className="text-xs text-ink2">day streak</span>
        </div>
        <div className="flex min-h-12 items-center gap-2.5 rounded-full bg-surface py-[5px] pr-[5px] pl-[7px]">
          <Ring size={36} pct={0.625} color="var(--green)" icon="water_drop" iconSize={15} />
          <span className="flex flex-1 flex-col leading-tight">
            <span className="text-[13px] font-semibold">Water</span>
            <span className="text-[11px] text-ink2">5 of 8 glasses</span>
          </span>
          <span className="flex size-[34px] items-center justify-center rounded-full border border-line-strong bg-card text-accent">
            <Icon name="add" size={18} />
          </span>
        </div>
        {MEALS.map((m) => (
          <div
            key={m.label}
            className="flex items-center gap-2.5 rounded-2xl border border-line bg-card px-3 py-[9px]"
          >
            <Icon name={m.icon} size={19} className="text-ink2" />
            <span className="flex flex-1 flex-col leading-[1.3]">
              <span className="text-[10px] font-semibold tracking-[.05em] text-muted uppercase">
                {m.label}
              </span>
              <span className="text-[13px]">{m.name}</span>
            </span>
            <span className="text-[11px] text-ink2">{m.kcal}</span>
          </div>
        ))}
        <div className="flex items-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-line-strong px-3 py-[9px]">
          <Icon name="dark_mode" size={19} className="text-muted" />
          <span className="flex flex-1 flex-col leading-[1.3]">
            <span className="text-[10px] font-semibold tracking-[.05em] text-muted uppercase">
              Dinner
            </span>
            <span className="text-[13px] text-ink2">Nothing yet</span>
          </span>
        </div>
      </div>
      <div className="grid h-[58px] flex-none grid-cols-4 border-t border-line bg-surface pt-1.5 pb-2.5">
        {TABS.map((t) => (
          <span
            key={t.label}
            className={`flex flex-col items-center gap-px text-[9px] ${t.active ? 'font-bold text-accent' : 'text-muted'}`}
          >
            <span
              className={`flex h-[22px] items-center justify-center ${t.active ? 'w-10 rounded-full bg-accent-soft' : ''}`}
            >
              <Icon name={t.icon} size={16} filled={t.active} />
            </span>
            {t.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function PhoneMockup() {
  return (
    <div data-reveal aria-hidden className="relative flex min-h-[640px] justify-center pt-6 pb-2">
      <div
        className="float h-[620px] w-[300px] flex-none rounded-[48px] bg-bezel p-2 shadow-lift"
        style={{ '--float': '-10px', '--float-dur': '3.9s' } as React.CSSProperties}
      >
        <TodayScreen />
      </div>

      <div
        className="float absolute top-[120px] left-[max(0px,calc(50%-250px))] flex max-w-[236px] items-start gap-2.5 rounded-[20px_20px_20px_6px] border border-line bg-card px-3.5 py-3 shadow-soft"
        style={
          {
            '--float': '-6px',
            '--float-dur': '4.6s',
            animationDelay: '600ms',
          } as React.CSSProperties
        }
      >
        <Sprout size={32} />
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-ink2">Rosie</span>
            <ProPill size="sm" />
          </span>
          <span className="text-sm leading-[1.45]">Logged your overnight oats. Lovely start!</span>
        </span>
      </div>

      <div
        className="float absolute right-[max(0px,calc(50%-240px))] bottom-[110px] flex h-[52px] items-center gap-2.5 rounded-full bg-accent pr-[18px] pl-2 text-bg shadow-soft"
        style={
          {
            '--float': '-6px',
            '--float-dur': '5.3s',
            animationDelay: '900ms',
          } as React.CSSProperties
        }
      >
        <span className="flex size-[38px] items-center justify-center rounded-full bg-bg text-accent">
          <Icon name="mic" filled />
        </span>
        <span className="flex h-6 items-center gap-[3px]">
          {WAVE.map((h, i) => (
            <span key={i} className="block w-[3px] rounded-sm bg-bg" style={{ height: h }} />
          ))}
        </span>
        <span className="text-[13px] font-semibold">0:04</span>
      </div>
    </div>
  )
}
