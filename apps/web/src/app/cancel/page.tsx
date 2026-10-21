'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AppColumn } from '@/components/AppColumn'
import { CancelRequestForm } from '@/components/CancelRequestForm'
import { CancelSignedIn } from '@/components/CancelSignedIn'
import { Icon } from '@/components/Icon'
import { LoadingScreen } from '@/components/LoadingScreen'
import { useLanguage } from '@/contexts/LanguageContext'

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'hello@sproutine.app'
const MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Kündigung Sproutine Pro')}&body=${encodeURIComponent('Please cancel my Sproutine Pro subscription.\nAccount email: ')}`

/** Cancellation page required for online subscriptions (§ 312k BGB). */
export default function CancelRoute() {
  const { t } = useLanguage()
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSignedIn(!!session))
  }, [])

  if (signedIn === null) return <LoadingScreen />
  return (
    <AppColumn>
      <main className="flex-1 space-y-5 overflow-y-auto px-5 pt-8 pb-10">
        <h1 className="font-display text-[34px] leading-[1.08] text-sproutine-text">
          {t.cancelPage.title}
        </h1>
        <p className="text-[15px] leading-normal text-sproutine-text-secondary">
          {t.cancelPage.lead}
        </p>
        {signedIn ? (
          <CancelSignedIn />
        ) : (
          <>
            <CancelRequestForm mailto={MAILTO} />
            <div className="flex flex-wrap gap-2">
              <Link href="/" className="btn-secondary h-12 px-5">
                {t.cancelPage.signIn}
              </Link>
              <a href={MAILTO} className="btn-secondary h-12 px-5">
                <Icon name="mail" size={20} />
                {t.cancelPage.emailUs}
              </a>
            </div>
          </>
        )}
        <Link href="/" className="btn-ghost h-11">
          <Icon name="arrow_back" size={20} />
          {t.cancelPage.back}
        </Link>
      </main>
    </AppColumn>
  )
}
