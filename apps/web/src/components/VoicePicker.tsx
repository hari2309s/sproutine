'use client'

import { useEffect, useState } from 'react'
import { VOICE_PERSONAS, previewVoice, stopVoicePreview, type VoiceId } from '@/lib/voices'
import { useLanguage } from '@/contexts/LanguageContext'
import { Icon } from './Icon'

interface VoicePickerProps {
  value: VoiceId
  onChange: (id: VoiceId) => void
  /** 'cards' = separate cards with a Sample pill (onboarding); 'list' = one grouped card (settings). */
  variant?: 'cards' | 'list'
}

export function VoicePicker({ value, onChange, variant = 'cards' }: VoicePickerProps) {
  const { t } = useLanguage()
  const [previewing, setPreviewing] = useState<VoiceId | null>(null)

  // Prompt Chrome to start loading its voice list now, so the first preview
  // click doesn't get deferred past the user gesture (and silently dropped).
  useEffect(() => {
    try {
      window.speechSynthesis?.getVoices()
    } catch {
      /* speechSynthesis unavailable */
    }
    return () => stopVoicePreview()
  }, [])

  const handlePreview = (id: VoiceId) => {
    if (previewing === id) {
      stopVoicePreview()
      setPreviewing(null)
      return
    }
    previewVoice(id, {
      onStart: () => setPreviewing(id),
      onEnd: () => setPreviewing((current) => (current === id ? null : current)),
    })
  }

  const isList = variant === 'list'

  return (
    <div
      role="radiogroup"
      aria-label={t.voices.groupLabel}
      className={
        isList
          ? 'flex flex-col overflow-hidden rounded-[22px] border border-sproutine-border bg-sproutine-card'
          : 'flex flex-col gap-2.5'
      }
    >
      {VOICE_PERSONAS.map((persona) => {
        const selected = value === persona.id
        const isPreviewing = previewing === persona.id
        const description = t.voices.descriptions[persona.id]
        return (
          <div
            key={persona.id}
            className={`flex items-center gap-3 pr-2 pl-3.5 ${
              isList
                ? 'min-h-[60px] border-b border-sproutine-border last:border-b-0'
                : 'min-h-16 rounded-2xl border border-sproutine-border bg-sproutine-card'
            }`}
          >
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(persona.id)}
              className="flex min-h-11 flex-1 items-center gap-3 rounded-xl text-left"
            >
              <span
                aria-hidden
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  selected ? 'border-sproutine-accent' : 'border-sproutine-border-strong'
                }`}
              >
                {selected && <span className="h-3 w-3 rounded-full bg-sproutine-accent" />}
              </span>
              <span className="flex flex-col leading-tight">
                <span
                  className={`text-[15px] text-sproutine-text ${selected ? 'font-semibold' : ''}`}
                >
                  {persona.name}
                </span>
                {!isList && (
                  <span className="text-[13px] text-sproutine-text-secondary">{description}</span>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handlePreview(persona.id)}
              aria-label={
                isPreviewing ? t.voices.stopSample(persona.name) : t.voices.playSample(persona.name)
              }
              className={
                isList
                  ? 'icon-btn bg-sproutine-surface text-sproutine-accent'
                  : 'flex h-11 items-center gap-1 rounded-full bg-sproutine-surface pr-3.5 pl-2.5 text-sm font-semibold text-sproutine-text hover:bg-sproutine-accent-soft'
              }
            >
              <Icon
                name={isPreviewing ? 'stop' : 'play_arrow'}
                filled
                size={22}
                className="text-sproutine-accent"
              />
              {!isList && (isPreviewing ? t.voices.stop : t.voices.sample)}
            </button>
          </div>
        )
      })}
    </div>
  )
}
