'use client'

import { useEffect, useState } from 'react'
import { VOICE_PERSONAS, previewVoice, stopVoicePreview, type VoiceId } from '@/lib/voices'

interface VoicePickerProps {
  value: VoiceId
  onChange: (id: VoiceId) => void
}

export function VoicePicker({ value, onChange }: VoicePickerProps) {
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

  return (
    <div role="radiogroup" aria-label="Truffle voice" className="space-y-2">
      {VOICE_PERSONAS.map((persona) => {
        const selected = value === persona.id
        const isPreviewing = previewing === persona.id
        return (
          <div
            key={persona.id}
            role="radio"
            aria-checked={selected}
            tabIndex={0}
            onClick={() => onChange(persona.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onChange(persona.id)
              }
            }}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border cursor-pointer transition-all ${
              selected
                ? 'bg-truffle-amber/10 border-truffle-amber'
                : 'bg-truffle-surface border-truffle-border hover:border-truffle-muted'
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handlePreview(persona.id)
              }}
              aria-label={
                isPreviewing ? `Stop ${persona.name} preview` : `Preview ${persona.name}'s voice`
              }
              className="shrink-0 w-9 h-9 rounded-full bg-truffle-amber text-truffle-bg flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              {isPreviewing ? <StopIcon /> : <PlayIcon />}
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-truffle-text">
                {persona.name}
                <span className="ml-1.5 text-truffle-muted font-normal">
                  {persona.flag} {persona.accent}
                </span>
              </p>
              <p className="text-xs text-truffle-muted truncate">{persona.description}</p>
            </div>

            <span
              aria-hidden
              className={`shrink-0 w-4 h-4 rounded-full border-2 transition-colors ${
                selected ? 'border-truffle-amber bg-truffle-amber' : 'border-truffle-border'
              }`}
            />
          </div>
        )
      })}
    </div>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </svg>
  )
}
