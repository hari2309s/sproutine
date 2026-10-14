/** A moment as seen on a person's clock. */
export interface LocalTime {
  /** YYYY-MM-DD */
  date: string
  /** 0–23 */
  hour: number
  /** 0 = Monday … 6 = Sunday */
  weekday: number
}

export function localTime(now: Date, timeZone: string): LocalTime {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      hourCycle: 'h23',
      weekday: 'short',
    }).formatToParts(now)
  } catch {
    // An unknown zone falls back to Berlin rather than breaking the run.
    return localTime(now, 'Europe/Berlin')
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
    weekday: weekdays.indexOf(get('weekday')),
  }
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Monday of the week containing a YYYY-MM-DD date. */
export function mondayOf(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  return addDays(isoDate, -((d.getUTCDay() + 6) % 7))
}

/** ISO week key, e.g. 2026-W42. */
export function isoWeek(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Quiet hours: nothing is sent from 21:00 to 08:00 local time. */
export const QUIET_FROM = 21
export const QUIET_UNTIL = 8
export const isQuietHour = (hour: number) => hour >= QUIET_FROM || hour < QUIET_UNTIL
