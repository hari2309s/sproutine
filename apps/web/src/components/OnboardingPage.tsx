'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DIETS, EU_ALLERGENS, type Allergen, type Diet } from '@sproutine/types'
import { PageEnter } from './PageMotion'
import { RosieAvatar, Wordmark } from './Brand'
import { Icon, type IconName } from './Icon'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { useVoicePreference } from '@/contexts/VoiceContext'
import { LanguagePicker } from './LanguagePicker'
import { VoicePicker } from './VoicePicker'
import { LOCALE_LABELS } from '@/lib/i18n'

interface OnboardingPageProps {
  userId: string
  /** The name given at sign-up, if any; still editable here. */
  initialName?: string
  onComplete: () => void
}

const PRIVACY_URL = 'https://sproutine-landing-two.vercel.app/privacy'

function Chip({
  label,
  selected,
  multi,
  onClick,
}: {
  label: string
  selected: boolean
  multi?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex min-h-11 items-center gap-1.5 rounded-full text-[15px] text-sproutine-text transition-colors ${
        selected
          ? 'border-[1.5px] border-sproutine-accent bg-sproutine-accent-soft pr-4 pl-3 font-semibold'
          : `border border-sproutine-border-strong bg-sproutine-card font-medium hover:bg-sproutine-surface ${multi ? 'pr-4 pl-3' : 'px-4'}`
      }`}
    >
      {selected ? (
        <Icon name="check" size={18} className="text-sproutine-accent" />
      ) : (
        multi && <Icon name="add" size={18} className="text-sproutine-muted" />
      )}
      {label}
    </button>
  )
}

function FieldLabel({
  htmlFor,
  label,
  optional,
}: {
  htmlFor?: string
  label: string
  optional?: string
}) {
  return (
    <label htmlFor={htmlFor} className="flex items-baseline gap-2">
      <span className="text-[15px] font-semibold text-sproutine-text">{label}</span>
      {optional && <span className="text-[13px] text-sproutine-muted">{optional}</span>}
    </label>
  )
}

export function OnboardingPage({ userId, initialName = '', onComplete }: OnboardingPageProps) {
  const { t, locale, setLocale } = useLanguage()
  const { voiceId, setVoiceId } = useVoicePreference()
  const [name, setName] = useState(initialName)
  const [diet, setDiet] = useState<Diet>('omnivore')
  const [allergies, setAllergies] = useState<Allergen[]>([])
  const [dislikes, setDislikes] = useState('')
  const [budget, setBudget] = useState('')
  const [quitDate, setQuitDate] = useState('')
  const [consent, setConsent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tourStep, setTourStep] = useState<number | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const canSubmit = consent && !!name.trim() && !isLoading

  const toggleAllergy = (a: Allergen) =>
    setAllergies((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    const budgetEuros = Number(budget.replace(',', '.'))
    setIsLoading(true)
    setError(null)
    try {
      const { error } = await supabase.from('profiles').insert({
        user_id: userId,
        display_name: name.trim().slice(0, 60),
        diet,
        allergies,
        dislikes: dislikes
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean)
          .slice(0, 30),
        budget_weekly_cents:
          budget.trim() && Number.isFinite(budgetEuros) && budgetEuros >= 0
            ? Math.round(budgetEuros * 100)
            : null,
        quit_date: quitDate || null,
        locale,
        voice_id: voiceId,
        consent_health_at: new Date().toISOString(),
      })
      if (error) throw error
      // The voice preference also lives in user_metadata for instant client
      // access (VoiceContext); the profile row is the server's copy.
      await supabase.auth.updateUser({ data: { voice: voiceId, language: locale } })
      setTourStep(0)
    } catch (e) {
      console.error('[onboarding] save failed:', e)
      setError(t.onboarding.errorSave)
    } finally {
      setIsLoading(false)
    }
  }

  if (tourStep !== null) {
    return <Tour step={tourStep} onStep={setTourStep} onDone={onComplete} />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-sproutine-bg">
      {/* Stays put while the form scrolls underneath. */}
      <header className="flex h-[60px] shrink-0 items-center border-b border-sproutine-border">
        <div className="mx-auto w-full max-w-lg px-5">
          <Wordmark />
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PageEnter className="mx-auto flex w-full max-w-lg flex-col gap-7 px-5 pt-6 pb-10">
          <div className="flex items-end gap-2.5">
            <RosieAvatar />
            <p className="rounded-[20px] rounded-bl-md border border-sproutine-border bg-sproutine-card px-3.5 py-3 text-[15px] leading-normal text-sproutine-text">
              {t.onboarding.intro}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-7">
            {Object.keys(LOCALE_LABELS).length > 1 && (
              <div className="flex flex-col gap-2">
                <FieldLabel label={t.onboarding.languageLabel} />
                <LanguagePicker onChange={setLocale} />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="onb-name" label={t.onboarding.nameLabel} />
              <input
                id="onb-name"
                type="text"
                placeholder={t.onboarding.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                autoComplete="given-name"
                required
                className="field"
              />
            </div>

            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-2.5 text-[15px] font-semibold text-sproutine-text">
                {t.onboarding.dietLabel}
              </legend>
              <div className="flex flex-wrap gap-2">
                {DIETS.map((d) => (
                  <Chip
                    key={d}
                    label={t.diets[d]}
                    selected={diet === d}
                    onClick={() => setDiet(d)}
                  />
                ))}
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-2.5 flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold text-sproutine-text">
                  {t.onboarding.allergiesLabel}
                </span>
                <span className="text-sm leading-snug text-sproutine-text-secondary">
                  {t.onboarding.allergiesHint}
                </span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {EU_ALLERGENS.map((a) => (
                  <Chip
                    key={a}
                    multi
                    label={t.allergens[a]}
                    selected={allergies.includes(a)}
                    onClick={() => toggleAllergy(a)}
                  />
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="onb-dislikes" label={t.onboarding.dislikesLabel} />
              <input
                id="onb-dislikes"
                type="text"
                placeholder={t.onboarding.dislikesPlaceholder}
                value={dislikes}
                onChange={(e) => setDislikes(e.target.value)}
                className="field"
              />
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="onb-budget"
                label={t.onboarding.budgetLabel}
                optional={t.onboarding.optional}
              />
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-semibold text-sproutine-text-secondary">
                  €
                </span>
                <input
                  id="onb-budget"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={1}
                  placeholder={t.onboarding.budgetPlaceholder}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="field pr-24 pl-9 focus:pr-24 focus:pl-9"
                />
                <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[15px] text-sproutine-muted">
                  {t.onboarding.perWeek}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="onb-quit"
                label={t.onboarding.quitDateLabel}
                optional={t.onboarding.optional}
              />
              <input
                id="onb-quit"
                type="date"
                max={today}
                value={quitDate}
                onChange={(e) => setQuitDate(e.target.value)}
                aria-describedby="onb-quit-hint"
                className="field"
              />
              <p
                id="onb-quit-hint"
                className="text-sm leading-normal text-sproutine-text-secondary"
              >
                {t.onboarding.quitDateHint}
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <FieldLabel label={t.onboarding.voiceLabel} />
              <VoicePicker value={voiceId} onChange={setVoiceId} />
            </div>

            <div className="flex flex-col gap-3.5 border-t border-sproutine-border pt-4">
              <label className="flex cursor-pointer items-start gap-3">
                <span className="relative mt-px flex h-6 w-6 shrink-0">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked)
                      if (error) setError(null)
                    }}
                    className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-[7px]"
                  />
                  <span
                    aria-hidden
                    className={`pointer-events-none flex h-6 w-6 items-center justify-center rounded-[7px] peer-focus-visible:shadow-[0_0_0_2px_var(--t-bg),0_0_0_4px_var(--t-text)] ${
                      consent
                        ? 'bg-sproutine-accent text-sproutine-bg'
                        : 'border-2 border-sproutine-border-strong bg-sproutine-card'
                    }`}
                  >
                    {consent && <Icon name="check" size={20} />}
                  </span>
                </span>
                <span className="text-[15px] leading-normal text-sproutine-text">
                  {t.onboarding.consentLabel}{' '}
                  <a
                    href={PRIVACY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-sproutine-accent underline-offset-2 hover:underline"
                  >
                    {t.onboarding.privacyPolicy}
                  </a>{' '}
                  <span className="text-[13px] text-sproutine-muted">
                    · {t.onboarding.required}
                  </span>
                </span>
              </label>

              <p className="text-[13px] leading-normal text-sproutine-muted">
                {t.onboarding.disclaimer}
              </p>

              {error && (
                <p
                  role="alert"
                  className="flex items-center gap-1.5 text-sm font-medium text-sproutine-red"
                >
                  <Icon name="error" size={18} />
                  {error}
                </p>
              )}

              <button type="submit" disabled={!canSubmit} className="btn-primary w-full">
                {isLoading ? t.onboarding.saving : t.onboarding.continue}
              </button>
              {!consent && (
                <p className="-mt-1 text-center text-[13px] text-sproutine-text-secondary">
                  {t.onboarding.consentHint}
                </p>
              )}
            </div>
          </form>
        </PageEnter>
      </div>
    </div>
  )
}

// ─── Tour ─────────────────────────────────────────────────────────────────────

const HABIT_ICONS: IconName[] = ['eco', 'water_drop', 'coffee']

function Tour({
  step,
  onStep,
  onDone,
}: {
  step: number
  onStep: (s: number) => void
  onDone: () => void
}) {
  const { t } = useLanguage()
  const steps = t.tour.steps
  const current = steps[step]!
  const isLast = step === steps.length - 1
  const ill = t.tour.illustrations

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col bg-sproutine-bg">
      <div className="flex h-[52px] shrink-0 justify-end px-3">
        {!isLast && (
          <button
            type="button"
            onClick={onDone}
            className="btn-ghost h-11 text-[15px] text-sproutine-text-secondary"
          >
            {t.tour.skip}
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="flex flex-1 flex-col gap-7 overflow-y-auto px-6 pt-2"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.28 }}
        >
          <div
            aria-hidden
            className="flex min-h-[330px] flex-col justify-center gap-2.5 rounded-[28px] bg-sproutine-surface p-6"
          >
            {step === 0 && (
              <>
                <p className="max-w-[85%] self-end rounded-[20px] rounded-br-md bg-sproutine-accent px-3.5 py-2.5 text-[15px] leading-snug text-sproutine-bg">
                  {ill.logUser}
                </p>
                <div className="flex max-w-[85%] flex-col gap-2 self-start rounded-[20px] rounded-bl-md border border-sproutine-border bg-sproutine-card px-3.5 py-2.5 text-[15px] leading-snug text-sproutine-text">
                  {ill.logRosie}
                  <span className="flex items-center gap-1.5 self-start rounded-full bg-sproutine-surface px-2.5 py-1 text-[13px] font-semibold text-sproutine-green">
                    <Icon name="check" size={16} />
                    {ill.logged}
                  </span>
                </div>
                <span className="mt-2.5 flex h-16 w-16 items-center justify-center self-center rounded-full bg-sproutine-accent text-sproutine-bg shadow-[0_0_0_6px_var(--t-accent-soft)]">
                  <Icon name="mic" filled size={28} />
                </span>
              </>
            )}
            {step === 1 && (
              <div className="card flex flex-col p-4">
                <div className="flex items-center justify-between pb-2">
                  <span className="font-display text-lg text-sproutine-text">{ill.weekTitle}</span>
                  <span className="rounded-full bg-sproutine-surface px-2.5 py-1 text-[13px] font-semibold text-sproutine-text">
                    {ill.weekBudget}
                  </span>
                </div>
                {ill.weekDays.map(([day, meal]) => (
                  <div
                    key={day}
                    className="flex min-h-11 items-center gap-3 border-t border-sproutine-border text-[15px] text-sproutine-text"
                  >
                    <span className="w-9 text-[13px] font-semibold text-sproutine-muted">
                      {day}
                    </span>
                    {meal}
                  </div>
                ))}
              </div>
            )}
            {step === 2 && (
              <div className="flex flex-col items-start gap-2.5">
                {ill.habits.map((habit, i) => (
                  <span
                    key={habit}
                    className={`flex min-h-12 items-center gap-2 rounded-full border border-sproutine-border bg-sproutine-card pr-[18px] pl-3.5 text-[15px] font-medium text-sproutine-text ${
                      i === 1 ? 'self-end' : ''
                    }`}
                  >
                    <Icon
                      name={HABIT_ICONS[i] ?? 'eco'}
                      size={20}
                      className="text-sproutine-green"
                    />
                    {habit}
                  </span>
                ))}
                <p className="mt-1.5 self-stretch rounded-[20px] rounded-bl-md border border-sproutine-border bg-sproutine-card px-3.5 py-2.5 text-[15px] leading-snug text-sproutine-text">
                  {ill.missedDay}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="font-display text-[32px] leading-[1.1] text-sproutine-text">
              {current.title}
            </h2>
            <p className="text-base leading-relaxed text-pretty text-sproutine-text-secondary">
              {current.body}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="safe-bottom flex shrink-0 flex-col gap-5 px-6 pt-4 pb-9">
        <div
          className="flex items-center justify-center gap-2"
          aria-label={`${step + 1} / ${steps.length}`}
        >
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-sproutine-accent' : 'w-2 bg-sproutine-border-strong'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => (isLast ? onDone() : onStep(step + 1))}
          className="btn-primary w-full"
        >
          {isLast ? t.tour.letsGo : t.tour.next}
        </button>
      </div>
    </div>
  )
}
