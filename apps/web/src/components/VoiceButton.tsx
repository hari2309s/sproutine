'use client'

import { useCallback, useEffect, useState } from 'react'
import { Icon } from './Icon'
import { useLanguage } from '@/contexts/LanguageContext'

export type VoiceButtonStatus = 'idle' | 'recording' | 'transcribing' | 'speaking'

interface VoiceDockProps {
  status: VoiceButtonStatus
  onStart: () => void
  onStop: () => void
  onStopSpeaking: () => void
}

// Decorative level bars for the recording state (heights from the design).
const BARS = [8, 14, 22, 12, 26, 18, 10, 24, 16, 28, 20, 12, 22, 8, 18, 26, 14, 10, 20, 6]

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
 * Hold-to-talk mic and its states. Recording is shown by a ring, bars, a timer
 * and the word "Recording", so it never depends on colour alone.
 */
export function VoiceDock({ status, onStart, onStop, onStopSpeaking }: VoiceDockProps) {
  const { t } = useLanguage()
  const isRecording = status === 'recording'
  const elapsed = useElapsed(isRecording)

  const start = useCallback(() => {
    if (status === 'idle') onStart()
  }, [status, onStart])

  const stop = useCallback(() => {
    if (isRecording) onStop()
  }, [isRecording, onStop])

  // Space/Enter behave like holding the button.
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

  if (status === 'speaking') {
    return (
      <div className="flex flex-col items-center gap-2 pt-1 pb-3">
        <button
          type="button"
          onClick={onStopSpeaking}
          aria-label={t.chat.stopSpeaking}
          className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-sproutine-accent bg-sproutine-card text-sproutine-accent"
        >
          <Icon name="stop" filled size={34} />
        </button>
        <span className="mt-1.5 text-[13px] font-medium text-sproutine-text-secondary">
          {t.chat.rosieSpeaking}
        </span>
      </div>
    )
  }

  if (status === 'transcribing') {
    return (
      <div className="flex flex-col items-center gap-2 pt-1 pb-3" role="status">
        <span className="flex h-20 w-20 items-center justify-center rounded-full border border-sproutine-border bg-sproutine-card">
          <span className="h-[34px] w-[34px] animate-spin rounded-full border-[3px] border-sproutine-accent-soft border-t-sproutine-accent motion-reduce:animate-none" />
        </span>
        <span className="mt-1.5 text-[13px] font-medium text-sproutine-text-secondary">
          {t.chat.transcribing}
        </span>
      </div>
    )
  }

  const mm = Math.floor(elapsed / 60)
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <div
      className={`flex flex-col items-center ${
        isRecording
          ? 'gap-3.5 border-t border-sproutine-border bg-sproutine-surface pt-3.5 pb-5'
          : 'gap-2 pt-1 pb-3'
      }`}
    >
      {isRecording && (
        <>
          <div className="flex items-center gap-2.5" role="status">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-sproutine-text">
              <span className="h-2 w-2 rounded-full bg-sproutine-accent" />
              {t.chat.recording}
            </span>
            <span className="font-mono text-sm text-sproutine-text-secondary tabular-nums">
              {mm}:{ss}
            </span>
          </div>
          <div aria-hidden className="flex h-7 items-center gap-1">
            {BARS.map((h, i) => (
              <span
                key={i}
                className="block w-1 origin-center rounded-sm bg-sproutine-accent motion-safe:animate-eq"
                style={{ height: h, animationDelay: `${(i % 7) * 0.12}s` }}
              />
            ))}
          </div>
        </>
      )}
      <button
        type="button"
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={isRecording ? t.chat.releaseToSend : t.chat.holdToTalk}
        aria-pressed={isRecording}
        className={`flex touch-none select-none items-center justify-center rounded-full bg-sproutine-accent text-sproutine-bg transition-all duration-150 ${
          isRecording
            ? 'my-2 h-24 w-24 shadow-[0_0_0_10px_var(--t-accent-soft),0_0_0_12px_var(--t-accent)]'
            : 'h-20 w-20 shadow-[0_0_0_8px_var(--t-accent-soft)] hover:bg-sproutine-accent-hover'
        }`}
      >
        <Icon name="mic" filled size={isRecording ? 38 : 34} />
      </button>
      <span
        className={`text-[13px] font-medium ${isRecording ? 'text-sproutine-text-secondary' : 'mt-1.5 text-sproutine-muted'}`}
      >
        {isRecording ? t.chat.releaseToSend : t.chat.holdToTalk}
      </span>
    </div>
  )
}
