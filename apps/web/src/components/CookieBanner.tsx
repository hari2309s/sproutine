'use client'

import posthog from 'posthog-js'
import { CookieBanner as SharedCookieBanner } from '@truffle/ui'
import { useLanguage } from '@/contexts/LanguageContext'

export function CookieBanner() {
  const { t } = useLanguage()

  return (
    <SharedCookieBanner
      message={t.cookieBanner.message}
      privacyLabel={t.cookieBanner.privacyLabel}
      privacyHref="https://truffle-landing-two.vercel.app/privacy"
      privacyExternal
      acceptLabel={t.cookieBanner.accept}
      rejectLabel={t.cookieBanner.reject}
      onAccept={() => posthog.opt_in_capturing()}
      onReject={() => posthog.opt_out_capturing()}
    />
  )
}
