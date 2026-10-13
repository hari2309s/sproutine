import { createHmac, timingSafeEqual } from 'node:crypto'

// Binds a Langfuse trace id to the user it belongs to, so /api/chat/feedback
// can't be used to score someone else's trace. Keyed with the Langfuse secret:
// server-only, and feedback can't be recorded without Langfuse anyway. Without
// the key, no tokens are issued and feedback is simply unavailable.

export function signTrace(traceId: string, pseudonym: string): string | undefined {
  const secret = process.env.LANGFUSE_SECRET_KEY
  if (!secret) return undefined
  return createHmac('sha256', secret).update(`${traceId}:${pseudonym}`).digest('base64url')
}

export function verifyTrace(traceId: string, pseudonym: string, token: string): boolean {
  const expected = signTrace(traceId, pseudonym)
  if (!expected) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(token)
  return a.length === b.length && timingSafeEqual(a, b)
}
