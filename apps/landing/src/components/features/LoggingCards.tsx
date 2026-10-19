import { Card, CardTitle, Icon, Sprout } from '../ui'

const BARCODE = [3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3]

export function SearchCard() {
  return (
    <Card className="flex-[2_1_560px]">
      <CardTitle
        title="Search or scan"
        body="Logging works without any AI. Search real German food data, pick a portion, done. Free, always."
      />
      <div className="flex flex-1 flex-wrap items-start gap-3.5 rounded-[22px] bg-surface p-4">
        <div className="flex flex-[1_1_260px] flex-col gap-2">
          <div className="flex h-12 items-center gap-2 rounded-2xl border-2 border-accent bg-card pr-1.5 pl-3">
            <Icon name="search" className="text-ink2" />
            <span className="flex-1 text-[15px]">
              Vollkornbrot
              <span className="ml-0.5 inline-block h-4 w-0.5 bg-ink align-[-2px]" />
            </span>
            <span className="flex size-9 items-center justify-center rounded-full bg-surface text-ink2">
              <Icon name="barcode_scanner" />
            </span>
          </div>
          <div className="flex flex-col rounded-2xl bg-card">
            <div className="flex min-h-[52px] items-center gap-2.5 rounded-t-2xl bg-accent-soft px-3 py-1.5">
              <span className="flex flex-1 flex-col leading-[1.3]">
                <span className="text-sm font-semibold">Vollkornbrot</span>
                <span className="text-xs text-ink2">BLS 4.0 · 216 kcal / 100 g</span>
              </span>
              <Icon name="check_circle" className="text-accent" />
            </div>
            <div className="flex min-h-[52px] items-center gap-2.5 border-t border-line px-3 py-1.5">
              <span className="flex flex-1 flex-col leading-[1.3]">
                <span className="text-sm font-semibold">Roggenvollkornbrot</span>
                <span className="text-xs text-ink2">Open Food Facts · 199 kcal / 100 g</span>
              </span>
              <Icon name="add_circle" className="text-muted" />
            </div>
          </div>
        </div>
        <div className="flex flex-[1_1_200px] flex-col gap-2.5 rounded-2xl bg-card p-3">
          <span className="text-xs font-bold tracking-[.06em] text-muted uppercase">How much?</span>
          <div className="flex items-center justify-between gap-2">
            <span className="flex size-11 items-center justify-center rounded-full border-[1.5px] border-line-strong">
              <Icon name="remove" />
            </span>
            <span className="flex items-baseline gap-[3px]">
              <span className="font-display text-[30px] leading-none">50</span>
              <span className="text-sm text-ink2">g</span>
            </span>
            <span className="flex size-11 items-center justify-center rounded-full border-[1.5px] border-line-strong">
              <Icon name="add" />
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="flex h-8 items-center gap-[3px] rounded-full border-[1.5px] border-accent bg-accent-soft pr-2.5 pl-1.5 text-xs font-semibold">
              <Icon name="check" size={14} className="text-accent" />1 Scheibe
            </span>
            <span className="flex h-8 items-center rounded-full border border-line-strong px-2.5 text-xs font-medium">
              2 Scheiben
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}

function Corner({ pos }: { pos: string }) {
  return <span className={`absolute size-[26px] border-accent ${pos}`} />
}

export function ScanCard() {
  return (
    <Card className="flex-[1_1_320px]">
      <CardTitle
        title="Scan the pack"
        body="Point at a barcode and the product comes up with its real label values."
      />
      <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-3.5 rounded-[22px] bg-surface p-[18px]">
        <div className="relative flex h-24 w-[180px] items-center justify-center">
          <Corner pos="top-0 left-0 rounded-tl-xl border-t-[3px] border-l-[3px]" />
          <Corner pos="top-0 right-0 rounded-tr-xl border-t-[3px] border-r-[3px]" />
          <Corner pos="bottom-0 left-0 rounded-bl-xl border-b-[3px] border-l-[3px]" />
          <Corner pos="right-0 bottom-0 rounded-br-xl border-r-[3px] border-b-[3px]" />
          <span className="flex h-[52px] items-stretch gap-0.5">
            {BARCODE.map((w, i) => (
              <span key={i} className="block rounded-[1px] bg-ink" style={{ width: w * 1.6 }} />
            ))}
          </span>
          <span className="absolute inset-x-3.5 top-[47px] h-0.5 rounded-[1px] bg-accent" />
        </div>
        <span className="flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-card pr-3.5 pl-2.5 text-[13px] font-semibold">
          <Icon name="check_circle" size={18} className="text-green" />
          Speisequark 20% · Open Food Facts
        </span>
      </div>
    </Card>
  )
}

export function TalkCard() {
  const rows: [string, number][] = [
    ['Rye bread', 100],
    ['Quark, 20% fat', 150],
  ]
  return (
    <Card className="flex-[2_1_560px]">
      <CardTitle
        pro
        title="Talk, don't type"
        body="Hold the mic and say it like you'd tell a friend. Rosie finds the foods, you check the grams."
      />
      <div className="flex flex-1 flex-wrap items-end gap-4 rounded-[22px] bg-surface p-[18px]">
        <div className="flex flex-[1_1_200px] flex-col items-end gap-2.5">
          <span className="max-w-[260px] rounded-[20px_20px_6px_20px] bg-accent px-3.5 py-2.5 text-sm leading-[1.45] text-bg">
            Two slices of rye bread with Quark
          </span>
          <span className="flex items-center gap-2 text-xs text-ink2">
            <Icon name="graphic_eq" size={16} className="text-accent" />
            Said at 12:40
          </span>
        </div>
        <div className="flex-[1_1_240px] overflow-hidden rounded-[20px] border border-line bg-card">
          <div className="flex items-center gap-1.5 bg-surface px-3.5 py-2 text-[13px] font-semibold">
            <Icon name="restaurant" size={18} className="text-accent" />
            Lunch
          </div>
          <div className="flex flex-col px-3.5 py-1">
            {rows.map(([name, g], i) => (
              <div
                key={name}
                className={`flex min-h-11 items-center gap-2 text-sm ${i ? 'border-t border-line' : ''}`}
              >
                <span className="flex-1 font-semibold">{name}</span>
                <span className="flex h-[34px] min-w-[70px] items-center justify-between rounded-[10px] border border-line-strong px-2.5 font-semibold">
                  {g}
                  <span className="font-normal text-muted">g</span>
                </span>
              </div>
            ))}
          </div>
          <div className="px-3 pt-1 pb-3">
            <span className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-accent text-sm font-semibold text-bg">
              <Icon name="check" size={18} />
              Save to Today
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}

export function PhotoCard() {
  return (
    <Card className="flex-[1_1_320px]">
      <CardTitle
        pro
        title="Snap your plate"
        body="Take a photo and Rosie suggests what's on it. Portions are marked as estimates."
      />
      <div className="flex flex-1 flex-col gap-2.5 rounded-[22px] bg-surface p-4">
        <div className="w-[150px] self-end rounded-[20px_20px_6px_20px] bg-accent p-[5px]">
          <div className="flex h-[104px] items-center justify-center overflow-hidden rounded-[15px_15px_3px_15px] bg-card">
            <Sprout size={120} alt="A photo of a plate of Brussels sprouts" />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Sprout size={24} />
          <span className="flex flex-col gap-1.5">
            <span className="text-sm leading-[1.45]">
              Looks like roasted Brussels sprouts! About 150 g?
            </span>
            <span className="flex h-[26px] items-center gap-1 self-start rounded-full border border-dashed border-line-strong pr-[9px] pl-1.5 text-[11px] font-semibold text-ink2">
              <Icon name="photo_camera" size={14} />
              Estimated portions
            </span>
          </span>
        </div>
      </div>
    </Card>
  )
}
