/**
 * Returns the ISO string of midnight on `date` in the given IANA timezone.
 * Uses Intl to resolve the offset, so it works correctly across DST boundaries.
 */
export function midnightInTz(date: Date, timezone: string): string {
  // Get the date string in the user's timezone (e.g. "2026-10-16")
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const y = parts.find((p) => p.type === 'year')!.value
  const m = parts.find((p) => p.type === 'month')!.value
  const d = parts.find((p) => p.type === 'day')!.value
  const dateStr = `${y}-${m}-${d}`

  // Compute the UTC offset at midnight in that timezone by formatting a
  // reference point and comparing. We use the longOffset format.
  const offsetStr = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'

  // offsetStr is like "GMT+02:00" or "GMT-05:00" or "GMT"
  const match = offsetStr.match(/GMT([+-]\d{2}):?(\d{2})/)
  if (!match) {
    // GMT+0 — just return midnight UTC
    return `${dateStr}T00:00:00.000Z`
  }
  const hoursOff = parseInt(match[1]!, 10)
  const minsOff = parseInt(match[2]!, 10) * Math.sign(hoursOff || 1)
  const totalOffsetMs = (hoursOff * 60 + minsOff) * 60_000
  const midnightUtc = new Date(`${dateStr}T00:00:00.000Z`)
  return new Date(midnightUtc.getTime() - totalOffsetMs).toISOString()
}
