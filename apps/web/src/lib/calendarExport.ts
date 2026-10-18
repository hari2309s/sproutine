/** Get the current iCal feed token (or create one). */
export async function getFeedToken(): Promise<string> {
  const res = await fetch('/api/calendar/feed')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const { token } = (await res.json()) as { token: string }
  return token
}

/** Reset (rotate) the feed token. Returns the new token. */
export async function resetFeedToken(): Promise<string> {
  const res = await fetch('/api/calendar/feed', { method: 'POST' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const { token } = (await res.json()) as { token: string }
  return token
}

/** Revoke the feed token entirely (disables the public iCal feed). */
export async function revokeFeedToken(): Promise<void> {
  const res = await fetch('/api/calendar/feed', { method: 'DELETE' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

/**
 * Download an .ics file for the given range of planned meals.
 * Triggers a browser download via a temporary anchor element.
 */
export async function downloadIcs(range: '7' | '14' | 'all'): Promise<void> {
  const res = await fetch(`/api/calendar/export?range=${encodeURIComponent(range)}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sproutine-meals-${range === 'all' ? 'all' : range + 'd'}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
