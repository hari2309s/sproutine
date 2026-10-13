'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { Icon, type IconName } from './Icon'

type Tab = 'today' | 'chat'

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

/** In-flow bottom bar (the page column is a flex layout, so no fixed positioning). */
export function BottomNav({ active }: { active: Tab }) {
  const { t } = useLanguage()
  // Shared query cache: each page mounts its own BottomNav, so without it
  // every navigation would refetch the unread count.
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['chat-unread-count'],
    queryFn: fetchUnreadCount,
  })

  const tabs: { id: Tab; href: string; icon: IconName; label: string; badge?: number }[] = [
    { id: 'today', href: '/', icon: 'wb_sunny', label: t.nav.today },
    { id: 'chat', href: '/chat', icon: 'chat_bubble', label: t.nav.chat, badge: unreadCount },
  ]

  return (
    <nav className="safe-bottom shrink-0 border-t border-sproutine-border bg-sproutine-surface">
      <div className="grid h-[72px] grid-cols-2">
        {tabs.map((tab) => {
          const isActive = tab.id === active
          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 text-xs ${
                isActive
                  ? 'font-bold text-sproutine-accent'
                  : 'font-medium text-sproutine-muted hover:text-sproutine-text'
              }`}
            >
              <span
                className={`relative flex h-[30px] w-14 items-center justify-center rounded-full ${
                  isActive ? 'bg-sproutine-accent-soft' : ''
                }`}
              >
                <Icon name={tab.icon} filled={isActive} size={22} />
                {!!tab.badge && (
                  <span className="absolute -top-1 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-sproutine-accent px-1 text-[10px] font-bold leading-none text-sproutine-bg">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </span>
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
