'use client'

import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { staggerItemVariants, staggerListVariants, truffleEase } from '@/lib/motion'
import { isToolUIPart, getToolName } from 'ai'
import { useFinancialChat, type TruffleUIMessage } from '@/hooks/useFinancialChat'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { ChatBubble } from './ChatBubble'
import { GoalProposalCard } from './GoalProposalCard'
import { TransactionProposalCard } from './TransactionProposalCard'
import { CATEGORY_EMOJI } from '@/lib/categories'
import { HabitProposalCard } from './HabitProposalCard'
import type { TransactionCategory } from '@truffle/types'
import { VoiceButton, type VoiceButtonStatus } from './VoiceButton'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { PageEnter, TypingDots, usePrefersReducedMotion } from './PageMotion'
import { ErrorBoundary } from './ErrorBoundary'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrency } from '@/contexts/CurrencyContext'

interface ChatPageProps {
  userId: string
  name: string
  initialMessages: TruffleUIMessage[]
}

interface ProposalRenderCtx {
  t: ReturnType<typeof useLanguage>['t']
  formatAmount: (amount: number) => string
}

interface ProposalToolEntry<Args> {
  PendingCard: React.ComponentType<{
    proposal: Args
    userId: string
    onResult: (confirmed: boolean) => void
  }>
  renderConfirmed: (args: Args, toolCallId: string, ctx: ProposalRenderCtx) => React.ReactNode
}

/** One entry per `propose*` tool the model can call — keeps adding a new tool
 * to a data-driven lookup instead of another copy-pasted branch below. */
const PROPOSAL_TOOLS: Record<string, ProposalToolEntry<any>> = {
  proposeGoal: {
    PendingCard: GoalProposalCard,
    renderConfirmed: (args, toolCallId, { t }) => (
      <div key={toolCallId} className="flex justify-start mb-3">
        <div className="max-w-[85%] bg-truffle-card border border-truffle-border rounded-2xl rounded-bl-sm px-4 py-3">
          <p className="text-sm text-truffle-text">
            {t.proposals.goal.addedToGoals(args.emoji, args.name)}
          </p>
        </div>
      </div>
    ),
  },
  proposeTransaction: {
    PendingCard: TransactionProposalCard,
    renderConfirmed: (args, toolCallId, { formatAmount }) => {
      const isExpense = args.amount < 0
      const formattedAmount = `${isExpense ? '-' : '+'}${formatAmount(args.amount)}`
      return (
        <div key={toolCallId} className="flex justify-start mb-3">
          <div className="max-w-[85%] bg-truffle-card border border-truffle-border rounded-2xl rounded-bl-sm px-4 py-3">
            <p className="text-sm text-truffle-text">
              {CATEGORY_EMOJI[args.category as TransactionCategory] ?? '📝'}{' '}
              <span className="font-medium">{args.description}</span> logged —{' '}
              <span className={isExpense ? 'text-red-400' : 'text-green-400'}>
                {formattedAmount}
              </span>
            </p>
          </div>
        </div>
      )
    },
  },
  proposeHabit: {
    PendingCard: HabitProposalCard,
    renderConfirmed: (args, toolCallId, { t, formatAmount }) => {
      const periodLabel =
        args.frequency === 'weekly' ? t.savingsHabits.periodWeek : t.savingsHabits.periodMonth
      return (
        <div key={toolCallId} className="flex justify-start mb-3">
          <div className="max-w-[85%] bg-truffle-card border border-truffle-green/40 rounded-2xl rounded-bl-sm px-4 py-3">
            <p className="text-sm text-truffle-text">
              {args.emoji} <span className="font-medium">{args.name}</span>{' '}
              <span className="text-truffle-green">
                {t.proposals.habit.startSaving.toLowerCase()}
              </span>{' '}
              — {formatAmount(Number(args.amount))}/{periodLabel}.{' '}
              {t.proposals.habit.logEachPeriod(periodLabel)}
            </p>
          </div>
        </div>
      )
    },
  },
}

