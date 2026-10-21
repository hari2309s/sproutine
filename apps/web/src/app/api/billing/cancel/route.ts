import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, getStripeCustomerId, saveStripeSubscription } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'
import { cancellationConfirmation, sendEmail } from '@/lib/mailer'
import { getStripe, LIVE_STATUSES, pickSubscription, subscriptionState } from '@/lib/stripe'

export const runtime = 'nodejs'

/**
 * The "cancel now" step of the cancellation page (§ 312k BGB). Cancels every
 * live subscription at the end of its paid period and returns when Pro ends.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Billing is not set up yet' }, { status: 503 })

    const db = createServerClient()
    const customer = await getStripeCustomerId(db, user.id)
    if (!customer) {
      return NextResponse.json(
        { error: 'No subscription to cancel', code: 'none' },
        { status: 404 }
      )
    }

    const { data } = await stripe.subscriptions.list({ customer, status: 'all', limit: 20 })
    const live = data.filter((s) => LIVE_STATUSES.has(s.status))
    if (live.length === 0) {
      return NextResponse.json(
        { error: 'No subscription to cancel', code: 'none' },
        { status: 404 }
      )
    }

    const updated = await Promise.all(
      live.map((s) =>
        s.status === 'incomplete'
          ? stripe.subscriptions.cancel(s.id)
          : stripe.subscriptions.update(s.id, { cancel_at_period_end: true })
      )
    )
    // Stripe has cancelled at this point, so nothing below may turn it into an error.
    const cancelledAt = new Date()
    const deciding = pickSubscription(updated)
    const endsAt = deciding ? subscriptionState(deciding).currentPeriodEnd : null
    if (deciding) {
      // Mirror right away; the webhook will write the same state anyway.
      await saveStripeSubscription(db, user.id, customer, subscriptionState(deciding)).catch((e) =>
        console.error('[billing/cancel] mirror failed:', e instanceof Error ? e.message : e)
      )
    }
    // § 312k (4) BGB: confirm the cancellation in text form straight away.
    const emailed = user.email
      ? await sendEmail({ to: user.email, ...cancellationConfirmation(cancelledAt, endsAt) })
      : false
    return NextResponse.json({ endsAt, cancelledAt: cancelledAt.toISOString(), emailed })
  } catch (error) {
    console.error('[billing/cancel]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Cancelling failed' }, { status: 500 })
  }
}
