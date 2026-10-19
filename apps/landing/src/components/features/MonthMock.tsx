// A static October 2026 for the calendar feature card.
const LOGGED = new Set([1, 2, 3, 4, 5, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19])
const WATER = new Set([1, 2, 4, 7, 8, 9, 12, 13, 14, 16, 17])
const GOALS = new Set([2, 3, 8, 13, 14, 17])
const PLANNED = new Set([20, 21, 22])
const TODAY = 19

// Mon 28 Sep → Sun 1 Nov: [day, belongs to another month]
const DAYS: [number, boolean][] = [
  [28, true],
  [29, true],
  [30, true],
  ...Array.from({ length: 31 }, (_, i): [number, boolean] => [i + 1, false]),
  [1, true],
]

export function MonthMock() {
  return (
    <div className="flex flex-[1_1_280px] flex-col gap-1.5" aria-hidden>
      <div className="flex items-baseline justify-between">
        <span className="font-display text-lg">October 2026</span>
        <span className="text-xs text-muted">Today · {TODAY}</span>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-muted">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {DAYS.map(([d, other], i) => {
          const col = i % 7
          const logged = !other && LOGGED.has(d)
          const joinLeft = logged && col > 0 && LOGGED.has(d - 1)
          const joinRight = logged && col < 6 && d < 31 && LOGGED.has(d + 1)
          return (
            <div key={i} className="relative flex h-9 flex-col items-center gap-[3px] pt-[3px]">
              {(joinLeft || joinRight) && (
                <span
                  className="absolute top-[3px] h-6 bg-green-soft"
                  style={{
                    left: joinLeft ? 0 : 4,
                    right: joinRight ? 0 : 4,
                    borderRadius: `${joinLeft ? 0 : 12}px ${joinRight ? 0 : 12}px ${joinRight ? 0 : 12}px ${joinLeft ? 0 : 12}px`,
                  }}
                />
              )}
              <span
                className={`relative flex size-6 items-center justify-center rounded-full text-[11px] ${
                  other
                    ? 'font-medium text-muted'
                    : d === TODAY
                      ? 'bg-card font-bold text-accent shadow-[inset_0_0_0_1.5px_var(--accent)]'
                      : 'font-medium text-ink'
                }`}
              >
                {d}
              </span>
              <span className="relative flex h-[5px] gap-0.5">
                {logged && <span className="block size-1 rounded-full bg-green" />}
                {!other && WATER.has(d) && <span className="block size-1 rounded-full bg-blue" />}
                {!other && GOALS.has(d) && <span className="block size-1 rounded-full bg-amber" />}
                {!other && PLANNED.has(d) && (
                  <span className="block size-[5px] rounded-full border border-accent" />
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
