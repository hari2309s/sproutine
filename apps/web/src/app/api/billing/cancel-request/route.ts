import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createKeyedRateLimiter } from '@sproutine/food'
import {
  CONTACT_EMAIL,
  cancellationReceipt,
  mailerConfigured,
  sendEmail,
  type CancelRequest,
} from '@/lib/mailer'

export const runtime = 'nodejs'

const Body = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(200),
  kind: z.enum(['ordinary', 'extraordinary']),
  reason: z.string().trim().max(1000).optional(),
  captchaToken: z.string().max(4096).optional(),
})

// Per server process: a coarse brake on mail abuse, on top of Turnstile.
const perIp = createKeyedRateLimiter(3)
const perEmail = createKeyedRateLimiter(2)

async function captchaOk(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  if (!token) return false
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  }).catch(() => null)
  return !!res?.ok && ((await res.json()) as { success?: boolean }).success === true
}

/**
 * Cancellation from the signed-out form (§ 312k BGB). It never cancels
 * anything by itself, since anyone could type someone else's email: it sends
 * the requester a receipt and forwards the request to us to match and confirm.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Please check the form' }, { status: 400 })
  const { captchaToken, ...fields } = parsed.data
  const req: CancelRequest = { ...fields, email: fields.email.toLowerCase() }

  if (!mailerConfigured()) {
    return NextResponse.json({ error: 'unavailable', code: 'unavailable' }, { status: 503 })
  }
  if (!perIp.tryAcquire(ip) || !perEmail.tryAcquire(req.email)) {
    return NextResponse.json(
      { error: 'Too many requests, please try again later' },
      { status: 429 }
    )
  }
  if (!(await captchaOk(captchaToken, ip))) {
    return NextResponse.json({ error: 'Please complete the check' }, { status: 400 })
  }

  const at = new Date()
  const receipt = cancellationReceipt(at, req)
  const [toUser, toUs] = await Promise.all([
    sendEmail({ to: req.email, ...receipt, replyTo: CONTACT_EMAIL }),
    sendEmail({
      to: CONTACT_EMAIL,
      subject: `Cancellation request: ${req.email}`,
      text: `Match this to an account, cancel it in Stripe, then confirm the end date.\n\n${receipt.text}`,
      replyTo: req.email,
    }),
  ])
  if (!toUs) return NextResponse.json({ error: 'Sending failed' }, { status: 502 })
  return NextResponse.json({ receivedAt: at.toISOString(), emailed: toUser })
}
