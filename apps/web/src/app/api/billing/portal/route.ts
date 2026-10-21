import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, getStripeCustomerId } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'

/** Opens the Stripe customer portal: change plan, update the card, cancel, invoices. */
export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Billing is not set up yet' }, { status: 503 })

    const customer = await getStripeCustomerId(createServerClient(), user.id)
    if (!customer) return NextResponse.json({ error: 'No subscription to manage' }, { status: 404 })

    const session = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${request.nextUrl.origin}/`,
    })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[billing/portal]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Opening billing failed' }, { status: 500 })
  }
}
