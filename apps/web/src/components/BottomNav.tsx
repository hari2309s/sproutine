'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'

type Tab = 'home' | 'chat' | 'insights'

interface BottomNavProps {
  active: Tab
}

async function fetchUnreadCount(): Promise<number> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return 0

  const { count } = await supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('is_proactive', true)
    .is('read_at', null)

  return count ?? 0
}

export function BottomNav({ active }: BottomNavProps) {
  const { t } = useLanguage()
  // Shared TanStack Query cache: BottomNav is mounted independently by
  // Dashboard, ChatPage and InsightsPage, so without a shared cache each
  // mount would refire both the session lookup and the count query on
  // every navigation.
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['chat-unread-count'],
    queryFn: fetchUnreadCount,
  })

  const base = 'flex-1 flex flex-col items-center py-3 gap-1 transition-colors'
  const activeClass = 'text-truffle-amber'
  const inactiveClass = 'text-truffle-muted hover:text-truffle-text'

  return (
    <nav className="safe-bottom fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg border-t border-truffle-border bg-truffle-bg/95 backdrop-blur-sm">
      <div className="flex">
        <Link href="/" className={`${base} ${active === 'home' ? activeClass : inactiveClass}`}>
          <HomeIcon />
          <span className="text-[10px]">{t.nav.home}</span>
        </Link>
        <Link href="/chat" className={`${base} ${active === 'chat' ? activeClass : inactiveClass}`}>
          <div className="relative">
            <ChatIcon />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-truffle-amber text-truffle-bg text-[9px] font-bold leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">{t.nav.chat}</span>
        </Link>
        <Link
          href="/insights"
          className={`${base} ${active === 'insights' ? activeClass : inactiveClass}`}
        >
          <InsightsIcon />
          <span className="text-[10px]">{t.nav.insights}</span>
        </Link>
      </div>
    </nav>
  )
}

function HomeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
    >
      <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
      <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.432z" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
    >
      <path
        fillRule="evenodd"
        d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223 15.522 15.522 0 003-.152z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function InsightsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
    >
      <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
    </svg>
  )
}
