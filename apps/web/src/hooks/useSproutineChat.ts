'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { useRef, useEffect, useCallback } from 'react'
import { usePersistedPreference } from './usePersistedPreference'
import { useTextToSpeech, type SpeechTone } from './useTextToSpeech'
import type { MealLogProposal } from '@sproutine/food/client'

// Metadata the chat route attaches to each assistant message (see chat/route.ts).
export type ChatMetadata = {
  traceId?: string
  /** Server-signed proof that traceId belongs to this user (for feedback). */
  feedbackToken?: string
  speechTone?: SpeechTone
  proactive?: boolean
  createdAt?: string
  /** Set on templated safety replies; the UI shows a safety card. */
  safety?: 'crisis' | 'ed_risk'
  /** On user messages that came from the mic (meal logs record the source). */
  viaVoice?: boolean
}

export type ChatDataParts = {
  /** A meal to confirm; rendered as a MealLogCard. */
  'meal-log': MealLogProposal
}

export type SproutineUIMessage = UIMessage<ChatMetadata, ChatDataParts>

export function mealProposalOf(m: SproutineUIMessage): MealLogProposal | null {
  for (const p of m.parts) if (p.type === 'data-meal-log') return p.data
  return null
}

/** Concatenate the text parts of a UI message (v5 messages have no `content`). */
export function messageText(m: SproutineUIMessage): string {
  return m.parts
    .filter(
      (p): p is { type: 'text'; text: string; state?: 'streaming' | 'done' } => p.type === 'text'
    )
    .map((p) => p.text)
    .join('')
}

export function useSproutineChat(initialMessages: SproutineUIMessage[], locale: string = 'en') {
  const { speak, isSpeaking, cancel } = useTextToSpeech()
  const lastAssistantMessageRef = useRef<string>('')

  const [muted, setMuted] = usePersistedPreference<'true' | 'false'>({
    storageKey: 'sproutine_voice_muted',
    defaultValue: 'false',
    normalize: (raw) => (raw === 'true' || raw === 'false' ? raw : null),
  })
  const isMuted = muted === 'true'
  // onFinish reads the latest value without re-creating the chat.
  const isMutedRef = useRef(isMuted)
  useEffect(() => {
    isMutedRef.current = isMuted
  }, [isMuted])

  const toggleMute = useCallback(() => {
    const next = !isMutedRef.current
    isMutedRef.current = next
    setMuted(next ? 'true' : 'false')
    if (next) cancel()
  }, [cancel, setMuted])

  const chat = useChat<SproutineUIMessage>({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { locale },
      // The server keeps the history and stores every turn; it only needs
      // the new message.
      prepareSendMessagesRequest: ({ messages, body }) => ({
        body: { ...body, messages: messages.slice(-1) },
      }),
    }),
    onError: (error) => {
      console.error('[useSproutineChat] stream error:', error, error?.message, error?.cause)
    },
    // The chat route stores both sides of the conversation; the client only
    // reads the reply aloud.
    onFinish: ({ message }) => {
      if (message.role !== 'assistant') return
      const text = messageText(message)
      if (text && text !== lastAssistantMessageRef.current) {
        lastAssistantMessageRef.current = text
        if (!isMutedRef.current) speak(text, { tone: message.metadata?.speechTone })
      }
    },
  })
  const { sendMessage } = chat

  // Stable identity (chat.sendMessage rarely changes) so consumers can
  // safely depend on it without re-running effects on every render.
  const sendText = useCallback(
    (text: string, opts: { viaVoice?: boolean } = {}) => {
      const trimmed = text.trim()
      if (!trimmed) return
      // Stamp the user message locally so the bubble shows a time immediately —
      // otherwise the timestamp only appears after a refresh reloads it from the DB
      // (the server only attaches `createdAt` to assistant messages).
      sendMessage({
        text: trimmed,
        metadata: {
          createdAt: new Date().toISOString(),
          ...(opts.viaVoice ? { viaVoice: true } : {}),
        },
      })
    },
    [sendMessage]
  )

  const startVoice = useCallback((text: string) => sendText(text, { viaVoice: true }), [sendText])

  const isLoading = chat.status === 'submitted' || chat.status === 'streaming'

  return {
    ...chat,
    messageText,
    sendText,
    isLoading,
    isSpeaking,
    cancelSpeech: cancel,
    startVoice,
    isMuted,
    toggleMute,
  }
}
