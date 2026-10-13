'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { useRef, useEffect, useCallback } from 'react'
import { usePersistedPreference } from './usePersistedPreference'
import { useTextToSpeech, type SpeechTone } from './useTextToSpeech'
import { supabase } from '@/lib/supabase'

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
}

export type SproutineUIMessage = UIMessage<ChatMetadata>

/** Concatenate the text parts of a UI message (v5 messages have no `content`). */
export function messageText(m: SproutineUIMessage): string {
  return m.parts
    .filter((p): p is { type: 'text'; text: string; state?: 'streaming' | 'done' } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

export function useSproutineChat(
  userId: string,
  initialMessages: SproutineUIMessage[],
  locale: string = 'en'
) {
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
    }),
    onError: (error) => {
      console.error('[useSproutineChat] stream error:', error, error?.message, error?.cause)
    },
    onFinish: async ({ message, isAbort, isError }) => {
      if (message.role !== 'assistant') return
      const text = messageText(message)

      if (text && text !== lastAssistantMessageRef.current) {
        lastAssistantMessageRef.current = text
        if (!isMutedRef.current) speak(text, { tone: message.metadata?.speechTone })
      }

      // Skip saving empty (tool-only) responses and aborted/errored streams.
      // Card components persist their own acknowledgement messages to Supabase.
      if (isAbort || isError || !text.trim()) return

      // supabase-js reports failures in `error`; it only throws on network faults.
      const { error } = await supabase.from('chat_messages').insert({
        user_id: userId,
        role: message.role,
        content: text,
        // Lets a reload re-render the safety card instead of a plain bubble.
        safety: message.metadata?.safety ?? null,
      })
      if (error) console.warn('Failed to save chat message:', error.message)
    },
  })
  const { sendMessage } = chat

  const saveUserMessage = useCallback(
    async (content: string) => {
      const { error } = await supabase
        .from('chat_messages')
        .insert({ user_id: userId, role: 'user', content })
      if (error) console.warn('Failed to save user message:', error.message)
    },
    [userId]
  )

  // Stable identity (userId/chat.sendMessage rarely change) so consumers can
  // safely depend on it without re-running effects on every render.
  const sendText = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      // Persist in the background — don't block the send on a DB round-trip.
      void saveUserMessage(trimmed)
      // Stamp the user message locally so the bubble shows a time immediately —
      // otherwise the timestamp only appears after a refresh reloads it from the DB
      // (the server only attaches `createdAt` to assistant messages).
      sendMessage({ text: trimmed, metadata: { createdAt: new Date().toISOString() } })
    },
    [saveUserMessage, sendMessage]
  )

  const startVoice = sendText

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
