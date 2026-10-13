'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useVoicePreference } from '@/contexts/VoiceContext'
import { onVoicesReady, resolveVoice, type ResolvedVoice } from '@/lib/voices'

export type SpeechTone = 'celebratory' | 'reassuring' | 'concerned' | 'neutral'

interface SpeakOptions {
  tone?: SpeechTone
}

interface UseTextToSpeechReturn {
  speak: (text: string, options?: SpeakOptions) => void
  isSpeaking: boolean
  cancel: () => void
}

// Strip markdown and normalize punctuation for natural TTS flow.
// Returns a single clean string — no splitting, so the browser synthesises
// the whole response in one continuous breath (better prosody than chaining).
function preprocessText(raw: string): string {
  return raw
    .replace(/<function=[^>]*>[\s\S]*?<\/function>/g, '') // strip leaked tool-call XML
    // Strip emoji / pictographs — the synth verbalises them ("waving hand sign").
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '') // regional indicators (flags)
    .replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1') // italic
    .replace(/_(.*?)_/g, '$1') // underscore italic
    .replace(/`[^`]+`/g, '') // inline code
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/^[-*•]\s+/gm, '') // list markers
    .replace(/—/g, ', ') // em-dash → natural pause
    .replace(/ - /g, ', ') // spaced hyphen used as em-dash
    .replace(/;/g, ',') // semicolons → lighter pause
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const { voiceId } = useVoicePreference()
  const [isSpeaking, setIsSpeaking] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  // Cache the resolved voice + prosody so speak() can assign it synchronously
  // (Chrome requires the speak() call to stay inside the user gesture).
  const resolvedRef = useRef<ResolvedVoice>({ voice: null, rate: 0.95, pitch: 1.0 })
  const voiceIdRef = useRef(voiceId)

  // Re-resolve whenever the user changes their voice preference, and once more
  // when the platform's voice list finishes loading (Chrome populates it async).
  useEffect(() => {
    voiceIdRef.current = voiceId
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const load = () => {
      resolvedRef.current = resolveVoice(voiceIdRef.current)
    }
    load()
    return onVoicesReady(load)
  }, [voiceId])

  const cancel = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    utteranceRef.current = null
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [])

  const speak = useCallback((text: string, _options?: SpeakOptions) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()

    const clean = preprocessText(text)

    const utterance = new SpeechSynthesisUtterance(clean)
    utteranceRef.current = utterance

    // Use the pre-resolved persona voice; fall back to a fresh lookup if the
    // ref hasn't populated yet (voice list still loading).
    const resolved = resolvedRef.current.voice
      ? resolvedRef.current
      : resolveVoice(voiceIdRef.current)
    if (resolved.voice) utterance.voice = resolved.voice

    utterance.rate = resolved.rate
    utterance.pitch = resolved.pitch
    utterance.volume = 1.0

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') console.warn('[TTS error]', e.error)
      setIsSpeaking(false)
    }

    window.speechSynthesis.speak(utterance)
  }, [])

  return { speak, isSpeaking, cancel }
}
