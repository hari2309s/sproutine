// Browser side of Web Push: subscribe this device, or stop.

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

export type PushSupport = 'supported' | 'needs-home-screen' | 'unsupported' | 'not-configured'

/** iOS only delivers web push to apps added to the Home Screen. */
export function pushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported'
  if (!VAPID_PUBLIC_KEY) return 'not-configured'
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (ios && !standalone) return 'needs-home-screen'
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return 'unsupported'
  }
  return 'supported'
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function registration() {
  return (
    (await navigator.serviceWorker.getRegistration('/')) ??
    navigator.serviceWorker.register('/sw.js')
  )
}

export async function isSubscribed(): Promise<boolean> {
  if (pushSupport() !== 'supported') return false
  const reg = await navigator.serviceWorker.getRegistration('/')
  return !!(await reg?.pushManager.getSubscription())
}

/** Asks permission and subscribes. Returns false if the person said no. */
export async function subscribe(): Promise<boolean> {
  if ((await Notification.requestPermission()) !== 'granted') return false
  const reg = await registration()
  await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(VAPID_PUBLIC_KEY),
    }))
  const res = await fetch('/api/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  })
  if (!res.ok) {
    await sub.unsubscribe().catch(() => {})
    throw new Error(`HTTP ${res.status}`)
  }
  return true
}

export async function unsubscribe(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await fetch('/api/push', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => {})
  await sub.unsubscribe()
}