export function ChatPage({ userId, name, initialMessages }: ChatPageProps) {
  const { t, locale } = useLanguage()
  const { formatAmount, currency } = useCurrency()
  const chat = useFinancialChat(userId, initialMessages, currency, locale)
  const voice = useVoiceRecorder(userId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const processedTranscriptRef = useRef<string | null>(null)
  const reactedRef = useRef<Set<string>>(new Set())
  const [reactions, setReactions] = useState<Record<string, 1 | -1>>({})
  // Kept local (not in useFinancialChat's return) so typing doesn't re-render
  // anything that depends on the hook's messages/status.
  const [input, setInput] = useState('')
  const sendText = chat.sendText

  const reducedMotion = usePrefersReducedMotion()

  const voiceButtonStatus: VoiceButtonStatus = voice.isRecording
    ? 'recording'
    : voice.isTranscribing
      ? 'transcribing'
      : chat.isSpeaking
        ? 'speaking'
        : 'idle'

  const handleReact = useCallback(async (traceId: string, score: 1 | -1, messageId: string) => {
    if (reactedRef.current.has(messageId)) return
    reactedRef.current.add(messageId)
    setReactions((prev) => ({ ...prev, [messageId]: score }))
    fetch('/api/chat/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traceId, score }),
    }).catch((e) => console.warn('Failed to send feedback:', e))
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages])

  // Submit voice transcript once — depends only on the transcript text and the
  // stable sendText callback, not the whole chat object (which is a new
  // reference every render), so this doesn't re-run on unrelated re-renders.
  useEffect(() => {
    if (voice.transcript && voice.transcript !== processedTranscriptRef.current) {
      processedTranscriptRef.current = voice.transcript
      sendText(voice.transcript)
    }
  }, [voice.transcript, sendText])

  return (
    <PageEnter className="flex-1 w-full bg-truffle-bg flex flex-col max-w-lg mx-auto overflow-hidden min-h-0">
      <TopBar showControls userId={userId}>
        <div className="ml-auto flex items-center gap-3">
          {chat.isSpeaking && (
            <button
              onClick={chat.cancelSpeech}
              className="text-xs text-truffle-amber hover:text-truffle-amber-light"
            >
              {t.chat.stop}
            </button>
          )}
          <button
            onClick={chat.toggleMute}
            aria-label={chat.isMuted ? t.chat.unmute : t.chat.mute}
            className="text-truffle-muted hover:text-truffle-text transition-colors"
          >
            {chat.isMuted ? <SpeakerMutedIcon /> : <SpeakerIcon />}
          </button>
        </div>
      </TopBar>

      {/* Messages */}
      <ErrorBoundary>
        <main className="flex-1 overflow-y-auto px-4 py-4 pb-[calc(18rem_+_env(safe-area-inset-bottom))]">
          {chat.messages.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <motion.p
                className="text-truffle-muted text-sm"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, ease: truffleEase }}
              >
                {t.chat.holdButton}
              </motion.p>
              <motion.div
                className="flex flex-wrap gap-2 justify-center mt-6"
                initial="hidden"
                animate="show"
                variants={staggerListVariants}
              >
                {t.chat.suggestions.map((suggestion) => (
                  <motion.button
                    key={suggestion}
                    type="button"
                    variants={staggerItemVariants}
                    onClick={() => chat.sendText(suggestion)}
                    className="text-xs bg-truffle-surface border border-truffle-border rounded-full px-3 py-1.5 text-truffle-text-secondary hover:border-truffle-amber hover:text-truffle-text transition-all"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </motion.div>
            </div>
          )}

          {chat.messages.map((message, idx) => {
            const isLastMessage = idx === chat.messages.length - 1
            const showError = isLastMessage && !!chat.error && message.role === 'user'

            const toolParts = message.parts.filter(isToolUIPart)

            // Resolve a tool call locally without hitting the API again.
            // addToolResult() re-submits to /api/chat — a visible loader flash
            // and a risk of duplicate tool calls.
            const resolveTool = (toolCallId: string, result: { confirmed: boolean }) => {
              chat.setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== message.id) return m
                  return {
                    ...m,
                    parts: m.parts.map((p) =>
                      isToolUIPart(p) && p.toolCallId === toolCallId
                        ? {
                            type: p.type,
                            toolCallId: p.toolCallId,
                            state: 'output-available' as const,
                            input: p.input,
                            output: result,
                          }
                        : p
                    ),
                  } as TruffleUIMessage
                })
              )
            }

            const isPending = (state: string) =>
              state === 'input-available' || state === 'input-streaming'

            return (
              <div key={message.id}>
                {/* Proposal cards from tool parts */}
                {toolParts.map((part) => {
                  const toolName = getToolName(part) as string
                  const renderer = PROPOSAL_TOOLS[toolName]
                  if (!renderer) return null

                  const confirmed =
                    part.state === 'output-available' &&
                    (part.output as { confirmed?: boolean } | undefined)?.confirmed

                  if (isPending(part.state)) {
                    const PendingCard = renderer.PendingCard
                    return (
                      <PendingCard
                        key={part.toolCallId}
                        proposal={part.input}
                        userId={userId}
                        onResult={(c) => resolveTool(part.toolCallId, { confirmed: c })}
                      />
                    )
                  }
                  if (confirmed) {
                    return renderer.renderConfirmed(part.input, part.toolCallId, {
                      t,
                      formatAmount,
                    })
                  }
                  return null
                })}
                {/* Strip leaked tool-call XML (models occasionally emit
                  <function=...>...</function> as plain text) then render text. */}
                {(() => {
                  // If a tool call is still pending, suppress any text the model
                  // generated alongside it — the card is the intended UI.
                  if (toolParts.some((p) => isPending(p.state))) return null

                  const clean = chat
                    .messageText(message)
                    .replace(/<function=[^>]*>[\s\S]*?<\/function>/g, '')
                    .trim()
                  const traceId = message.metadata?.traceId
                  return clean ? (
                    <ChatBubble
                      role={message.role === 'assistant' ? 'assistant' : 'user'}
                      content={clean}
                      name={name}
                      timestamp={message.metadata?.createdAt}
                      traceId={traceId}
                      reaction={reactions[message.id] ?? null}
                      onReact={(tid, score) => handleReact(tid, score, message.id)}
                    />
                  ) : null
                })()}
                {/* Inline error + resend on the last user message */}
                {showError && (
                  <div className="flex justify-end items-center gap-2 mb-3 pr-1">
                    <span className="text-xs text-truffle-red">{t.chat.failedToSend}</span>
                    <button
                      onClick={() => chat.regenerate()}
                      className="text-xs text-truffle-amber hover:text-truffle-amber-light transition-colors"
                    >
                      {t.chat.resend}
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          <AnimatePresence>
            {chat.isLoading && (
              <motion.div
                key="ai-thinking"
                className="flex justify-start mb-3 items-end gap-2"
                initial={{ opacity: 0, y: 10, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.94, transition: { duration: 0.18 } }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <motion.div
                  className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0"
                  animate={reducedMotion ? { opacity: 1 } : { opacity: [0.55, 1, 0.55] }}
                  transition={
                    reducedMotion
                      ? undefined
                      : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
                  }
                >
                  <Image src="/icons/truffle.png" alt="Truffle" width={24} height={24} />
                </motion.div>
                <motion.div
                  className="bg-truffle-card border border-truffle-border rounded-2xl rounded-bl-sm px-4 py-3"
                  animate={
                    reducedMotion
                      ? undefined
                      : {
                          boxShadow: [
                            '0 0 0 0 rgba(232,168,78,0)',
                            '0 0 14px 3px rgba(232,168,78,0.18)',
                            '0 0 0 0 rgba(232,168,78,0)',
                          ],
                        }
                  }
                  transition={
                    reducedMotion
                      ? undefined
                      : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
                  }
                >
                  <TypingDots />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {voice.error && (
            <div className="text-center text-xs text-truffle-red py-2">{voice.error}</div>
          )}

          {chat.error && (
            <div className="text-center text-xs text-truffle-red py-2">
              {chat.error.message || t.chat.anErrorOccurred}
              {process.env.NODE_ENV === 'development' && (
                <pre className="text-left text-[10px] mt-1 opacity-70 whitespace-pre-wrap">
                  {String(chat.error.cause ?? chat.error)}
                </pre>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>
      </ErrorBoundary>

      {/* Input area */}
      <div className="fixed bottom-14 left-1/2 -translate-x-1/2 w-full max-w-lg bg-truffle-bg/95 backdrop-blur-sm border-t border-truffle-border px-4 py-4">
        <div className="flex flex-col items-center gap-4">
          <VoiceButton
            status={voiceButtonStatus}
            onStart={voice.startRecording}
            onStop={voice.stopRecording}
          />

          <form
            id="chat-form"
            onSubmit={(e) => {
              e.preventDefault()
              const text = input.trim()
              if (!text) return
              setInput('')
              sendText(text)
            }}
            className="w-full flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.chat.typePlaceholder}
              className="flex-1 bg-truffle-surface border border-truffle-border rounded-xl px-4 py-3 text-sm text-truffle-text placeholder-truffle-muted focus:outline-none focus:border-truffle-amber"
            />
            <button
              type="submit"
              disabled={chat.isLoading || !input.trim()}
              aria-label={t.chat.send}
              className="btn-primary px-4 disabled:opacity-40"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      </div>

      <BottomNav active="chat" />
    </PageEnter>
  )
}

function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-4 h-4"
    >
      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
  )
}

function SpeakerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-4 h-4"
    >
      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
      <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.061z" />
    </svg>
  )
}

function SpeakerMutedIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-4 h-4"
    >
      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 001.06 1.06L19.5 13.06l1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06L19.5 10.94l-1.72-1.72z" />
    </svg>
  )
}
