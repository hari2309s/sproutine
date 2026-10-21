import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import {
  createServerClient,
  getUserIdByStripeCustomer,
  saveStripeSubscription,
} from '@sproutine/db'
import { customerIdOf, getStripe, pickSubscription, subscriptionState } from '@/lib/stripe'

export const runtime = 'nodejs'

const SUBSCRIPTION_EVENTS = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
])

type Db = ReturnType<typeof createServerClient>

/**
 * Mirrors a customer's subscription state onto their user. State is re-read
 * from Stripe rather than taken from the event, so retries and out-of-order
 * deliveries always store the latest. If the customer has several
 * subscriptions, the one that should decide access wins.
 */
async function syncCustomer(stripe: Stripe, db: Db, customer: string, checkoutUserId?: string) {
  // Checkout saves the customer before redirecting, so this lookup normally
  // succeeds; the checkout's client_reference_id covers a lagging write.
  const userId = (await getUserIdByStripeCustomer(db, customer)) ?? checkoutUserId ?? null
  if (!userId) {
    // The account was deleted (or never linked): nothing to store, don't retry.
    console.warn('[billing/webhook] no user for customer', customer)
    return
  }
  const { data } = await stripe.subscriptions.list({ customer, status: 'all', limit: 20 })
  const sub = pickSubscription(data)
  if (!sub) return
  await saveStripeSubscription(db, userId, customer, subscriptionState(sub))
}

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'Billing is not set up' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    const db = createServerClient()
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      if (session.mode === 'subscription' && session.customer) {
        await syncCustomer(
          stripe,
          db,
          customerIdOf(session.customer),
          session.client_reference_id ?? undefined
        )
      }
    } else if (SUBSCRIPTION_EVENTS.has(event.type)) {
      await syncCustomer(
        stripe,
        db,
        customerIdOf((event.data.object as Stripe.Subscription).customer)
      )
    }
    return NextResponse.json({ received: true })
  } catch (error) {
    // A 5xx makes Stripe retry the delivery.
    console.error('[billing/webhook]', event.type, error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Webhook handling failed' }, { status: 500 })
  }
}
