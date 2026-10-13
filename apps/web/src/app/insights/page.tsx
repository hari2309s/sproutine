'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LoadingDots } from '@/components/PageMotion'
import { InsightsPage } from '@/components/InsightsPage'

export default function Insights() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/')
      } else {
        setUserId(session.user.id)
      }
    })
  }, [router])

  if (!userId)
    return (
      <div className="min-h-dvh bg-truffle-bg flex items-center justify-center">
        <LoadingDots />
      </div>
    )

  return <InsightsPage userId={userId} />
}
