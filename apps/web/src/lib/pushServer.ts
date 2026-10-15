import webpush from 'web-push'
import {
  dropPushEndpoint,
  listPushSubscriptions,
  markPushed,
  type createServerClient,
} from '@sproutine/db'

type Db = ReturnType<typeof createServerClient>

// Web Push with VAPID. Keys: `npx web-push generate-vapid-keys`; the public
// key is also NEXT_PUBLIC_VAPID_PUBLIC_KEY for the browser.
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
const privateKey = process.env.VAPID_PRIVATE_KEY ?? ''
const subject = process.env.VAPID_SUBJECT ?? ''

export const isPushConfigured = () => !!(publicKey && privateKey && subject)

let configured = false
function configure() {
  if (configured || !isPushConfigured()) return
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
}

// The server sends requests to stored endpoints, so only the browsers' push
// services are accepted (no arbitrary URLs: that would be a request forger).
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^web\.push\.apple\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
  /^[a-z0-9-]+\.push\.apple\.com$/,
]

export function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    return url.protocol === 'https:' && !url.port && PUSH_HOSTS.some((re) => re.test(url.hostname))
  } catch {
    return false
  }
}

/**
 * Sends one notification to each of a person's devices, at most once per
 * local day. Returns whether anything was sent. Gone subscriptions are removed.
 */
export async function pushToUser(
  db: Db,
  userId: string,
  localDate: string,
  message: { title: string; body: string; url: string }
): Promise<boolean> {
  if (!isPushConfigured()) return false
  configure()
  const subs = await listPushSubscriptions(db, userId)
  if (!subs.length || subs.some((s) => s.lastPushedOn === localDate)) return false

  const payload = JSON.stringify(message)
  let sent = false
  await Promise.all(
    subs.map(async (s) => {
      if (!isAllowedPushEndpoint(s.endpoint)) return dropPushEndpoint(db, s.endpoint)
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 6 * 60 * 60, urgency: 'normal' }
        )
        sent = true
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) await dropPushEndpoint(db, s.endpoint)
        else console.warn('[push] send failed:', status ?? (e as Error).message)
      }
    })
  )
  if (sent) await markPushed(db, userId, localDate)
  return sent
}
