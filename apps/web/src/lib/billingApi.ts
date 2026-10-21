import type { Entitlement } from '@sproutine/db'

export type { Entitlement }
export type BillingInterval = 'month' | 'year'

// Display prices only. What's charged comes from the Stripe price ids; keep
// these in step with them and with apps/landing/src/lib/pricing.ts.
const MONTHLY = 5.99
const YEARLY = 39.99
const euro = (n: number) => `€${n.toFixed(2)}`
export const PRICE_LABELS = {
  month: euro(MONTHLY),
  year: euro(YEARLY),
  yearPerMonth: euro(YEARLY / 12),
  yearlySaving: Math.round((1 - YEARLY / (MONTHLY * 12)) * 100),
}

export async function fetchEntitlement(): Promise<Entitlement> {
  const res = await fetch('/api/billing/entitlement', { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function redirectTo(path: string, body?: unknown): Promise<void> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const { url } = (await res.json()) as { url: string }
  window.location.assign(url)
}

/** Sends the user to Stripe Checkout for the chosen interval. */
export const startCheckout = (interval: BillingInterval) =>
  redirectTo('/api/billing/checkout', { interval })

/** Opens the Stripe customer portal (change plan, card, cancel). */
export const openBillingPortal = () => redirectTo('/api/billing/portal')

/** Whole days left until `iso`, rounded up; 0 once it has passed. */
export function daysUntil(iso: string | null, now = new Date()): number {
  if (!iso) return 0
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now.getTime()) / 86_400_000))
}
