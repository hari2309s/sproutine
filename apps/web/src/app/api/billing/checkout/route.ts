import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  createServerClient,
  getEntitlement,
  getStripeCustomerId,
  saveStripeCustomerId,
} from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'
import { getStripe, LIVE_STATUSES, priceFor } from '@/lib/stripe'

export const runtime = 'nodejs'

const Body = z.object({ interval: z.enum(['month', 'year']) })

// Shown above the pay button. Draft wording: have it reviewed for German
// consumer law (withdrawal right for a service that starts immediately).
const SUBMIT_NOTE =
  'Pro starts right away. You can withdraw within 14 days and pay only for the days you used. Cancel anytime in Settings.'

/** Starts Stripe Checkout for Pro. Returns the URL to redirect to. */
export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const stripe = getStripe()
    const parsed = Body.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid interval' }, { status: 400 })
    const price = priceFor(parsed.data.interval)
    if (!stripe || !price) {
      return NextResponse.json({ error: 'Billing is not set up yet' }, { status: 503 })
    }

    const db = createServerClient()
    const entitlement = await getEntitlement(db, user.id)
    if (entitlement.plan === 'pro') {
      return NextResponse.json(
        { error: 'You already have a subscription', code: 'already_subscribed' },
        { status: 409 }
      )
    }

    let customer = await getStripeCustomerId(db, user.id)
    if (customer) {
      // The webhook may not have landed yet (or two tabs are open): ask Stripe
      // directly so nobody ends up paying for two subscriptions.
      try {
        const { data } = await stripe.subscriptions.list({ customer, status: 'all', limit: 20 })
        if (data.some((s) => LIVE_STATUSES.has(s.status))) {
          return NextResponse.json(
            { error: 'You already have a subscription', code: 'already_subscribed' },
            { status: 409 }
          )
        }
      } catch (e) {
        // The customer was deleted in Stripe; start over with a new one.
        if ((e as { code?: string }).code !== 'resource_missing') throw e
        customer = null
      }
    }
    if (!customer) {
      const created = await stripe.customers.create(
        { email: user.email, metadata: { user_id: user.id } },
        // Two quick taps must not create two customers. Scoped to the minute so
        // a customer deleted later is never handed back.
        { idempotencyKey: `customer-${user.id}-${Math.floor(Date.now() / 60_000)}` }
      )
      customer = created.id
      await saveStripeCustomerId(db, user.id, customer)
    }

    const origin = request.nextUrl.origin
    const automaticTax = process.env.STRIPE_AUTOMATIC_TAX === '1'
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      subscription_data: { metadata: { user_id: user.id } },
      success_url: `${origin}/?billing=success`,
      cancel_url: `${origin}/?billing=cancelled`,
      allow_promotion_codes: true,
      locale: 'auto',
      automatic_tax: { enabled: automaticTax },
      ...(automaticTax ? { customer_update: { address: 'auto' as const } } : {}),
      // Requires a Terms of Service URL in the Stripe dashboard (Settings → Public details).
      ...(process.env.STRIPE_REQUIRE_TERMS === '1'
        ? { consent_collection: { terms_of_service: 'required' as const } }
        : {}),
      custom_text: { submit: { message: SUBMIT_NOTE } },
    })
    if (!session.url) throw new Error('Checkout session has no URL')
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[billing/checkout]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Starting checkout failed' }, { status: 500 })
  }
}
