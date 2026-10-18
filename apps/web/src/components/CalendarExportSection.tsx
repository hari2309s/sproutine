'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Icon } from './Icon'
import { Toggle } from './Toggle'
import { CalendarExportSheet } from './CalendarExportSheet'

interface CalendarExportSectionProps {
  userId: string
}

export function CalendarExportSection({ userId }: CalendarExportSectionProps) {
  const [feedToken, setFeedToken] = useState<string | null>(null)
  const [feedEnabled, setFeedEnabled] = useState(false)
  const [copied, setCopied] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [showExportSheet, setShowExportSheet] = useState(false)

  const feedUrl = feedToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/calendar/feed/${feedToken}`
    : null

  const webcalUrl = feedUrl ? feedUrl.replace(/^https?:/, 'webcal:') : null

  const loadToken = useCallback(async () => {
    try {
      const res = await fetch('/api/calendar/feed')
      if (!res.ok) return
      const body = await res.json()
      if (body.token) {
        setFeedToken(body.token)
        setFeedEnabled(true)
      }
    } catch {
      /* silent */
    }
  }, [])

  useEffect(() => { void loadToken() }, [loadToken])

  const handleFeedToggle = async (next: boolean) => {
    if (next) {
      // Enable: get or create token
      setFeedEnabled(true)
      try {
        const res = await fetch('/api/calendar/feed')
        if (res.ok) {
          const body = await res.json()
          setFeedToken(body.token)
        }
      } catch {
        setFeedEnabled(false)
      }
    } else {
      // Disable: revoke token
      setFeedEnabled(false)
      setFeedToken(null)
      try {
        await fetch('/api/calendar/feed', { method: 'DELETE' })
      } catch {
        /* silent */
      }
    }
  }

  const handleCopy = async () => {
    if (!webcalUrl) return
    try {
      await navigator.clipboard.writeText(webcalUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* silent */
    }
  }

  const handleReset = async () => {
    if (resetting) return
    setResetting(true)
    try {
      const res = await fetch('/api/calendar/feed', { method: 'POST' })
      if (res.ok) {
        const body = await res.json()
        setFeedToken(body.token)
      }
    } catch {
      /* silent */
    } finally {
      setResetting(false)
    }
  }

  return (
    <section className="space-y-2.5">
      {/* Eyebrow with "New" badge */}
      <div className="flex items-center gap-2">
        <h3 className="eyebrow">Calendar</h3>
        <span
          className="rounded-full px-2 py-0.5 text-[12px] font-bold text-sproutine-accent"
          style={{ backgroundColor: 'var(--t-accent-soft)' }}
        >
          New
        </span>
      </div>

      <div className="card divide-y divide-sproutine-border px-4 shadow-none">
        {/* Row 1: One-time export */}
        <button
          type="button"
          onClick={() => setShowExportSheet(true)}
          className="flex w-full items-center gap-3 py-3.5 text-left"
        >
          <Icon name="calendar_month" size={22} className="text-sproutine-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-sproutine-text">
              Add planned meals to calendar
            </p>
            <p className="text-xs text-sproutine-muted">One-time .ics file</p>
          </div>
          <Icon name="chevron_right" size={20} className="text-sproutine-text-secondary" />
        </button>

        {/* Row 2: Live feed toggle */}
        <div className="py-3.5">
          <label className="flex cursor-pointer items-center gap-3">
            <Icon name="sync" size={22} className="text-sproutine-accent" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-sproutine-text">Live calendar feed</p>
              <p className="text-xs text-sproutine-muted">
                {feedEnabled ? 'Stays in sync automatically' : 'Subscribe in your calendar app'}
              </p>
            </div>
            <Toggle checked={feedEnabled} onChange={handleFeedToggle} />
          </label>

          {/* Feed URL + actions */}
          {feedEnabled && webcalUrl && (
            <div className="mt-3 space-y-2">
              <div className="overflow-hidden rounded-xl bg-sproutine-surface px-3 py-2">
                <p className="truncate font-mono text-xs text-sproutine-muted">{webcalUrl}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-sm font-semibold text-sproutine-accent"
                >
                  <Icon name={copied ? 'check' : 'content_copy'} size={16} />
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={resetting}
                  className="text-sm font-semibold text-sproutine-text-secondary disabled:opacity-50"
                >
                  {resetting ? 'Resetting...' : 'Reset link'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help text */}
      <p className="px-1 text-[13px] leading-normal text-sproutine-muted">
        The feed includes all your planned meals. Anyone with the link can see your meal plan,
        so keep it private.
      </p>

      <AnimatePresence>
        {showExportSheet && (
          <CalendarExportSheet onClose={() => setShowExportSheet(false)} />
        )}
      </AnimatePresence>
    </section>
  )
}
