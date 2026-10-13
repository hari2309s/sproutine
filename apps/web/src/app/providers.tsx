'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, Suspense } from 'react'
import { PostHogProvider } from './posthog-provider'
import { PostHogPageView } from './posthog-pageview'
import { LanguageProvider } from '@/contexts/LanguageContext'
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

  return (
    <PostHogProvider>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <LanguageProvider>
        <VoiceProvider>
          <QueryClientProvider client={queryClient}>
            <div className="flex h-dvh flex-col overflow-hidden">
              <CookieBanner />
              {children}
            </div>
          </QueryClientProvider>
        </VoiceProvider>
      </LanguageProvider>
    </PostHogProvider>
  )
}
