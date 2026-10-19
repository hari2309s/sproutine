import { Ring } from '../Ring'
import { Card, CardTitle, Icon, Sprout } from '../ui'
import { MonthMock } from './MonthMock'

const AISLES: { name: string; items: [string, boolean][] }[] = [
  {
    name: 'Obst & Gemüse',
    items: [
      ['Cherry tomatoes', true],
      ['Cucumber', false],
    ],
  },
  {
    name: 'Kühlregal',
    items: [
      ['Quark, 500 g', false],
      ['Feta', false],
    ],
  },
  { name: 'Trockenwaren', items: [['Red lentils', true]] },
]

export function PlanCard() {
  return (
    <Card className="flex-[1_1_320px]">
      <CardTitle
        title="Plan the week, shop the aisle"
        body="Dinners that fit your diet and budget, and a list sorted the way your supermarket is laid out."
      />
      <div className="flex flex-1 flex-col gap-2.5 rounded-[22px] bg-surface p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold">Shopping list</span>
          <span className="flex h-7 items-center rounded-full border border-line bg-card px-2.5 text-xs font-semibold">
            Rewe · ≈ €38
          </span>
        </div>
        {AISLES.map((a) => (
          <div key={a.name} className="flex flex-col gap-1 rounded-[14px] bg-card px-3 py-2">
            <span className="text-[11px] font-bold tracking-[.06em] text-muted uppercase">
              {a.name}
            </span>
            {a.items.map(([t, done]) => (
              <span key={t} className="flex min-h-6 items-center gap-2 text-[13px]">
                <span
                  className={`flex size-[18px] flex-none items-center justify-center rounded-md ${
                    done ? 'bg-green' : 'border-[1.5px] border-line-strong'
                  }`}
                >
                  {done && <Icon name="check" size={14} className="text-bg" />}
                </span>
                <span className={done ? 'text-muted line-through' : ''}>{t}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </Card>
  )
}

export function CalendarCard() {
  const legend: [string, React.ReactNode][] = [
    ['Meals logged', <span key="g" className="size-2 rounded-full bg-green" />],
    ['Water goal met', <span key="b" className="size-2 rounded-full bg-blue" />],
    ['Nutrient goals hit', <span key="a" className="size-2 rounded-full bg-amber" />],
    [
      'A run of days',
      <span
        key="r"
        className="h-2.5 w-5 rounded-[5px] bg-green-soft shadow-[inset_0_0_0_1px_var(--line)]"
      />,
    ],
    ['Planned', <span key="p" className="size-2 rounded-full border-[1.5px] border-accent" />],
  ]
  return (
    <Card className="flex-[2_1_560px]">
      <CardTitle
        title="A calendar that grows with you"
        body="Each logged day grows a dot. Runs of days join into a soft green band. Missed days stay quiet."
      />
      <div className="flex flex-1 flex-wrap items-center gap-4 rounded-[22px] bg-surface p-4">
        <MonthMock />
        <ul className="m-0 flex flex-[1_1_160px] list-none flex-col gap-2.5 p-0 text-[13px] text-ink2">
          {legend.map(([label, swatch]) => (
            <li key={label} className="flex items-center gap-2">
              {swatch}
              {label}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

export function StreakCard() {
  return (
    <Card className="flex-[1_1_320px]">
      <CardTitle
        title="Streaks, gently"
        body="Small milestones get a little note from Rosie. A missed day is just a fresh start."
      />
      <div className="flex min-h-[200px] flex-1 items-center justify-center rounded-[22px] bg-surface px-[18px] pt-[22px] pb-[18px]">
        <div className="relative w-full max-w-[250px] -rotate-2">
          <span className="absolute top-[-10px] left-1/2 -ml-[35px] h-5 w-[70px] rotate-[4deg] rounded-[3px] bg-line opacity-85" />
          <div className="relative flex flex-col gap-1 overflow-hidden rounded-[8px_8px_24px_8px] bg-accent-soft px-4 pt-5 pb-4 shadow-soft">
            <span className="absolute top-5 left-[70%] size-[7px] rounded-full bg-green" />
            <span className="absolute top-11 left-[84%] h-[9px] w-1.5 rotate-[24deg] rounded-sm bg-accent" />
            <span className="absolute top-[58px] left-[62%] size-[5px] rounded-full bg-amber" />
            <span className="flex items-center gap-[5px] text-[11px] font-bold tracking-[.05em] text-ink2 uppercase">
              <Icon name="eco" size={15} className="text-accent" />
              Logging streak
            </span>
            <span className="font-display text-[44px] leading-none text-accent">7 days!</span>
            <span className="text-sm leading-[1.45]">
              A whole week of showing up. That&apos;s how routines start.
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}

const RINGS = [
  { color: 'var(--accent)', pct: 0.62, icon: 'bolt', label: 'kcal' },
  { color: 'var(--green)', pct: 0.83, icon: 'egg_alt', label: 'protein' },
  { color: 'var(--amber)', pct: 0.57, icon: 'bakery_dining', label: 'carbs' },
  { color: 'var(--blue)', pct: 0.75, icon: 'water_drop', label: 'water' },
] as const
const WEEK = [1720, 2110, 1950, 1520, 1790, 0, 1880]

export function GoalsCard() {
  return (
    <Card className="flex-[1_1_320px]">
      <CardTitle
        title="Water, goals & your week"
        body="Optional rings for the day and a calm review every Monday."
      />
      <div className="flex flex-1 flex-col gap-3.5 rounded-[22px] bg-surface p-4">
        <div className="grid grid-cols-4 gap-1">
          {RINGS.map((r, i) => (
            <span key={r.label} className="flex flex-col items-center gap-1">
              <Ring
                size={52}
                pct={r.pct}
                color={r.color}
                stroke={3.5}
                delay={i * 120}
                icon={r.icon}
                iconSize={18}
              />
              <span className="text-[11px] font-semibold text-ink2">{r.label}</span>
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-1.5 rounded-[14px] bg-card px-3 py-2.5">
          <span className="text-xs font-semibold">Your week</span>
          <div className="grid h-14 grid-cols-7 items-end gap-1.5">
            {WEEK.map((v, i) =>
              v ? (
                <span
                  key={i}
                  className="bar block rounded-t-[5px] bg-accent"
                  style={
                    {
                      '--h': `${Math.round((v / 2110) * 52)}px`,
                      '--delay': `${300 + i * 60}ms`,
                    } as React.CSSProperties
                  }
                />
              ) : (
                <span
                  key={i}
                  className="block h-2.5 rounded-t-[5px] border-[1.5px] border-b-0 border-dashed border-line-strong"
                />
              )
            )}
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

export function CalendarExportCard() {
  const events = [
    ['Lunch: Linseneintopf, Vollkornbrot', 'Tue 20 Oct · 12:30–13:15'],
    ['Dinner: Ofengemüse mit Feta', 'Tue 20 Oct · 19:00–19:45'],
  ]
  return (
    <Card className="flex-[1_1_320px]">
      <CardTitle
        title="In your calendar"
        body="Send planned meals to any calendar app, as a file or a live feed."
      />
      <div className="flex flex-1 flex-col justify-center gap-2.5 rounded-[22px] bg-surface p-4">
        {events.map(([title, when]) => (
          <div key={title} className="flex gap-2.5 rounded-[14px] bg-card px-3 py-2.5">
            <span className="w-1 flex-none rounded-sm bg-accent" />
            <span className="flex flex-col gap-0.5 leading-[1.35]">
              <span className="text-sm font-semibold">{title}</span>
              <span className="text-xs text-ink2">{when}</span>
            </span>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <span className="flex h-[30px] items-center gap-1 rounded-full border border-line-strong pr-2.5 pl-[7px] text-xs font-semibold">
            <Icon name="download" size={15} />
            .ics file
          </span>
          <span className="flex h-[30px] items-center gap-1 rounded-full border border-line-strong pr-2.5 pl-[7px] text-xs font-semibold">
            <Icon name="sync" size={15} />
            Live feed
          </span>
        </div>
      </div>
    </Card>
  )
}

export function OnThisDayCard() {
  return (
    <Card className="flex-[2_1_560px] justify-center">
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex-[1_1_260px]">
          <CardTitle
            title="“On this day”"
            body="Once in a while, Rosie brings back a meal you enjoyed a month ago. One tap logs it again."
          />
        </div>
        <div className="flex-[1_1_300px] rounded-[22px] bg-surface p-4">
          <div className="overflow-hidden rounded-[20px] border border-line bg-card">
            <div className="flex items-center gap-1.5 bg-surface px-3.5 py-2 text-[13px] font-semibold">
              <Icon name="history" size={18} className="text-accent" />
              On this day · 19 September
            </div>
            <div className="flex flex-col gap-2 px-3.5 pt-3 pb-3.5">
              <span className="text-xs text-ink2">One month ago, for lunch, you had</span>
              <span className="font-display text-[19px] leading-[1.2]">
                Kartoffelsuppe with rye bread
              </span>
              <span className="flex items-center gap-2">
                <Sprout size={24} />
                <span className="text-sm">Look how far you&apos;ve come!</span>
              </span>
              <span className="flex h-[38px] items-center gap-1.5 self-start rounded-full bg-accent pr-3.5 pl-2.5 text-[13px] font-semibold text-bg">
                <Icon name="replay" size={17} />
                Log it again
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
