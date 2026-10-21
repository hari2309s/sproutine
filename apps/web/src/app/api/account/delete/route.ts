import { NextRequest, NextResponse } from 'next/server'
import { clearStripeCustomer, createServerClient, getStripeCustomerId } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const db = createServerClient()

    // Remove the Stripe customer first: that cancels any subscription, so a
    // deleted account can never be charged again. If it fails, stop here.
    const customer = await getStripeCustomerId(db, user.id)
    if (customer) {
      const stripe = getStripe()
      if (!stripe) throw new Error('Stripe customer exists but billing is not configured')
      try {
        await stripe.customers.del(customer)
      } catch (e) {
        const code = (e as { code?: string }).code
        if (code !== 'resource_missing') throw e
      }
      // If deleting the user fails below, a retry or a new checkout must not
      // reach for the customer that's now gone.
      await clearStripeCustomer(db, user.id)
    }

    // Delete the auth user — all tables cascade via ON DELETE CASCADE
    const { error } = await db.auth.admin.deleteUser(user.id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Account delete error:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
