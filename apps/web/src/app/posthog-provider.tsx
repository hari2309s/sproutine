'use client'

import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect, useState } from 'react'
import type { PostHog } from 'posthog-js'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [posthogClient, setPosthogClient] = useState<PostHog | null>(null)

  useEffect(() => {
    let cancelled = false
    // Loaded dynamically so posthog-js isn't part of the initial bundle —
    // it's only needed post-mount, never during first paint.
    import('posthog-js').then(({ default: posthog }) => {
      if (cancelled) return
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        person_profiles: 'identified_only',
        capture_pageview: false,
        loaded: (ph) => {
          if (localStorage.getItem('truffle-cookie-consent') !== 'accepted') {
            ph.opt_out_capturing()
          }
        },
      })
      setPosthogClient(posthog)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!posthogClient) return <>{children}</>

  return <PHProvider client={posthogClient}>{children}</PHProvider>
}
