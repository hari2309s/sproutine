'use client'

import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { staggerItemVariants, staggerListVariants } from '@/lib/motion'
import { mealProposalOf, useSproutineChat, type SproutineUIMessage } from '@/hooks/useSproutineChat'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { ChatBubble } from './ChatBubble'
import { SafetyCard } from './SafetyCard'
import { MealLogCard } from './MealLogCard'
import { VoiceDock, type VoiceButtonStatus } from './VoiceButton'
import { AppColumn } from './AppColumn'
import { BottomNav } from './BottomNav'
import { RosieAvatar } from './Brand'
import { Icon, type IconName } from './Icon'
import { ErrorBoundary } from './ErrorBoundary'
import { useLanguage } from '@/contexts/LanguageContext'

const SUGGESTION_ICONS: IconName[] = ['restaurant', 'calendar_view_week', 'nutrition']

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
  // Kept local (not in useSproutineChat's return) so typing doesn't re-render
  // anything that depends on the hook's messages/status.
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

  // Submit each voice transcript once.
  useEffect(() => {
    if (voice.transcript && voice.transcript !== processedTranscriptRef.current) {
      processedTranscriptRef.current = voice.transcript
      startVoice(voice.transcript)
    }
  }, [voice.transcript, startVoice])

  const lastAssistantId = [...chat.messages].reverse().find((m) => m.role === 'assistant')?.id
  // An eating-disorder signal this session turns gentle mode on server-side;
  // honour it straight away rather than after a reload.
  const gentle = safetyMode || chat.messages.some((m) => m.metadata?.safety === 'ed_risk')
  const isEmpty = chat.messages.length === 0

  return (
    <AppColumn>
      {/* Header: Rosie + sound toggle */}
      <header className="flex shrink-0 items-center gap-2.5 border-b border-sproutine-border py-3 pr-3 pl-5">
        <RosieAvatar />
        <span className="flex flex-1 flex-col leading-tight">
          <span className="text-base font-semibold text-sproutine-text">{t.chat.rosieName}</span>
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
          className={`flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-4 ${isEmpty ? 'justify-end' : ''}`}
          aria-live="polite"
        >
          {isEmpty && (
            <>
              <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-2 text-center">
                <Image
                  src="/icons/sproutine.png"
                  alt=""
                  width={140}
                  height={140}
                  priority
                  className="-mb-4"
                />
                <h1 className="font-display text-[26px] leading-tight text-sproutine-text">
                  {t.chat.emptyTitle}
                </h1>
                <p className="max-w-[290px] text-[15px] leading-normal text-sproutine-text-secondary">
                  {t.chat.emptyBody}
                </p>
              </div>
              <motion.div
                className="flex flex-col items-start gap-2"
                initial="hidden"
                animate="show"
                variants={staggerListVariants}
              >
                {t.chat.suggestions.map((suggestion, i) => (
                  <motion.button
                    key={suggestion}
                    type="button"
                    variants={staggerItemVariants}
                    onClick={() => sendText(suggestion)}
                    className="flex min-h-11 items-center gap-2 rounded-full border border-sproutine-border-strong bg-sproutine-card px-4 text-[15px] font-medium text-sproutine-text hover:bg-sproutine-surface"
                  >
                    <Icon
                      name={SUGGESTION_ICONS[i] ?? 'restaurant'}
                      size={18}
                      className="text-sproutine-accent"
                    />
                    {suggestion}
                  </motion.button>
                ))}
              </motion.div>
            </>
          )}

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

            const mealProposal = message.role === 'assistant' ? mealProposalOf(message) : null
            if (mealProposal) {
              return (
                <div key={message.id} className="flex flex-col gap-2">
                  <ChatBubble
                    role="assistant"
                    content={clean}
                    timestamp={message.metadata?.createdAt}
                    speaking={chat.isSpeaking && message.id === lastAssistantId}
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
                  // Feedback needs the server-signed token; reloaded history has none.
                  traceId={message.metadata?.feedbackToken ? message.metadata.traceId : undefined}
                  reaction={reactions[message.id] ?? null}
                  onReact={(tid, score) =>
                    handleReact(tid, message.metadata?.feedbackToken ?? '', score, message.id)
                  }
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

          {/* In-progress voice input, shown as a pending user bubble */}
          {status === 'recording' && (
            <div className="self-end rounded-[20px] rounded-br-md border-[1.5px] border-dashed border-sproutine-border-strong px-3.5 py-2.5 text-[15px] text-sproutine-text-secondary">
              {t.chat.listening}
            </div>
          )}
          {status === 'transcribing' && (
            <div className="flex items-center gap-1 self-end rounded-[20px] rounded-br-md bg-sproutine-accent-soft px-3.5 py-2.5 text-[13px] text-sproutine-text-secondary">
              <Icon name="graphic_eq" size={16} />
              {t.chat.transcribing}
            </div>
          )}

          <AnimatePresence>
            {chat.isLoading && (
              <motion.div
                key="typing"
                className="flex items-center gap-2.5 self-start"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                role="status"
              >
                <span className="flex gap-[5px] rounded-[20px] rounded-bl-md border border-sproutine-border bg-sproutine-card px-4 py-3.5">
                  <span className="h-2 w-2 rounded-full bg-sproutine-muted opacity-45 motion-safe:animate-pulse" />
                  <span className="h-2 w-2 rounded-full bg-sproutine-muted opacity-70 motion-safe:animate-pulse [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-sproutine-muted motion-safe:animate-pulse [animation-delay:300ms]" />
                </span>
                <span className="text-[13px] text-sproutine-muted">{t.chat.typing}</span>
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
          {/* Errors on a user message show inline as "Not sent"; this covers the rest. */}
          {chat.error && chat.messages.at(-1)?.role !== 'user' && (
            <p role="alert" className="text-center text-sm text-sproutine-red">
              {t.chat.anErrorOccurred}
            </p>
          )}

          <div ref={messagesEndRef} />
        </main>
      </ErrorBoundary>

      <VoiceDock
        status={status}
        onStart={voice.startRecording}
        onStop={voice.stopRecording}
        onStopSpeaking={chat.cancelSpeech}
      />

      {status !== 'recording' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const text = input.trim()
            if (!text) return
            setInput('')
            sendText(text)
          }}
          className={`flex shrink-0 gap-2 px-4 pb-3 ${status === 'transcribing' ? 'opacity-60' : ''}`}
        >
          <label htmlFor="chat-input" className="sr-only">
            {t.chat.typePlaceholder}
          </label>
          <input
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.chat.typePlaceholder}
            autoComplete="off"
            className="field h-12 flex-1 text-[15px]"
          />
          <button
            type="submit"
            disabled={chat.isLoading || !input.trim()}
            aria-label={t.chat.send}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sproutine-accent text-sproutine-bg hover:bg-sproutine-accent-hover disabled:bg-sproutine-surface disabled:text-sproutine-muted"
          >
            <Icon name="arrow_upward" size={22} />
          </button>
        </form>
      )}

      <BottomNav active="chat" />
    </AppColumn>
  )
}
