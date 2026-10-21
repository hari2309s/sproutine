import type { createServerClient } from './client'

type Db = ReturnType<typeof createServerClient>

export type Plan = 'pro' | 'trial' | 'free'

export interface Entitlement {
  plan: Plan
  /** Pro or trial: Rosie, voice, photo and free-text planning are available. */
  pro: boolean
  trialEndsAt: string | null
  status: string | null
  interval: 'month' | 'year' | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  /** Whether a Stripe customer exists, so the billing portal can open. */
  hasCustomer: boolean
}

// Stripe keeps a subscription past_due while it retries the card; access
// continues during those retries and ends when Stripe cancels it.
const PAID_STATUSES = new Set(['active', 'trialing', 'past_due'])

export interface SubscriptionRow {
  trial_ends_at: string
  stripe_customer_id: string | null
  status: string | null
  price_interval: 'month' | 'year' | null
  current_period_end: string | null
  cancel_at_period_end: boolean
}

/** Pure plan logic. A missing row means Free, never Pro. */
export function entitlementFromRow(data: SubscriptionRow | null, now = new Date()): Entitlement {
  const paid =
    !!data?.status &&
    PAID_STATUSES.has(data.status) &&
    (!data.current_period_end || new Date(data.current_period_end) > now)
  const inTrial = !!data && new Date(data.trial_ends_at) > now
  const plan: Plan = paid ? 'pro' : inTrial ? 'trial' : 'free'
  return {
    plan,
    pro: plan !== 'free',
    trialEndsAt: data?.trial_ends_at ?? null,
    status: data?.status ?? null,
    interval: data?.price_interval ?? null,
    currentPeriodEnd: data?.current_period_end ?? null,
    cancelAtPeriodEnd: data?.cancel_at_period_end ?? false,
    hasCustomer: !!data?.stripe_customer_id,
  }
}

/** Plan for a user. Throws on DB errors so callers fail closed. */
export async function getEntitlement(
  db: Db,
  userId: string,
  now = new Date()
): Promise<Entitlement> {
  const { data, error } = await db
    .from('subscriptions')
    .select(
      'trial_ends_at, stripe_customer_id, status, price_interval, current_period_end, cancel_at_period_end'
    )
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`billing.getEntitlement: ${error.message}`)
  return entitlementFromRow(data, now)
}

export async function getStripeCustomerId(db: Db, userId: string): Promise<string | null> {
  const { data, error } = await db
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`billing.getStripeCustomerId: ${error.message}`)
  return data?.stripe_customer_id ?? null
}

/** Links a Stripe customer to the user, creating the row if the trigger never ran. */
export async function saveStripeCustomerId(
  db: Db,
  userId: string,
  customerId: string
): Promise<void> {
  const { error } = await db
    .from('subscriptions')
    .upsert(
      { user_id: userId, stripe_customer_id: customerId, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  if (error) throw new Error(`billing.saveStripeCustomerId: ${error.message}`)
}

export interface StripeSubscriptionState {
  subscriptionId: string
  status: string
  interval: 'month' | 'year' | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

/** Mirrors Stripe's latest subscription state onto the user's row. */
export async function saveStripeSubscription(
  db: Db,
  userId: string,
  customerId: string,
  s: StripeSubscriptionState
): Promise<void> {
  const { error } = await db.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: s.subscriptionId,
      status: s.status,
      price_interval: s.interval,
      current_period_end: s.currentPeriodEnd,
      cancel_at_period_end: s.cancelAtPeriodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (error) throw new Error(`billing.saveStripeSubscription: ${error.message}`)
}

export async function getUserIdByStripeCustomer(
  db: Db,
  customerId: string
): Promise<string | null> {
  const { data, error } = await db
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  if (error) throw new Error(`billing.getUserIdByStripeCustomer: ${error.message}`)
  return data?.user_id ?? null
}
