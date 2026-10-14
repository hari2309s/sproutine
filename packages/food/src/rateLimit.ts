/** Thrown when a source's per-minute budget is used up; callers fall back. */
export class RateLimitedError extends Error {
  constructor(readonly source: string) {
    super(`${source} rate limit reached`)
    this.name = 'RateLimitedError'
  }
}

/**
 * Sliding one-minute window. Non-blocking by design: in a request path it's
 * better to fall back to the cache or another source than to stall the user.
 * Per process, so it complements (not replaces) the foods cache.
 */
export function createRateLimiter(maxPerMinute: number, now: () => number = Date.now) {
  const stamps: number[] = []
  return {
    tryAcquire(): boolean {
      const t = now()
      while (stamps.length && t - stamps[0]! >= 60_000) stamps.shift()
      if (stamps.length >= maxPerMinute) return false
      stamps.push(t)
      return true
    },
    /** Milliseconds until a slot frees up (0 if one is free now). */
    waitMs(): number {
      const t = now()
      while (stamps.length && t - stamps[0]! >= 60_000) stamps.shift()
      return stamps.length < maxPerMinute ? 0 : 60_000 - (t - stamps[0]!)
    },
  }
}
