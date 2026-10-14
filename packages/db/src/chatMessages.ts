import type { createServerClient } from './client'

type Db = ReturnType<typeof createServerClient>

export interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

/**
 * The most recent messages, oldest first. This is what the model sees as
 * conversation history, so it comes from the database (written only by the
 * server), never from whatever history a client sends.
 */
export async function loadRecentMessages(
  db: Db,
  userId: string,
  limit: number
): Promise<StoredMessage[]> {
  const { data, error } = await db
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`chat_messages.load: ${error.message}`)
  return (data ?? [])
    .filter((r) => r.role === 'user' || r.role === 'assistant')
    .map((r) => ({
      role: r.role as StoredMessage['role'],
      content: r.content as string,
      createdAt: r.created_at as string,
    }))
    .reverse()
}

/** Stores one message. Failures are logged, never thrown: history is best effort. */
export async function saveMessage(
  db: Db,
  userId: string,
  message: { role: 'user' | 'assistant'; content: string; safety?: 'crisis' | 'ed_risk' }
): Promise<void> {
  const { error } = await db.from('chat_messages').insert({
    user_id: userId,
    role: message.role,
    content: message.content,
    safety: message.safety ?? null,
  })
  if (error) console.error(`[chat_messages] save ${message.role} failed:`, error.message)
}
