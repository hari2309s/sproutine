'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { useLanguage } from '@/contexts/LanguageContext'

export type VoiceButtonStatus = 'idle' | 'recording' | 'transcribing' | 'speaking'

interface VoiceDockProps {
  status: VoiceButtonStatus
  onStart: () => void
  onStop: () => void
  onStopSpeaking: () => void
  onCancel?: () => void
}

// Decorative level bars for the recording state.
const BARS = [6, 10, 16, 24, 14, 28, 20, 12, 26, 18, 8, 22, 30, 16, 10, 24, 14, 20, 28, 12, 18, 26, 10, 16, 22, 8, 14, 24, 18, 10, 6, 12]

function useElapsed(running: boolean): number {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!running) return
    const startedAt = Date.now()
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 250)
    return () => {
      clearInterval(id)
      setSeconds(0)
    }
  }, [running])
  return seconds
}

/**
 * 2a "Kitchen Table" voice dock.
 *
 * - Idle: nothing rendered (mic lives inside the composer pill).
 * - Recording: warm accent-soft panel with transcript area, waveform, timer,
 *   cancel button and a large mic button.
 * - Transcribing / Speaking: compact inline states.
 */
export function VoiceDock({ status, onStart, onStop, onStopSpeaking, onCancel }: VoiceDockProps) {
  const { t } = useLanguage()
  const isRecording = status === 'recording'
  const elapsed = useElapsed(isRecording)

  const pressedRef = useRef(false)

  const start = useCallback(() => {
    if (status !== 'idle') return
    pressedRef.current = true
    onStart()
  }, [status, onStart])

  const stop = useCallback(() => {
    if (!pressedRef.current) return
    pressedRef.current = false
    onStop()
  }, [onStop])

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== ' ' && e.key !== 'Enter') return
    e.preventDefault()
    if (!e.repeat) start()
  }
  const onKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== ' ' && e.key !== 'Enter') return
    e.preventDefault()
    stop()
  }

  // Idle: nothing — the mic button is in the composer.
  if (status === 'idle') return null

  if (status === 'speaking') {
    return (
      <div className="flex items-center justify-center gap-3 px-4 pb-3">
        <button
          type="button"
          onClick={onStopSpeaking}
          className="flex h-11 items-center gap-2 rounded-full bg-sproutine-surface px-4 text-sm font-semibold text-sproutine-text-secondary"
        >
          <Icon name="stop" filled size={18} />
          {t.chat.rosieSpeaking}
        </button>
      </div>
    )
  }

  if (status === 'transcribing') {
    return (
      <div className="flex items-center justify-center gap-3 px-4 pb-3" role="status">
        <span className="flex h-11 items-center gap-2 rounded-full bg-sproutine-accent-soft px-4 text-sm font-semibold text-sproutine-text-secondary">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-sproutine-accent-soft border-t-sproutine-accent motion-reduce:animate-none" />
          {t.chat.transcribing}
        </span>
      </div>
    )
  }

  // Recording: warm panel
  const mm = Math.floor(elapsed / 60)
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="mx-3 mb-3 flex flex-col gap-3.5 rounded-[28px] bg-sproutine-accent-soft p-4">
      {/* Status row */}
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-sproutine-accent" />
        <span className="text-sm font-semibold">{t.chat.recording}</span>
        <span className="flex-1" />
        <span className="font-mono text-sm text-sproutine-text-secondary tabular-nums">
          {mm}:{ss}
        </span>
      </div>

      {/* Waveform bars */}
      <div aria-hidden className="flex h-8 items-center gap-[3px]">
        {BARS.map((h, i) => (
          <span
            key={i}
            className="block flex-1 origin-center rounded-sm bg-sproutine-accent motion-safe:animate-eq"
            style={{ height: h, animationDelay: `${(i % 7) * 0.12}s` }}
          />
        ))}
      </div>

      {/* Controls: cancel – mic – release hint */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <button
          type="button"
          onClick={() => {
            pressedRef.current = false
            ;(onCancel ?? onStop)()
          }}
          className="flex h-11 w-fit items-center gap-1 rounded-full bg-sproutine-card px-4 text-sm font-semibold"
        >
          <Icon name="close" size={20} />
          {t.chat.cancel}
        </button>

        <button
          type="button"
          onPointerDown={start}
          onPointerUp={stop}
          onPointerLeave={stop}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onContextMenu={(e) => e.preventDefault()}
          aria-label={t.chat.releaseToSend}
          aria-pressed
          className="flex h-[72px] w-[72px] touch-none select-none items-center justify-center rounded-full bg-sproutine-accent text-sproutine-bg shadow-[0_0_0_6px_var(--t-card)]"
        >
          <Icon name="mic" filled size={32} />
        </button>

        <span className="justify-self-end text-right text-[13px] leading-tight text-sproutine-text-secondary">
          {t.chat.releaseToSend}
        </span>
      </div>
    </div>
  )
}

/** Mic button for inside the composer pill. */
export function ComposerMicButton({
  onStart,
  onStop,
  status,
}: {
  onStart: () => void
  onStop: () => void
  status: VoiceButtonStatus
}) {
  const { t } = useLanguage()
  const pressedRef = useRef(false)

  const start = useCallback(() => {
    if (status !== 'idle') return
    pressedRef.current = true
    onStart()
  }, [status, onStart])

  const stop = useCallback(() => {
    if (!pressedRef.current) return
    pressedRef.current = false
    onStop()
  }, [onStop])

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={t.chat.holdToTalk}
      className="flex h-11 w-11 touch-none select-none items-center justify-center rounded-full bg-sproutine-accent text-sproutine-bg"
    >
      <Icon name="mic" filled size={24} />
    </button>
  )
}
