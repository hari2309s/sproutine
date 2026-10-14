'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { WeekPage } from '@/components/WeekPage'
import { LoadingScreen } from '@/components/LoadingScreen'

export default function Week() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/')
      else setUserId(session.user.id)
    })
  }, [router])

  if (!userId) return <LoadingScreen />
  return <WeekPage userId={userId} />
}
