import { describe, it, expect } from 'vitest'
import type Stripe from 'stripe'
import { pickSubscription, subscriptionState } from '../stripe'

const sub = (over: Partial<Stripe.Subscription>, interval = 'year', periodEnd = 1_800_000_000) =>
  ({
    id: 'sub_1',
    status: 'active',
    cancel_at_period_end: false,
    cancel_at: null,
    items: { data: [{ price: { recurring: { interval } }, current_period_end: periodEnd }] },
    ...over,
  }) as unknown as Stripe.Subscription

describe('subscriptionState', () => {
  it('reads interval and period end from the first item', () => {
    expect(subscriptionState(sub({}))).toEqual({
      subscriptionId: 'sub_1',
      status: 'active',
      interval: 'year',
      currentPeriodEnd: new Date(1_800_000_000 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
    })
  })

  it('maps intervals other than month or year to null', () => {
    expect(subscriptionState(sub({}, 'week')).interval).toBeNull()
  })

  it('treats a scheduled cancel_at as cancelling at period end', () => {
    expect(subscriptionState(sub({ cancel_at: 1_800_000_000 })).cancelAtPeriodEnd).toBe(true)
  })
})

describe('pickSubscription', () => {
  const s = (id: string, status: string, end: number, created: number) =>
    ({
      id,
      status,
      created,
      items: { data: [{ current_period_end: end }] },
    }) as unknown as Stripe.Subscription

  it('prefers a paid subscription with the latest period end', () => {
    const picked = pickSubscription([
      s('a', 'active', 100, 1),
      s('b', 'canceled', 500, 3),
      s('c', 'past_due', 300, 2),
    ])
    expect(picked?.id).toBe('c')
  })

  it('falls back to the newest when none are paid', () => {
    expect(pickSubscription([s('a', 'canceled', 100, 1), s('b', 'canceled', 50, 2)])?.id).toBe('b')
  })

  it('returns null for no subscriptions', () => {
    expect(pickSubscription([])).toBeNull()
  })
})
