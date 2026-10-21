// Transactional email through Resend's HTTP API. Off until RESEND_API_KEY and
// EMAIL_FROM are set; callers treat a false result as "not sent".

export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'hello@sproutine.app'

export function mailerConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

export async function sendEmail(msg: {
  to: string
  subject: string
  text: string
  replyTo?: string
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!key || !from) {
    console.warn('[mailer] not configured, email not sent:', msg.subject)
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [msg.to],
        subject: msg.subject,
        text: msg.text,
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      }),
    })
    if (!res.ok)
      console.error('[mailer] send failed:', res.status, await res.text().catch(() => ''))
    return res.ok
  } catch (e) {
    console.error('[mailer] send failed:', e instanceof Error ? e.message : e)
    return false
  }
}

const berlin = (d: Date) =>
  d.toLocaleString('en-GB', { timeZone: 'Europe/Berlin', dateStyle: 'long', timeStyle: 'short' }) +
  ' (Berlin time)'
const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Europe/Berlin', dateStyle: 'long' })

/** Confirmation in text form for a completed cancellation (§ 312k (4) BGB). */
export function cancellationConfirmation(at: Date, endsAt: string | null) {
  return {
    subject: 'Kündigungsbestätigung · Your Sproutine Pro cancellation',
    text: [
      'Hello,',
      '',
      'this confirms that you cancelled your Sproutine Pro subscription.',
      '',
      `Contract: Sproutine Pro subscription`,
      `Type: ordinary cancellation at the end of the current period`,
      `Received: ${berlin(at)}`,
      `Pro ends on: ${endsAt ? day(endsAt) : 'the end of your current billing period'}`,
      '',
      'You won’t be charged again. Your account stays on Sproutine Free with everything you’ve logged.',
      '',
      `Questions? Reply to this email or write to ${CONTACT_EMAIL}.`,
      '',
      'Sproutine',
    ].join('\n'),
  }
}

export interface CancelRequest {
  name: string
  email: string
  kind: 'ordinary' | 'extraordinary'
  reason?: string
}

/** Receipt for a cancellation sent from the signed-out form. */
export function cancellationReceipt(at: Date, req: CancelRequest) {
  const kind =
    req.kind === 'ordinary'
      ? 'ordinary cancellation at the next possible date'
      : 'extraordinary cancellation (with immediate effect)'
  return {
    subject: 'Eingangsbestätigung Ihrer Kündigung · We received your cancellation',
    text: [
      `Hello ${req.name},`,
      '',
      'we received your cancellation of your Sproutine Pro subscription.',
      '',
      `Name: ${req.name}`,
      `Email: ${req.email}`,
      `Contract: Sproutine Pro subscription`,
      `Type: ${kind}`,
      ...(req.reason ? [`Reason: ${req.reason}`] : []),
      `Received: ${berlin(at)}`,
      '',
      'We’ll match it to your account and confirm the date your subscription ends in a second email.',
      '',
      `Questions? Reply to this email or write to ${CONTACT_EMAIL}.`,
      '',
      'Sproutine',
    ].join('\n'),
  }
}
