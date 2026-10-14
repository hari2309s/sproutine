'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { WeekPage } from '@/components/WeekPage'
import { LoadingScreen } from '@/components/LoadingScreen'

function Week() {
  const router = useRouter()
  const startNextWeek = useSearchParams().get('week') === 'next'
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/')
      else setUserId(session.user.id)
    })
  }, [router])

  if (!userId) return <LoadingScreen />
  return <WeekPage userId={userId} startNextWeek={startNextWeek} />
}

export default function WeekRoute() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Week />
    </Suspense>
  )
}
