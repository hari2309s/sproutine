import type { createServerClient } from './client'

type Db = ReturnType<typeof createServerClient>

export interface PushSubscriptionRow {
  endpoint: string
  p256dh: string
  auth: string
  lastPushedOn: string | null
}

/** Stores (or moves to this person) a browser's push subscription. */
export async function savePushSubscription(
  db: Db,
  userId: string,
  sub: { endpoint: string; p256dh: string; auth: string }
): Promise<void> {
  const { error } = await db
    .from('push_subscriptions')
    .upsert({ user_id: userId, ...sub }, { onConflict: 'endpoint' })
  if (error) throw new Error(`push_subscriptions.save: ${error.message}`)
}

export async function deletePushSubscription(
  db: Db,
  userId: string,
  endpoint: string
): Promise<void> {
  const { error } = await db
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
  if (error) throw new Error(`push_subscriptions.delete: ${error.message}`)
}

/** Drops a subscription the push service says is gone (404/410). */
export async function dropPushEndpoint(db: Db, endpoint: string): Promise<void> {
  await db.from('push_subscriptions').delete().eq('endpoint', endpoint)
}

export async function listPushSubscriptions(
  db: Db,
  userId: string
): Promise<PushSubscriptionRow[]> {
  const { data, error } = await db
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, last_pushed_on')
    .eq('user_id', userId)
  if (error) throw new Error(`push_subscriptions.list: ${error.message}`)
  return (data ?? []).map((r) => ({
    endpoint: r.endpoint as string,
    p256dh: r.p256dh as string,
    auth: r.auth as string,
    lastPushedOn: (r.last_pushed_on as string | null) ?? null,
  }))
}

export async function markPushed(db: Db, userId: string, localDate: string): Promise<void> {
  await db.from('push_subscriptions').update({ last_pushed_on: localDate }).eq('user_id', userId)
}
