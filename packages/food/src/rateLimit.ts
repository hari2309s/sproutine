/** Thrown when a source's per-minute budget is used up; callers fall back. */
export class RateLimitedError extends Error {
  constructor(readonly source: string) {
    super(`${source} rate limit reached`)
    this.name = 'RateLimitedError'
  }
}

/** The caller used up their own share; distinct from the source being busy. */
export class UserRateLimitedError extends RateLimitedError {
  constructor(source: string) {
    super(source)
    this.name = 'UserRateLimitedError'
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
    /** True while any request is still inside the window. */
    busy(): boolean {
      const t = now()
      while (stamps.length && t - stamps[0]! >= 60_000) stamps.shift()
      return stamps.length > 0
    },
    /** Milliseconds until a slot frees up (0 if one is free now). */
    waitMs(): number {
      const t = now()
      while (stamps.length && t - stamps[0]! >= 60_000) stamps.shift()
      return stamps.length < maxPerMinute ? 0 : 60_000 - (t - stamps[0]!)
    },
  }
}

/**
 * One sliding-window limiter per key (e.g. per user), so one account can't
 * use up a budget every user shares. Idle keys are pruned as it goes.
 */
export function createKeyedRateLimiter(maxPerMinute: number, now: () => number = Date.now) {
  const buckets = new Map<string, ReturnType<typeof createRateLimiter>>()
  let lastPrune = now()
  return {
    tryAcquire(key: string): boolean {
      const t = now()
      if (t - lastPrune > 60_000) {
        for (const [k, b] of buckets) if (b.waitMs() === 0 && !b.busy()) buckets.delete(k)
        lastPrune = t
      }
      let bucket = buckets.get(key)
      if (!bucket) buckets.set(key, (bucket = createRateLimiter(maxPerMinute, now)))
      return bucket.tryAcquire()
    },
  }
}

/** Remembers keys for a while (e.g. barcodes OFF doesn't know). Bounded. */
export function createTtlSet(ttlMs: number, maxSize = 5000, now: () => number = Date.now) {
  const expiries = new Map<string, number>()
  return {
    has(key: string): boolean {
      const exp = expiries.get(key)
      if (exp == null) return false
      if (exp <= now()) {
        expiries.delete(key)
        return false
      }
      return true
    },
    add(key: string): void {
      if (expiries.size >= maxSize) {
        // Maps iterate in insertion order: drop the oldest entry.
        expiries.delete(expiries.keys().next().value!)
      }
      expiries.set(key, now() + ttlMs)
    },
  }
}
