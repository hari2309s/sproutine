'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { browserTimeZone, fetchOwnProfile } from '@/lib/profile'
import { LoadingScreen } from './LoadingScreen'
import { TodayPage } from './TodayPage'
import { AuthPage } from './AuthPage'
import { OnboardingPage } from './OnboardingPage'
import { useLanguage } from '@/contexts/LanguageContext'
import { type Locale, translations } from '@/lib/i18n'

type AppState = 'loading' | 'unauthenticated' | 'onboarding' | 'today'

export function HomeClient() {
  const [state, setState] = useState<AppState>('loading')
  const [userId, setUserId] = useState<string | null>(null)
  const [name, setName] = useState<string>('')
  // The name given at sign-up, to prefill onboarding.
  const [signUpName, setSignUpName] = useState('')
  const { t, setLocale } = useLanguage()
  const searchParams = useSearchParams()
  const authError = searchParams.get('error')

  // A user counts as onboarded once their profile row exists — onboarding
  // creates it together with the health-data consent timestamp.
  const resolveState = useCallback(
    async (session: Session | null) => {
      if (!session) {
        setState('unauthenticated')
        setUserId(null)
        setName('')
        return
      }
      setUserId(session.user.id)
      const metaName = session.user.user_metadata?.display_name
      setSignUpName(typeof metaName === 'string' ? metaName : '')
      try {
        const profile = await fetchOwnProfile(session.user.id)
        if (!profile) {
          setState('onboarding')
          return
        }
        setName(profile.displayName)
        // Keep the stored zone in step with this device (travel, a new phone),
        // so nudges arrive at local times.
        const zone = browserTimeZone()
        // Awaited, so Today's habits and check-ins already use the new zone.
        if (profile.timezone !== zone) {
          const { error } = await supabase
            .from('profiles')
            .update({ timezone: zone })
            .eq('user_id', session.user.id)
          if (error) console.warn('[HomeClient] timezone update failed:', error.message)
        }
        if (profile.locale in translations) setLocale(profile.locale as Locale)
        setState('today')
      } catch (e) {
        console.error('[HomeClient] profile load failed:', e)
        setState('onboarding')
      }
    },
    [setLocale]
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      void resolveState(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      void resolveState(session)
    })

    return () => subscription.unsubscribe()
  }, [resolveState])

  if (state === 'loading') return <LoadingScreen />
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
        userId={userId}
        initialName={signUpName}
        onComplete={async () => {
          const {
            data: { session },
          } = await supabase.auth.getSession()
          await resolveState(session)
        }}
      />
    )
  }
  if (state === 'today' && userId) return <TodayPage userId={userId} name={name} />
  return null
}
