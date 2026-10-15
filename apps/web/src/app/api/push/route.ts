import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient, deletePushSubscription, savePushSubscription } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'
import { foodRequestLimiter } from '@/lib/foodLimits'
import { isAllowedPushEndpoint, isPushConfigured } from '@/lib/pushServer'

export const runtime = 'nodejs'

const Subscription = z.object({
  endpoint: z.string().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
})

/** Saves this browser's push subscription for the signed-in person. */
export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    if (!isPushConfigured())
      return NextResponse.json({ error: 'push not configured' }, { status: 503 })
    if (!foodRequestLimiter.tryAcquire(user.id)) {
      return NextResponse.json({ error: 'too many requests, slow down' }, { status: 429 })
    }
    const body = Subscription.safeParse(await request.json().catch(() => null))
    if (!body.success || !isAllowedPushEndpoint(body.data.endpoint)) {
      return NextResponse.json({ error: 'invalid subscription' }, { status: 400 })
    }
    await savePushSubscription(createServerClient(), user.id, {
      endpoint: body.data.endpoint,
      p256dh: body.data.keys.p256dh,
      auth: body.data.keys.auth,
    })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[push:post]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Saving the subscription failed' }, { status: 500 })
  }
}

/** Removes this browser's subscription. */
export async function DELETE(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const body = z
      .object({ endpoint: z.string().max(1000) })
      .safeParse(await request.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'invalid request' }, { status: 400 })
    await deletePushSubscription(createServerClient(), user.id, body.data.endpoint)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[push:delete]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Removing the subscription failed' }, { status: 500 })
  }
}
