// Server only: imported from route handlers, never from components.
import Stripe from 'stripe'
import type { StripeSubscriptionState } from '@sproutine/db'

let client: Stripe | null = null

/** Null when billing isn't configured, so routes can answer 503 instead of crashing. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  client ??= new Stripe(key)
  return client
}

export type BillingInterval = 'month' | 'year'

export function priceFor(interval: BillingInterval): string | null {
  return (
    (interval === 'year' ? process.env.STRIPE_PRICE_YEARLY : process.env.STRIPE_PRICE_MONTHLY) ??
    null
  )
}

/** The fields we mirror. Period dates live on the items in current API versions. */
export function subscriptionState(sub: Stripe.Subscription): StripeSubscriptionState {
  const item = sub.items.data[0]
  const iv: string | undefined = item?.price.recurring?.interval
  const periodEnd = item?.current_period_end
  return {
    subscriptionId: sub.id,
    status: sub.status,
    interval: iv === 'month' || iv === 'year' ? iv : null,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    // The portal may schedule a cancellation with cancel_at instead of the flag.
    cancelAtPeriodEnd: sub.cancel_at_period_end || !!sub.cancel_at,
  }
}

const PAID = new Set(['active', 'trialing', 'past_due'])
/** Statuses where a new checkout would create a second, overlapping subscription. */
export const LIVE_STATUSES = new Set([...PAID, 'incomplete', 'unpaid', 'paused'])

const periodEnd = (s: Stripe.Subscription) => s.items.data[0]?.current_period_end ?? 0

/**
 * The subscription that decides access when a customer has several: a paid
 * one with the latest period end, otherwise the most recently created.
 */
export function pickSubscription(subs: Stripe.Subscription[]): Stripe.Subscription | null {
  if (subs.length === 0) return null
  const paid = subs.filter((s) => PAID.has(s.status)).sort((a, b) => periodEnd(b) - periodEnd(a))
  return paid[0] ?? [...subs].sort((a, b) => b.created - a.created)[0]!
}

export const customerIdOf = (c: string | Stripe.Customer | Stripe.DeletedCustomer) =>
  typeof c === 'string' ? c : c.id
