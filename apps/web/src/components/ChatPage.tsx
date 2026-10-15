'use client'

import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  mealProposalOf,
  planSummaryOf,
  useSproutineChat,
  type SproutineUIMessage,
} from '@/hooks/useSproutineChat'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { ChatBubble } from './ChatBubble'
import { SafetyCard } from './SafetyCard'
import { MealLogCard } from './MealLogCard'
import { MealPlanCard } from './MealPlanCard'
import { VoiceDock, ComposerMicButton, type VoiceButtonStatus } from './VoiceButton'
import { AppColumn } from './AppColumn'
import { BottomNav } from './BottomNav'
import { Icon, type IconName } from './Icon'
import { ErrorBoundary } from './ErrorBoundary'
import { useLanguage } from '@/contexts/LanguageContext'

const SUGGESTION_ICONS: IconName[] = ['restaurant', 'calendar_month', 'nutrition']

interface ChatPageProps {
  initialMessages: SproutineUIMessage[]
  /** Gentle mode: meal cards show no numbers. */
  safetyMode: boolean
}

export function ChatPage({ initialMessages, safetyMode }: ChatPageProps) {
  const { t, locale } = useLanguage()
  const chat = useSproutineChat(initialMessages, locale)
  const voice = useVoiceRecorder()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const processedTranscriptRef = useRef<string | null>(null)
  const reactedRef = useRef<Set<string>>(new Set())
  const [reactions, setReactions] = useState<Record<string, 1 | -1>>({})
  const [input, setInput] = useState('')
  const sendText = chat.sendText
  const startVoice = chat.startVoice

  const status: VoiceButtonStatus = voice.isRecording
    ? 'recording'
    : voice.isTranscribing
      ? 'transcribing'
      : chat.isSpeaking
        ? 'speaking'
        : 'idle'

  const handleReact = useCallback(
    async (traceId: string, token: string, score: 1 | -1, messageId: string) => {
      if (reactedRef.current.has(messageId)) return
      reactedRef.current.add(messageId)
      setReactions((prev) => ({ ...prev, [messageId]: score }))
      fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traceId, token, score }),
      }).catch((e) => console.warn('Failed to send feedback:', e))
    },
    []
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages, status])

  useEffect(() => {
    if (voice.transcript && voice.transcript !== processedTranscriptRef.current) {
      processedTranscriptRef.current = voice.transcript
      startVoice(voice.transcript)
    }
  }, [voice.transcript, startVoice])

  const lastAssistantId = [...chat.messages].reverse().find((m) => m.role === 'assistant')?.id
  const gentle = safetyMode || chat.messages.some((m) => m.metadata?.safety === 'ed_risk')
  const isEmpty = chat.messages.length === 0
  const showComposer = status !== 'recording'

  return (
    <AppColumn>
      {/* ── Header ── */}
      <header className="flex shrink-0 items-center gap-3 py-1 pr-3 pl-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sproutine-accent-soft">
          <Image
            src="/icons/sproutine.png"
            alt=""
            width={70}
            height={70}
            priority
            className="object-cover"
          />
        </span>
        <span className="flex flex-1 flex-col leading-tight">
          <span className="font-display text-[19px] text-sproutine-text">{t.chat.rosieName}</span>
          <span className="text-[13px] text-sproutine-muted">{t.chat.rosieRole}</span>
        </span>
        <button
          type="button"
          onClick={chat.toggleMute}
          aria-pressed={chat.isMuted}
          className={`flex h-11 items-center gap-1.5 rounded-full border border-sproutine-border-strong pr-3.5 pl-3 text-sm font-semibold ${
            chat.isMuted
              ? 'bg-sproutine-surface text-sproutine-text'
              : 'text-sproutine-text-secondary hover:bg-sproutine-surface'
          }`}
        >
          <Icon name={chat.isMuted ? 'volume_off' : 'volume_up'} size={20} />
          {chat.isMuted ? t.chat.muted : t.chat.soundOn}
        </button>
      </header>

      <ErrorBoundary>
        <main
          className={`flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-3 ${isEmpty ? 'justify-end' : ''}`}
          aria-live="polite"
        >
          {/* ── Empty state ── */}
          {isEmpty && (
            <>
              <div className="flex flex-1 flex-col justify-end gap-2.5 px-0">
                <Image
                  src="/icons/sproutine.png"
                  alt=""
                  width={140}
                  height={140}
                  priority
                  className="-mb-5 -ml-[18px]"
                />
                <h1 className="font-display text-[32px] leading-[1.1] text-sproutine-text" style={{ textWrap: 'balance' as never }}>
                  {t.chat.emptyTitle}
                </h1>
                <p className="text-[16px] leading-[1.55] text-sproutine-text-secondary" style={{ textWrap: 'pretty' as never }}>
                  {t.chat.emptyBody}
                </p>
              </div>

              {/* Suggestion card */}
              <div className="overflow-hidden rounded-[22px] border border-sproutine-border bg-sproutine-card shadow-soft">
                {t.chat.suggestions.map((suggestion, i) => (
                  <button
                    key={suggestion.title}
                    type="button"
                    onClick={() => sendText(suggestion.subtitle)}
                    className={`flex min-h-16 w-full items-center gap-3 px-4 text-left hover:bg-sproutine-surface ${
                      i < t.chat.suggestions.length - 1 ? 'border-b border-sproutine-border' : ''
                    }`}
                  >
                    <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-sproutine-accent-soft text-sproutine-accent">
                      <Icon name={SUGGESTION_ICONS[i] ?? 'restaurant'} size={20} />
                    </span>
                    <span className="flex flex-1 flex-col leading-[1.3]">
                      <span className="text-[15px] font-semibold text-sproutine-text">
                        {suggestion.title}
                      </span>
                      <span className="text-[13px] text-sproutine-text-secondary">
                        &ldquo;{suggestion.subtitle}&rdquo;
                      </span>
                    </span>
                    <Icon name="chevron_right" size={22} className="text-sproutine-muted" />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── Messages ── */}
          {chat.messages.map((message, idx) => {
            const isLast = idx === chat.messages.length - 1
            const failed = isLast && !!chat.error && message.role === 'user'
            const safety = message.metadata?.safety
            const clean = chat
              .messageText(message)
              .replace(/<function=[^>]*>[\s\S]*?<\/function>/g, '')
              .trim()
            if (!clean) return null

            if (message.role === 'assistant' && safety) {
              return <SafetyCard key={message.id} category={safety} />
            }

            const planSummary = message.role === 'assistant' ? planSummaryOf(message) : null
            if (planSummary) {
              return (
                <div key={message.id} className="flex flex-col gap-2">
                  <ChatBubble
                    role="assistant"
                    content={clean}
                    timestamp={message.metadata?.createdAt}
                    speaking={chat.isSpeaking && message.id === lastAssistantId}
                    sources={message.metadata?.sources}
                  />
                  <MealPlanCard summary={planSummary} />
                </div>
              )
            }

            const mealProposal = message.role === 'assistant' ? mealProposalOf(message) : null
            if (mealProposal) {
              return (
                <div key={message.id} className="flex flex-col gap-2">
                  <ChatBubble
                    role="assistant"
                    content={clean}
                    timestamp={message.metadata?.createdAt}
                    speaking={chat.isSpeaking && message.id === lastAssistantId}
                    sources={message.metadata?.sources}
                  />
                  <MealLogCard
                    proposal={mealProposal}
                    safetyMode={gentle}
                    traceId={message.metadata?.traceId}
                    fromChat
                  />
                </div>
              )
            }

            return (
              <div key={message.id} className="flex flex-col">
                <ChatBubble
                  role={message.role === 'assistant' ? 'assistant' : 'user'}
                  content={clean}
                  timestamp={message.metadata?.createdAt}
                  speaking={chat.isSpeaking && message.id === lastAssistantId}
                  failed={failed}
                  traceId={message.metadata?.feedbackToken ? message.metadata.traceId : undefined}
                  reaction={reactions[message.id] ?? null}
                  onReact={(tid, score) =>
                    handleReact(tid, message.metadata?.feedbackToken ?? '', score, message.id)
                  }
                  sources={message.metadata?.sources}
                />
                {failed && (
                  <div className="mt-1 flex items-center justify-end gap-1">
                    <span className="flex items-center gap-1 text-[13px] font-semibold text-sproutine-red">
                      <Icon name="error" size={16} />
                      {t.chat.notSent}
                    </span>
                    <button
                      type="button"
                      onClick={() => chat.regenerate()}
                      className="flex h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-sproutine-accent hover:bg-sproutine-accent-soft"
                    >
                      <Icon name="refresh" size={18} />
                      {t.chat.resend}
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* ── Typing indicator: avatar + dots ── */}
          <AnimatePresence>
            {chat.isLoading && (
              <motion.div
                key="typing"
                className="flex items-center gap-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                role="status"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sproutine-accent-soft">
                  <Image
                    src="/icons/sproutine.png"
                    alt=""
                    width={42}
                    height={42}
                    className="object-cover"
                  />
                </span>
                <span className="flex gap-[4px]">
                  <span className="h-[7px] w-[7px] rounded-full bg-sproutine-accent opacity-35 motion-safe:animate-pulse" />
                  <span className="h-[7px] w-[7px] rounded-full bg-sproutine-accent opacity-65 motion-safe:animate-pulse [animation-delay:150ms]" />
                  <span className="h-[7px] w-[7px] rounded-full bg-sproutine-accent motion-safe:animate-pulse [animation-delay:300ms]" />
                </span>
                <span className="text-[13px] text-sproutine-muted">{t.chat.rosieThinking}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {voice.error && (
            <p
              role="alert"
              className="flex items-center justify-center gap-1 text-sm text-sproutine-red"
            >
              <Icon name="error" size={18} />
              {voice.error}
            </p>
          )}
          {chat.error && chat.messages.at(-1)?.role !== 'user' && (
            <p role="alert" className="text-center text-sm text-sproutine-red">
              {t.chat.anErrorOccurred}
            </p>
          )}

          <div ref={messagesEndRef} />
        </main>
      </ErrorBoundary>

      {/* ── Voice dock (recording / transcribing / speaking panels) ── */}
      <VoiceDock
        status={status}
        onStart={voice.startRecording}
        onStop={voice.stopRecording}
        onStopSpeaking={chat.cancelSpeech}
      />

      {/* ── Composer pill ── */}
      {showComposer && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const text = input.trim()
            if (!text) return
            setInput('')
            sendText(text)
          }}
          className="shrink-0 px-3 pb-3"
        >
          <div className="flex h-14 items-center gap-1.5 rounded-full border border-sproutine-border-strong bg-sproutine-card pr-1.5 pl-5 shadow-soft">
            <label htmlFor="chat-input" className="sr-only">
              {t.chat.composerPlaceholder}
            </label>
            <input
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.chat.composerPlaceholder}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-sproutine-text placeholder:text-sproutine-muted focus:outline-none"
            />
            {input.trim() ? (
              <button
                type="submit"
                disabled={chat.isLoading}
                aria-label={t.chat.send}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sproutine-accent text-sproutine-bg disabled:bg-sproutine-surface disabled:text-sproutine-muted"
              >
                <Icon name="arrow_upward" size={22} />
              </button>
            ) : (
              <ComposerMicButton
                status={status}
                onStart={voice.startRecording}
                onStop={voice.stopRecording}
              />
            )}
          </div>
        </form>
      )}

      <BottomNav active="chat" />
    </AppColumn>
  )
}
