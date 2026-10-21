import { describe, it, expect } from 'vitest'
import { entitlementFromRow, type SubscriptionRow } from '@sproutine/db'

const NOW = new Date('2026-10-21T12:00:00Z')
const row = (over: Partial<SubscriptionRow>): SubscriptionRow => ({
  trial_ends_at: '2026-10-01T00:00:00Z',
  stripe_customer_id: null,
  status: null,
  price_interval: null,
  current_period_end: null,
  cancel_at_period_end: false,
  ...over,
})

describe('entitlementFromRow', () => {
  it('treats a missing row as Free', () => {
    expect(entitlementFromRow(null, NOW)).toMatchObject({ plan: 'free', pro: false })
  })

  it('gives Pro during the trial', () => {
    const e = entitlementFromRow(row({ trial_ends_at: '2026-10-30T00:00:00Z' }), NOW)
    expect(e).toMatchObject({ plan: 'trial', pro: true })
  })

  it('drops to Free when the trial is over', () => {
    expect(entitlementFromRow(row({}), NOW)).toMatchObject({ plan: 'free', pro: false })
  })

  it('gives Pro for active and past_due subscriptions in the paid period', () => {
    for (const status of ['active', 'trialing', 'past_due']) {
      const e = entitlementFromRow(
        row({ status, current_period_end: '2026-11-21T00:00:00Z', stripe_customer_id: 'cus_1' }),
        NOW
      )
      expect(e).toMatchObject({ plan: 'pro', pro: true, hasCustomer: true })
    }
  })

  it('ends Pro when Stripe cancels or the period has passed', () => {
    expect(entitlementFromRow(row({ status: 'canceled' }), NOW).pro).toBe(false)
    expect(
      entitlementFromRow(row({ status: 'active', current_period_end: '2026-10-20T00:00:00Z' }), NOW)
        .pro
    ).toBe(false)
  })

  it('prefers a paid plan over a running trial', () => {
    const e = entitlementFromRow(
      row({ status: 'active', trial_ends_at: '2026-10-30T00:00:00Z', price_interval: 'year' }),
      NOW
    )
    expect(e).toMatchObject({ plan: 'pro', interval: 'year' })
  })
})
