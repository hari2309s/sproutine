import { beforeEach, describe, expect, it, vi } from 'vitest'
import Stripe from 'stripe'
import { NextRequest } from 'next/server'

const SECRET = 'whsec_test'
const db = { saved: [] as unknown[][], userId: 'user-1' as string | null }

vi.mock('@sproutine/db', () => ({
  createServerClient: () => ({}),
  getUserIdByStripeCustomer: async () => db.userId,
  saveStripeSubscription: async (...args: unknown[]) => {
    db.saved.push(args)
  },
}))

const real = new Stripe('sk_test_dummy')
let customerSubs: unknown[] = []
vi.mock('@/lib/stripe', async () => {
  const actual = await vi.importActual<typeof import('../stripe')>('../stripe')
  return {
    ...actual,
    getStripe: () => ({
      webhooks: real.webhooks,
      subscriptions: { list: async () => ({ data: customerSubs }) },
    }),
  }
})

const sub = (id: string, status: string, periodEnd = 1_800_000_000, created = 1) => ({
  id,
  status,
  created,
  customer: 'cus_1',
  metadata: {},
  cancel_at_period_end: false,
  cancel_at: null,
  items: { data: [{ price: { recurring: { interval: 'month' } }, current_period_end: periodEnd }] },
})

async function post(event: object, signature?: string) {
  const { POST } = await import('../../app/api/billing/webhook/route')
  const payload = JSON.stringify(event)
  const header = signature ?? real.webhooks.generateTestHeaderString({ payload, secret: SECRET })
  return POST(
    new NextRequest('http://localhost/api/billing/webhook', {
      method: 'POST',
      body: payload,
      headers: { 'stripe-signature': header },
    })
  )
}

const saved = () => db.saved.map((args) => args[3])

describe('billing webhook', () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRET
    db.saved = []
    db.userId = 'user-1'
    customerSubs = []
  })

  it('rejects a bad signature', async () => {
    const res = await post(
      { type: 'customer.subscription.updated', data: { object: { customer: 'cus_1' } } },
      't=1,v1=bad'
    )
    expect(res.status).toBe(400)
    expect(db.saved).toHaveLength(0)
  })

  it('stores the subscription after checkout', async () => {
    customerSubs = [sub('sub_1', 'active')]
    const res = await post({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: { object: { mode: 'subscription', customer: 'cus_1', client_reference_id: 'user-1' } },
    })
    expect(res.status).toBe(200)
    expect(saved()).toEqual([
      expect.objectContaining({ subscriptionId: 'sub_1', status: 'active' }),
    ])
  })

  it('keeps Pro while another subscription is still paid', async () => {
    customerSubs = [
      sub('sub_old', 'canceled', 1_700_000_000, 1),
      sub('sub_new', 'active', 1_800_000_000, 2),
    ]
    const res = await post({
      id: 'evt_2',
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_old', customer: 'cus_1' } },
    })
    expect(res.status).toBe(200)
    expect(saved()).toEqual([
      expect.objectContaining({ subscriptionId: 'sub_new', status: 'active' }),
    ])
  })

  it('skips events for a deleted account without asking Stripe to retry', async () => {
    db.userId = null
    customerSubs = [sub('sub_1', 'canceled')]
    const res = await post({
      id: 'evt_3',
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_1', customer: 'cus_1' } },
    })
    expect(res.status).toBe(200)
    expect(db.saved).toHaveLength(0)
  })
})
