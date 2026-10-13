'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { useRef, useEffect, useCallback, useState } from 'react'
import { useTextToSpeech, type SpeechTone } from './useTextToSpeech'
import { supabase } from '@/lib/supabase'

// Metadata the chat route attaches to each assistant message (see chat/route.ts).
export type ChatMetadata = {
  traceId?: string
  speechTone?: SpeechTone
  proactive?: boolean
  createdAt?: string
}

export type TruffleUIMessage = UIMessage<ChatMetadata>

/** Concatenate the text parts of a UI message (v5 messages have no `content`). */
export function messageText(m: TruffleUIMessage): string {
  return m.parts
    .filter((p): p is { type: 'text'; text: string; state?: 'streaming' | 'done' } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

export function useFinancialChat(
  userId: string,
  initialMessages: TruffleUIMessage[],
  currency: string = 'EUR',
  locale: string = 'en'
) {
  const { speak, isSpeaking, cancel } = useTextToSpeech()
  const lastAssistantMessageRef = useRef<string>('')

  const isMutedRef = useRef(false)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('truffle_voice_muted') === 'true'
    isMutedRef.current = stored
    setIsMuted(stored)
  }, [])

  const toggleMute = useCallback(() => {
    const next = !isMutedRef.current
    isMutedRef.current = next
    setIsMuted(next)
    if (next) cancel()
    localStorage.setItem('truffle_voice_muted', String(next))
  }, [cancel])

  const chat = useChat<TruffleUIMessage>({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { userId, currency, locale },
    }),
    onError: (error) => {
      console.error('[useFinancialChat] stream error:', error, error?.message, error?.cause)
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

      try {
        await supabase.from('chat_messages').insert({
          user_id: userId,
          role: message.role,
          content: text,
        })
      } catch (e) {
        console.warn('Failed to save chat message:', e)
      }
    },
  })
  const { sendMessage } = chat

  const saveUserMessage = useCallback(
    async (content: string) => {
      try {
        await supabase.from('chat_messages').insert({ user_id: userId, role: 'user', content })
      } catch (e) {
        console.warn('Failed to save user message:', e)
      }
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
