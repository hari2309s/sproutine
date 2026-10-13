'use client'

import posthog from 'posthog-js'
import { CookieBanner as SharedCookieBanner } from '@sproutine/ui'
import { useLanguage } from '@/contexts/LanguageContext'

export function CookieBanner() {
  const { t } = useLanguage()

  return (
    <SharedCookieBanner
      message={t.cookieBanner.message}
      privacyLabel={t.cookieBanner.details}
      privacyHref="https://sproutine-landing-two.vercel.app/privacy"
      privacyExternal
      acceptLabel={t.cookieBanner.acceptAll}
      rejectLabel={t.cookieBanner.essentialOnly}
      onAccept={() => posthog.opt_in_capturing()}
      onReject={() => posthog.opt_out_capturing()}
    />
  )
}
