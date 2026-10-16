'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { useVoicePreference } from '@/contexts/VoiceContext'
import { type Locale } from '@/lib/i18n'
import { type VoiceId } from '@/lib/voices'
import { pushSupport, isSubscribed, subscribe, unsubscribe, type PushSupport } from '@/lib/pushClient'
import { LanguagePicker } from './LanguagePicker'
import { ThemeSegmented } from './ThemeToggle'
import { Icon } from './Icon'
import { Toggle } from './Toggle'
import { VoicePicker } from './VoicePicker'
import { ReportSheet } from './ReportSheet'
import { DeleteAccountSection, AttributionFooter } from './DeleteAccountSection'
import { fetchOwnProfile } from '@/lib/profile'
import { exportAllData, updateProfileField } from '@/lib/settingsApi'
import { supabase } from '@/lib/supabase'

interface SettingsSheetProps {
  userId: string
  onClose: () => void
}

export function SettingsSheet({ userId, onClose }: SettingsSheetProps) {
  const { t, setLocale } = useLanguage()
  const { voiceId, setVoiceId } = useVoicePreference()
  const [isExporting, setIsExporting] = useState(false)
  const [gentleMode, setGentleMode] = useState<boolean | null>(null)
  const [pushState] = useState<PushSupport>(() => pushSupport())
  const [pushOn, setPushOn] = useState<boolean | null>(null)
  const [waterGoalMl, setWaterGoalMl] = useState(2000)
  const [waterGlassMl, setWaterGlassMl] = useState(250)
  const [showReports, setShowReports] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchOwnProfile(userId)
      .then((p) => {
        setGentleMode(p?.safetyMode ?? false)
        setWaterGoalMl(p?.waterGoalMl ?? 2000)
        setWaterGlassMl(p?.waterGlassMl ?? 250)
      })
      .catch(() => setGentleMode(false))
  }, [userId])

  useEffect(() => {
    if (pushState === 'supported') {
      isSubscribed().then(setPushOn).catch(() => setPushOn(false))
    }
  }, [pushState])

  useEffect(() => {
    closeButtonRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !sheetRef.current) return
      const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportAllData(userId)
    } catch (e) {
      console.error('[settings] export failed:', e)
    } finally {
      setIsExporting(false)
    }
  }

  const handleLocaleChange = async (next: Locale) => {
    setLocale(next)
    await Promise.all([
      supabase.auth.updateUser({ data: { language: next } }),
      updateProfileField(userId, { locale: next }),
    ])
  }

  const handleVoiceChange = async (next: VoiceId) => {
    setVoiceId(next)
    await Promise.all([
      supabase.auth.updateUser({ data: { voice: next } }),
      updateProfileField(userId, { voice_id: next }),
    ])
  }

  const handlePushChange = async (next: boolean) => {
    try {
      if (next) {
        const ok = await subscribe()
        setPushOn(ok)
      } else {
        await unsubscribe()
        setPushOn(false)
      }
    } catch {
      setPushOn(!next)
    }
  }

  const handleGentleModeChange = async (next: boolean) => {
    const previous = gentleMode
    setGentleMode(next)
    const { error } = await updateProfileField(userId, { safety_mode: next })
    if (error) setGentleMode(previous)
  }

  const handleWaterGoalChange = async (delta: number) => {
    const prev = waterGoalMl
    const next = Math.max(500, Math.min(5000, waterGoalMl + delta))
    setWaterGoalMl(next)
    const { error } = await updateProfileField(userId, { water_goal_ml: next })
    if (error) setWaterGoalMl(prev)
  }

  const handleWaterGlassChange = async (delta: number) => {
    const prev = waterGlassMl
    const next = Math.max(100, Math.min(1000, waterGlassMl + delta))
    setWaterGlassMl(next)
    const { error } = await updateProfileField(userId, { water_glass_ml: next })
    if (error) setWaterGlassMl(prev)
  }

  return (
    <div
      className="fixed inset-0 z-50 mx-auto flex max-w-lg flex-col justify-end"
      onClick={onClose}
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-sproutine-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-sheet-title"
        className="relative flex max-h-[92dvh] flex-col rounded-t-[28px] bg-sproutine-bg shadow-soft"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          aria-hidden
          className="mt-2.5 h-[5px] w-10 shrink-0 self-center rounded-full bg-sproutine-border-strong"
        />
        <div className="flex shrink-0 items-center justify-between border-b border-sproutine-border py-2 pr-3 pl-5">
          <h2 id="settings-sheet-title" className="font-display text-[26px] text-sproutine-text">
            {t.settings.title}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t.settings.close}
            className="icon-btn bg-sproutine-surface text-sproutine-text"
          >
            <Icon name="close" size={22} />
          </button>
        </div>

        <div
          className="safe-bottom space-y-6 overflow-y-auto px-5 pt-4 pb-6"
          style={{ overscrollBehavior: 'contain' }}
        >
          <section className="space-y-2.5">
            <h3 className="eyebrow">{t.settings.language}</h3>
            <LanguagePicker onChange={handleLocaleChange} />
          </section>

          <section className="space-y-2.5">
            <h3 className="eyebrow">{t.settings.appearance}</h3>
            <ThemeSegmented />
          </section>

          <section className="space-y-2.5">
            <h3 className="eyebrow">{t.settings.voice}</h3>
            <VoicePicker value={voiceId} onChange={handleVoiceChange} variant="list" />
          </section>

          <section className="card space-y-2 p-4 shadow-none">
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <Icon
                name="spa"
                filled={!!gentleMode}
                size={22}
                className="text-sproutine-text-secondary"
              />
              <span className="flex-1 text-base font-semibold text-sproutine-text">
                {t.settings.gentleMode}
              </span>
              <Toggle
                checked={gentleMode ?? false}
                disabled={gentleMode === null}
                onChange={handleGentleModeChange}
              />
            </label>
            <p className="text-sm leading-normal text-sproutine-text-secondary">
              {gentleMode ? t.settings.gentleModeOn : t.settings.gentleModeDesc}
            </p>
          </section>

          {pushState !== 'unsupported' && pushState !== 'not-configured' && (
            <section className="card space-y-2 p-4 shadow-none">
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <Icon
                  name="notifications"
                  filled={!!pushOn}
                  size={22}
                  className="text-sproutine-text-secondary"
                />
                <span className="flex-1 text-base font-semibold text-sproutine-text">
                  {t.settings.notifications}
                </span>
                {pushState === 'supported' ? (
                  <Toggle
                    checked={pushOn ?? false}
                    disabled={pushOn === null}
                    onChange={handlePushChange}
                  />
                ) : null}
              </label>
              <p className="text-sm leading-normal text-sproutine-text-secondary">
                {pushState === 'needs-home-screen'
                  ? t.settings.notificationsHomeScreen
                  : pushOn
                    ? t.settings.notificationsOn
                    : t.settings.notificationsDesc}
              </p>
            </section>
          )}

          <section className="space-y-2.5">
            <h3 className="eyebrow">{t.water.title}</h3>
            <div className="card space-y-3 p-4 shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-[15px] text-sproutine-text">{t.settings.waterGoal}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleWaterGoalChange(-250)}
                    className="icon-btn h-9 w-9"
                  >
                    <Icon name="remove" size={20} />
                  </button>
                  <span className="w-16 text-center text-[15px] font-semibold tabular-nums">
                    {waterGoalMl} ml
                  </span>
                  <button
                    type="button"
                    onClick={() => handleWaterGoalChange(250)}
                    className="icon-btn h-9 w-9"
                  >
                    <Icon name="add" size={20} />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[15px] text-sproutine-text">{t.settings.glassSize}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleWaterGlassChange(-50)}
                    className="icon-btn h-9 w-9"
                  >
                    <Icon name="remove" size={20} />
                  </button>
                  <span className="w-16 text-center text-[15px] font-semibold tabular-nums">
                    {waterGlassMl} ml
                  </span>
                  <button
                    type="button"
                    onClick={() => handleWaterGlassChange(50)}
                    className="icon-btn h-9 w-9"
                  >
                    <Icon name="add" size={20} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-2.5">
            <h3 className="eyebrow">{t.reports.title}</h3>
            <button
              type="button"
              onClick={() => setShowReports(true)}
              className="card flex w-full items-center gap-3 p-4 shadow-none transition-colors hover:bg-sproutine-surface"
            >
              <Icon name="table_chart" size={22} className="text-sproutine-accent" />
              <span className="flex-1 text-left text-[15px] font-semibold text-sproutine-text">
                {t.settings.downloadReport}
              </span>
              <Icon name="chevron_right" size={20} className="text-sproutine-text-secondary" />
            </button>
          </section>

          <section className="space-y-2.5">
            <h3 className="eyebrow">{t.settings.yourData}</h3>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="btn-secondary w-full"
            >
              <Icon name="download" size={20} />
              {isExporting ? t.settings.preparing : t.settings.downloadData}
            </button>
          </section>

          <DeleteAccountSection />
          <AttributionFooter />
        </div>
      </motion.div>

      <AnimatePresence>
        {showReports && <ReportSheet onClose={() => setShowReports(false)} />}
      </AnimatePresence>
    </div>
  )
}
