'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect, Suspense } from 'react'
import { PostHogProvider } from './posthog-provider'
import { PostHogPageView } from './posthog-pageview'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { CurrencyProvider } from '@/contexts/CurrencyContext'
import { VoiceProvider } from '@/contexts/VoiceContext'
import { CookieBanner } from '@/components/CookieBanner'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
          },
        },
      })
  )

  // Clean up any service worker + caches left behind by the app's old
  // offline-support build, so previously-installed clients stop being
  // served stale cached responses.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister())
    })
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)))
    }
  }, [])

  return (
    <PostHogProvider>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <LanguageProvider>
        <CurrencyProvider>
          <VoiceProvider>
            <QueryClientProvider client={queryClient}>
              <div className="flex flex-col h-dvh overflow-hidden">{children}</div>
              <CookieBanner />
            </QueryClientProvider>
          </VoiceProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </PostHogProvider>
  )
}
