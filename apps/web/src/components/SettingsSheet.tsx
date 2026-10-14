'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { signOut } from '@/lib/auth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useVoicePreference } from '@/contexts/VoiceContext'
import { type Locale } from '@/lib/i18n'
import { type VoiceId } from '@/lib/voices'
import { LanguagePicker } from './LanguagePicker'
import { ThemeSegmented } from './ThemeToggle'
import { Icon } from './Icon'
import { VoicePicker } from './VoicePicker'
import { supabase } from '@/lib/supabase'
import { fetchOwnProfile } from '@/lib/profile'

interface SettingsSheetProps {
  userId: string
  onClose: () => void
}

export function SettingsSheet({ userId, onClose }: SettingsSheetProps) {
  const { t, setLocale } = useLanguage()
  const { voiceId, setVoiceId } = useVoicePreference()
  const [isExporting, setIsExporting] = useState(false)
  const [gentleMode, setGentleMode] = useState<boolean | null>(null)
  const [deleteInput, setDeleteInput] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchOwnProfile(userId)
      .then((p) => setGentleMode(p?.safetyMode ?? false))
      .catch(() => setGentleMode(false))
  }, [userId])

  // Move focus into the sheet on open, and let Escape close it.
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

  // GDPR Art. 20 export: everything stored about the user, read through RLS.
  const handleExport = async () => {
    setIsExporting(true)
    try {
      const [profileRes, messagesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase
          .from('chat_messages')
          .select('role, content, is_proactive, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: true }),
      ])
      if (profileRes.error) throw profileRes.error
      if (messagesRes.error) throw messagesRes.error
      const exportData = {
        exportedAt: new Date().toISOString(),
        profile: profileRes.data,
        chatMessages: messagesRes.data ?? [],
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sproutine-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('[settings] export failed:', e)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDelete = async () => {
    if (deleteInput !== t.settings.deleteConfirmWord) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error('server error')
      await signOut()
    } catch {
      setDeleteError(t.settings.deleteError)
      setIsDeleting(false)
    }
  }

  const handleLocaleChange = async (next: Locale) => {
    setLocale(next)
    await Promise.all([
      supabase.auth.updateUser({ data: { language: next } }),
      supabase.from('profiles').update({ locale: next }).eq('user_id', userId),
    ])
  }

  const handleVoiceChange = async (next: VoiceId) => {
    setVoiceId(next)
    await Promise.all([
      supabase.auth.updateUser({ data: { voice: next } }),
      supabase.from('profiles').update({ voice_id: next }).eq('user_id', userId),
    ])
  }

  const handleGentleModeChange = async (next: boolean) => {
    const previous = gentleMode
    setGentleMode(next)
    const { error } = await supabase
      .from('profiles')
      .update({ safety_mode: next })
      .eq('user_id', userId)
    if (error) setGentleMode(previous)
  }

  const deleteArmed = deleteInput === t.settings.deleteConfirmWord

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

          <section className="space-y-3 rounded-[22px] border-[1.5px] border-sproutine-red p-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold tracking-[0.06em] text-sproutine-red uppercase">
              <Icon name="delete" size={18} />
              {t.settings.dangerZone}
            </h3>
            <p className="text-[15px] leading-normal text-sproutine-text">
              {t.settings.deleteAccountDesc}
            </p>
            <div className="space-y-1.5">
              <label htmlFor="delete-confirm" className="text-sm font-semibold text-sproutine-text">
                {t.settings.deleteConfirmLabel}
              </label>
              <input
                id="delete-confirm"
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="field font-mono tracking-[0.06em]"
              />
            </div>
            {deleteError && (
              <p
                role="alert"
                className="flex items-center gap-1.5 text-sm font-medium text-sproutine-red"
              >
                <Icon name="error" size={18} />
                {deleteError}
              </p>
            )}
            <button
              type="button"
              onClick={handleDelete}
              disabled={!deleteArmed || isDeleting}
              className="btn-destructive w-full"
            >
              <Icon name="delete" size={20} />
              {isDeleting ? t.settings.deleting : t.settings.deleteMyAccount}
            </button>
            {deleteInput && (
              <button
                type="button"
                onClick={() => setDeleteInput('')}
                className="btn-ghost h-11 w-full text-[15px] text-sproutine-text-secondary"
              >
                {t.settings.keepAccount}
              </button>
            )}
          </section>

          <p className="text-center text-[13px] leading-normal text-sproutine-muted">
            {t.settings.disclaimer}
          </p>
          {/* Required attribution: OFF is ODbL; USDA asks to be credited. */}
          <p className="-mt-4 text-center text-[13px] leading-normal text-sproutine-muted">
            <a
              href="https://world.openfoodfacts.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline"
            >
              {t.settings.dataSources}
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

/** 52×32 switch; the knob shows a check when on so state never relies on colour. */
function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <span className="relative inline-flex">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full"
      />
      <span
        aria-hidden
        className={`flex h-8 w-[52px] items-center rounded-full px-1 transition-colors peer-focus-visible:shadow-[0_0_0_2px_var(--t-bg),0_0_0_4px_var(--t-text)] ${
          checked
            ? 'justify-end bg-sproutine-accent'
            : 'justify-start border-2 border-sproutine-border-strong bg-sproutine-surface'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <span
          className={`flex items-center justify-center rounded-full ${
            checked
              ? 'h-6 w-6 bg-sproutine-bg text-sproutine-accent'
              : 'h-5 w-5 bg-sproutine-border-strong'
          }`}
        >
          {checked && <Icon name="check" size={16} />}
        </span>
      </span>
    </span>
  )
}
