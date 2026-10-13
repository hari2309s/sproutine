'use client'

import Image from 'next/image'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageEnter } from './PageMotion'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { useVoicePreference } from '@/contexts/VoiceContext'
import type { Currency } from '@/contexts/CurrencyContext'
import { LanguagePicker } from './LanguagePicker'
import { VoicePicker } from './VoicePicker'
import { CurrencyPicker } from './CurrencyPicker'

interface OnboardingPageProps {
  onComplete: () => void
}

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const { t, locale, setLocale } = useLanguage()
  const { voiceId, setVoiceId } = useVoicePreference()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<Currency>('EUR')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tourStep, setTourStep] = useState<number | null>(null)

  const tourSteps = t.tour.steps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: name.trim(), currency, language: locale, voice: voiceId },
      })
      if (error) throw error
      setTourStep(0)
    } catch {
      setError(t.onboarding.errorSave)
    } finally {
      setIsLoading(false)
    }
  }

  if (tourStep !== null) {
    const step = tourSteps[tourStep]!
    const isLast = tourStep === tourSteps.length - 1

    return (
      <div className="min-h-screen bg-truffle-bg flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={tourStep}
              className="text-center space-y-4"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28 }}
            >
              <span className="text-5xl block">{step.emoji}</span>
              <h2 className="text-2xl font-bold text-truffle-text">{step.title}</h2>
              <p className="text-truffle-muted text-sm leading-relaxed">{step.body}</p>
            </motion.div>
          </AnimatePresence>

          {/* Step dots */}
          <div className="flex justify-center gap-2">
            {tourSteps.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === tourStep ? 'bg-truffle-amber w-4' : 'bg-truffle-border'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => (isLast ? onComplete() : setTourStep((s) => (s ?? 0) + 1))}
            className="btn-primary w-full"
          >
            {isLast ? t.tour.letsGo : t.tour.next}
          </button>

          <button
            onClick={onComplete}
            className="block w-full text-center text-xs text-truffle-muted hover:text-truffle-text transition-colors"
          >
            {t.tour.skip}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-truffle-bg flex flex-col items-center justify-center px-6">
      <PageEnter className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <Image
            src="/icons/truffle.png"
            alt="Truffle"
            width={64}
            height={64}
            priority
            className="mx-auto"
          />
          <h1 className="text-2xl font-bold text-truffle-text">{t.onboarding.heading}</h1>
          <p className="text-truffle-muted text-sm">{t.onboarding.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-truffle-muted uppercase tracking-wide">
              {t.onboarding.languageLabel}
            </label>
            <LanguagePicker onChange={setLocale} />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-truffle-muted uppercase tracking-wide">
              {t.onboarding.nameLabel}
            </label>
            <input
              type="text"
              placeholder={t.onboarding.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-truffle-surface border border-truffle-border rounded-xl px-4 py-3 text-truffle-text placeholder-truffle-muted focus:outline-none focus:border-truffle-amber"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-truffle-muted uppercase tracking-wide">
              {t.onboarding.currencyLabel}
            </label>
            <CurrencyPicker value={currency} onChange={setCurrency} />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-truffle-muted uppercase tracking-wide">
              {t.onboarding.voiceLabel}
            </label>
            <VoicePicker value={voiceId} onChange={setVoiceId} />
            <p className="text-xs text-truffle-muted pt-1">{t.onboarding.voiceHint}</p>
          </div>

          {error && <p className="text-sm text-truffle-red text-center">{error}</p>}

          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? t.onboarding.saving : t.onboarding.continue}
          </button>
        </form>
      </PageEnter>
    </div>
  )
}
