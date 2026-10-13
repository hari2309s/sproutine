'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { signOut } from '@/lib/auth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrency, type Currency } from '@/contexts/CurrencyContext'
import { useVoicePreference } from '@/contexts/VoiceContext'
import { type Locale } from '@/lib/i18n'
import { type VoiceId } from '@/lib/voices'
import { LanguagePicker } from './LanguagePicker'
import { VoicePicker } from './VoicePicker'
import { CurrencyPicker } from './CurrencyPicker'
import { supabase } from '@/lib/supabase'

interface SettingsSheetProps {
  userId: string
  onClose: () => void
}

export function SettingsSheet({ userId, onClose }: SettingsSheetProps) {
  const { t, setLocale } = useLanguage()
  const { currency, setCurrency } = useCurrency()
  const { voiceId, setVoiceId } = useVoicePreference()
  const [isExporting, setIsExporting] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

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

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const [txRes, goalsRes, budgetsRes, habitsRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/goals'),
        fetch('/api/budgets'),
        fetch('/api/habits'),
      ])
      const [txData, goalsData, budgetsData, habitsData] = await Promise.all([
        txRes.json(),
        goalsRes.json(),
        budgetsRes.json(),
        habitsRes.json(),
      ])
      const exportData = {
        exportedAt: new Date().toISOString(),
        transactions: txData.transactions ?? [],
        goals: goalsData.goals ?? [],
        budgets: budgetsData.budgets ?? [],
        habits: habitsData.habits ?? [],
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `truffle-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
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
    await supabase.auth.updateUser({ data: { language: next } })
  }

  const handleCurrencyChange = async (next: Currency) => {
    setCurrency(next)
    await supabase.auth.updateUser({ data: { currency: next } })
  }

  const handleVoiceChange = async (next: VoiceId) => {
    setVoiceId(next)
    await supabase.auth.updateUser({ data: { voice: next } })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end max-w-lg mx-auto"
      onClick={onClose}
    >
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-sheet-title"
        className="relative bg-truffle-bg rounded-t-2xl border-t border-truffle-border px-4 pt-4 pb-10 space-y-6 overflow-y-auto max-h-[85dvh]"
        style={{ overscrollBehavior: 'contain' }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="settings-sheet-title" className="font-semibold text-truffle-text">
            {t.settings.title}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close settings"
            className="p-2 text-truffle-muted hover:text-truffle-text transition-colors"
          >
            <XIcon />
          </button>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <h3 className="text-xs text-truffle-muted uppercase tracking-wide">
            {t.settings.language}
          </h3>
          <LanguagePicker onChange={handleLocaleChange} />
        </div>

        {/* Currency */}
        <div className="space-y-2">
          <h3 className="text-xs text-truffle-muted uppercase tracking-wide">
            {t.settings.currency}
          </h3>
          <CurrencyPicker value={currency} onChange={handleCurrencyChange} />
        </div>

        {/* Voice */}
        <div className="space-y-2">
          <h3 className="text-xs text-truffle-muted uppercase tracking-wide">{t.settings.voice}</h3>
          <p className="text-xs text-truffle-muted">{t.settings.voiceDesc}</p>
          <VoicePicker value={voiceId} onChange={handleVoiceChange} />
        </div>

        {/* Your data */}
        <div className="space-y-2">
          <h3 className="text-xs text-truffle-muted uppercase tracking-wide">
            {t.settings.yourData}
          </h3>
          <div className="card space-y-3">
            <div>
              <p className="text-sm font-medium text-truffle-text">{t.settings.downloadData}</p>
              <p className="text-xs text-truffle-muted mt-0.5">{t.settings.downloadDataDesc}</p>
            </div>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="btn-primary text-sm w-full disabled:opacity-50"
            >
              {isExporting ? t.settings.preparing : t.settings.exportData}
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="space-y-2">
          <h3 className="text-xs text-truffle-muted uppercase tracking-wide">
            {t.settings.dangerZone}
          </h3>
          <div className="card border-truffle-red/30 space-y-3">
            <div>
              <p className="text-sm font-medium text-truffle-text">{t.settings.deleteAccount}</p>
              <p className="text-xs text-truffle-muted mt-0.5">{t.settings.deleteAccountDesc}</p>
            </div>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder={t.settings.deletePlaceholder}
              className="w-full bg-truffle-surface border border-truffle-border rounded-xl px-3 py-2 text-sm text-truffle-text placeholder-truffle-muted focus:outline-none focus:border-truffle-red"
            />
            {deleteError && <p className="text-xs text-truffle-red">{deleteError}</p>}
            <button
              onClick={handleDelete}
              disabled={deleteInput !== t.settings.deleteConfirmWord || isDeleting}
              className="w-full py-2 rounded-xl text-sm font-medium bg-truffle-red/10 text-truffle-red border border-truffle-red/30 hover:bg-truffle-red/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isDeleting ? t.settings.deleting : t.settings.deleteMyAccount}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function XIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
