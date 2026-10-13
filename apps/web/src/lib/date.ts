export function toDateLocale(_locale: string): string {
  return 'en-GB'
}

export function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

export function formatYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function parseDateRange(
  message: string,
  today: Date
): { from: string; to: string; explicit: boolean } {
  const msg = message.toLowerCase()
  const yyyy = today.getFullYear()
  const currentMonth = formatYearMonth(yyyy, today.getMonth() + 1)

  const wordNum: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
  }

  // "last year" / "previous year"
  if (/\b(last|previous)\s+year\b/.test(msg)) {
    const prevYear = yyyy - 1
    return { from: `${prevYear}-01`, to: `${prevYear}-12`, explicit: true }
  }

  // "this year" / "year so far" / "year to date" / "ytd"
  if (/\bthis\s+year\b|\byear\s+so\s+far\b|\byear\s+to\s+date\b|\bytd\b/.test(msg)) {
    return { from: `${yyyy}-01`, to: currentMonth, explicit: true }
  }

  // "last N months" / "past N months" — digits or number words
  const lastNMatch = msg.match(
    /\b(last|past)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+months?\b/
  )
  if (lastNMatch) {
    const raw = lastNMatch[2]!
    const n = /^\d+$/.test(raw) ? parseInt(raw, 10) : (wordNum[raw] ?? 1)
    const fromDate = new Date(yyyy, today.getMonth() - (n - 1), 1)
    return {
      from: formatYearMonth(fromDate.getFullYear(), fromDate.getMonth() + 1),
      to: currentMonth,
      explicit: true,
    }
  }

  // "last month" / "previous month"
  if (/\b(last|previous)\s+month\b/.test(msg)) {
    const prevDate = new Date(yyyy, today.getMonth() - 1, 1)
    const ym = formatYearMonth(prevDate.getFullYear(), prevDate.getMonth() + 1)
    return { from: ym, to: ym, explicit: true }
  }

  // No time expression detected
  return { from: currentMonth, to: currentMonth, explicit: false }
}
