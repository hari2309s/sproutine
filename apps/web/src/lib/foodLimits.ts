import { createKeyedRateLimiter, createTtlSet } from '@sproutine/food'

// Shared by the food routes, per server process. Open Food Facts allows
// ~15 product reads and 10 searches a minute per IP, shared by every user, so
// no single account may take more than a small slice of it. Cache hits don't
// count against the external share.

/** Route calls per user per minute (cache hits included). */
export const foodRequestLimiter = createKeyedRateLimiter(30)
/** External lookups (OFF/USDA) per user per minute. */
export const foodExternalLimiter = createKeyedRateLimiter(4)
/** Barcodes OFF didn't know; not retried for 6 hours. */
export const unknownBarcodes = createTtlSet(6 * 60 * 60 * 1000)

/** Daily cap per user (Supabase user_usage, kind 'food'). */
export const FOOD_DAILY_LIMIT = 300
