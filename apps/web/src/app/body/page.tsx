'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { BodyPage } from '@/components/BodyPage'
import { LoadingScreen } from '@/components/LoadingScreen'

function Body() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/')
        return
      }
      setUserId(session.user.id)

      // Redirect if user has gentle mode on — Body tab is not accessible in gentle mode.
      const { data } = await supabase
        .from('profiles')
        .select('display_name, safety_mode')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (data?.safety_mode) {
        router.replace('/')
        return
      }

      setName(typeof data?.display_name === 'string' ? data.display_name : '')
      setReady(true)
    })
  }, [router])

  if (!ready || !userId) return <LoadingScreen />
  return <BodyPage userId={userId} name={name} />
}

export default function BodyRoute() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Body />
    </Suspense>
  )
}
