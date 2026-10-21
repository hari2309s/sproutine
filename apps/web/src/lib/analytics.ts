import type { PostHog } from 'posthog-js'

// PostHog loads after mount (and remounts the tree when it does), so events
// that happen on first render, like returning from Stripe, are queued here and
// sent once the client is ready. Opted-out users still send nothing.
const QUEUE = 'sproutine-pending-events'

type Pending = { event: string; props?: Record<string, unknown> }

function readQueue(): Pending[] {
  try {
    return JSON.parse(sessionStorage.getItem(QUEUE) ?? '[]') as Pending[]
  } catch {
    return []
  }
}

export function queueEvent(event: string, props?: Record<string, unknown>) {
  try {
    sessionStorage.setItem(QUEUE, JSON.stringify([...readQueue(), { event, props }]))
  } catch {
    // Storage blocked: the event is lost, which only affects analytics.
  }
}

export function flushEvents(posthog: PostHog | undefined) {
  if (!posthog || !(posthog as { __loaded?: boolean }).__loaded) return
  const pending = readQueue()
  if (pending.length === 0) return
  try {
    sessionStorage.removeItem(QUEUE)
  } catch {
    return
  }
  for (const { event, props } of pending) posthog.capture(event, props)
}
