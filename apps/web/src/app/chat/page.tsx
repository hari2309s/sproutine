'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SproutineUIMessage } from '@/hooks/useSproutineChat'
import { supabase } from '@/lib/supabase'
import { ChatPage } from '@/components/ChatPage'
import { LoadingScreen } from '@/components/LoadingScreen'

export default function Chat() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null | undefined>(undefined)
  const [initialMessages, setInitialMessages] = useState<SproutineUIMessage[] | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/')
      } else {
        setUserId(session.user.id)
      }
    })
  }, [router])

  useEffect(() => {
    if (!userId) return

    // Load history
    supabase
      .from('chat_messages')
      .select('id, role, content, created_at, is_proactive, safety')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        const rows = (data ?? []).reverse()
        setInitialMessages(
          rows.map((row) => ({
            id: row.id as string,
            role: row.role as 'user' | 'assistant',
            parts: [{ type: 'text' as const, text: (row.content as string) ?? '' }],
            metadata: {
              createdAt: row.created_at as string,
              proactive: Boolean(row.is_proactive),
              safety:
                row.safety === 'crisis' || row.safety === 'ed_risk' ? row.safety : undefined,
            },
          }))
        )
      })

    // Mark all unread proactive messages as read
    supabase
      .from('chat_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_proactive', true)
      .is('read_at', null)
      .then(() => {})
  }, [userId])

  // Wait for both auth and history before mounting ChatPage so useChat
  // receives a stable initialMessages and never resets mid-conversation.
  if (!userId || initialMessages === undefined) return <LoadingScreen />

  return <ChatPage userId={userId} initialMessages={initialMessages} />
}
