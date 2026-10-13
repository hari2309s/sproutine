'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LoadingDots } from './PageMotion'
import { Dashboard } from './Dashboard'
import { AuthPage } from './AuthPage'
import { OnboardingPage } from './OnboardingPage'
import { useLanguage } from '@/contexts/LanguageContext'
import { type Locale, translations } from '@/lib/i18n'

type AppState = 'loading' | 'unauthenticated' | 'onboarding' | 'dashboard'

export function HomeClient() {
  const [state, setState] = useState<AppState>('loading')
  const [userId, setUserId] = useState<string | null>(null)
  const [name, setName] = useState<string>('')
  const { t, setLocale } = useLanguage()
  const searchParams = useSearchParams()
  const authError = searchParams.get('error')

  const resolveState = (
    session: { user: { id: string; user_metadata: Record<string, unknown> } } | null
  ) => {
    if (!session) {
      setState('unauthenticated')
      setUserId(null)
      setName('')
      return
    }
    setUserId(session.user.id)
    const userName = (session.user.user_metadata?.name as string) ?? ''
    setName(userName)

    const savedLocale = session.user.user_metadata?.language as string | undefined
    if (savedLocale && savedLocale in translations) {
      setLocale(savedLocale as Locale)
    } else {
      // Existing user with no saved language preference — default to English
      setLocale('en')
    }

    setState(userName ? 'dashboard' : 'onboarding')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveState(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      resolveState(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (state === 'loading')
    return (
      <div className="min-h-dvh bg-truffle-bg flex items-center justify-center">
        <LoadingDots />
      </div>
    )
  if (state === 'unauthenticated') {
    const authErrorMessage =
      authError === 'auth_failed'
        ? t.home.authExpiredError
        : authError === 'demo_unavailable'
          ? t.home.demoUnavailableError
          : null
    return <AuthPage error={authErrorMessage} />
  }
  if (state === 'onboarding' && userId) {
    return (
      <OnboardingPage
        onComplete={async () => {
          // Re-fetch session so user_metadata is fresh
          const {
            data: { session },
          } = await supabase.auth.getSession()
          resolveState(session)
        }}
      />
    )
  }
  if (state === 'dashboard' && userId) return <Dashboard userId={userId} name={name} />
  return null
}
