'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TruffleUIMessage } from '@/hooks/useFinancialChat'
import { supabase } from '@/lib/supabase'
import { ChatPage } from '@/components/ChatPage'
import { LoadingSpinner } from '@/components/PageMotion'
import { TopBar } from '@/components/TopBar'
import { BottomNav } from '@/components/BottomNav'

export default function Chat() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null | undefined>(undefined)
  const [name, setName] = useState<string>('')
  const [initialMessages, setInitialMessages] = useState<TruffleUIMessage[] | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/')
      } else {
        setUserId(session.user.id)
        setName((session.user.user_metadata?.name as string) ?? '')
      }
    })
  }, [router])

  useEffect(() => {
    if (!userId) return

    // Load history
    supabase
      .from('chat_messages')
      .select('id, role, content, created_at, is_proactive')
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
  if (!userId || initialMessages === undefined)
    return (
      <div className="flex-1 w-full bg-truffle-bg flex flex-col max-w-lg mx-auto overflow-hidden min-h-0">
        <TopBar />
        <main className="flex-1 flex items-center justify-center pb-14">
          <LoadingSpinner />
        </main>
        <BottomNav active="chat" />
      </div>
    )

  return <ChatPage userId={userId} name={name} initialMessages={initialMessages} />
}
