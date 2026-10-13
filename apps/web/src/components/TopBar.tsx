'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ThemeMenu } from './ThemeToggle'
import { SettingsSheet } from './SettingsSheet'
import { Wordmark } from './Brand'
import { Icon } from './Icon'
import { signOut } from '@/lib/auth'
import { useLanguage } from '@/contexts/LanguageContext'

/** 60px app bar: wordmark, theme menu, settings, sign out. */
export function TopBar({ userId }: { userId?: string }) {
  const { t } = useLanguage()
  const [showSettings, setShowSettings] = useState(false)

  return (
    <header className="flex h-[60px] shrink-0 items-center pl-5 pr-2">
      <span className="flex-1">
        <Wordmark />
      </span>
      <ThemeMenu />
      {userId && (
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          aria-label={t.topBar.settings}
          className="icon-btn"
        >
          <Icon name="tune" />
        </button>
      )}
      <button type="button" onClick={signOut} aria-label={t.topBar.signOut} className="icon-btn">
        <Icon name="logout" />
      </button>
      <AnimatePresence>
        {showSettings && userId && (
          <SettingsSheet userId={userId} onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>
    </header>
  )
}
