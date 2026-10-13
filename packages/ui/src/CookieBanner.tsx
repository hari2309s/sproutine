'use client'

import { useEffect, useState } from 'react'

const CONSENT_KEY = 'sproutine-cookie-consent'

export interface CookieBannerProps {
  message: string
  privacyLabel: string
  privacyHref: string
  /** True for a link that leaves the current app (adds target=_blank + rel). */
  privacyExternal?: boolean
  acceptLabel: string
  rejectLabel: string
  /** Extra side effect beyond the localStorage write — e.g. posthog.opt_in_capturing(). */
  onAccept?: () => void
  /** Extra side effect beyond the localStorage write — e.g. posthog.opt_out_capturing(). */
  onReject?: () => void
}

/**
 * Presentational — deliberately has no dependency on either app's
 * LanguageContext (each app has its own, with its own Translations type) or
 * analytics setup. Callers pass already-translated strings and any
 * consent-specific side effect as props.
 */
export function CookieBanner({
  message,
  privacyLabel,
  privacyHref,
  privacyExternal,
  acceptLabel,
  rejectLabel,
  onAccept,
  onReject,
}: CookieBannerProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // localStorage can throw (Safari private browsing, "Block all cookies",
    // storage-blocking extensions) — treat that as "no stored consent" so
    // the banner still shows instead of the effect crashing silently.
    let stored: string | null = null
    try {
      stored = localStorage.getItem(CONSENT_KEY)
    } catch {
      // ignore — stored stays null
    }
    if (!stored) setVisible(true)
  }, [])

  if (!visible) return null

  function accept() {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted')
    } catch {
      // storage blocked — still honor the click, just won't persist across reloads
    }
    onAccept?.()
    setVisible(false)
  }

  function reject() {
    try {
      localStorage.setItem(CONSENT_KEY, 'rejected')
    } catch {
      // storage blocked — still honor the click, just won't persist across reloads
    }
    onReject?.()
    setVisible(false)
  }

  // Rendered inline at the top of the page column (not fixed), so it pushes
  // content down instead of covering the sign-in button or the mic. The two
  // choices get equal visual weight.
  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="mx-auto w-full max-w-lg shrink-0 px-3 pt-2"
    >
      <div className="flex flex-col gap-2.5 rounded-[22px] bg-sproutine-surface px-3.5 pt-3.5 pb-3">
        <div className="flex items-start gap-2.5">
          <span aria-hidden className="icon text-[22px] text-sproutine-text-secondary">
            cookie
          </span>
          <p className="text-sm leading-[1.45] text-sproutine-text">
            {message}{' '}
            <a
              href={privacyHref}
              {...(privacyExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="font-semibold text-sproutine-accent underline-offset-2 hover:underline"
            >
              {privacyLabel}
            </a>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: rejectLabel, onClick: reject },
            { label: acceptLabel, onClick: accept },
          ].map(({ label, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className="h-11 rounded-full border-[1.5px] border-sproutine-border-strong bg-sproutine-card text-sm font-semibold text-sproutine-text hover:bg-sproutine-bg"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
