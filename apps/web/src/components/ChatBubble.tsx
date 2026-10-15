'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { Icon } from './Icon'
import { useLanguage } from '@/contexts/LanguageContext'

export interface ChatSource {
  id: string
  source: string
}

interface ChatBubbleProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  /** Rosie is reading this reply aloud right now. */
  speaking?: boolean
  /** The user's message never reached the server. */
  failed?: boolean
  traceId?: string
  reaction?: 1 | -1 | null
  onReact?: (traceId: string, score: 1 | -1) => void
  /** Knowledge sources cited in this answer. */
  sources?: ChatSource[]
}

export const ChatBubble = memo(function ChatBubble({
  role,
  content,
  timestamp,
  speaking,
  failed,
  traceId,
  reaction,
  onReact,
  sources,
}: ChatBubbleProps) {
  const { t } = useLanguage()
  const isUser = role === 'user'
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  const bubbleClass = isUser
    ? failed
      ? 'rounded-[20px] rounded-br-md border-[1.5px] border-dashed border-sproutine-red bg-sproutine-card text-sproutine-text'
      : 'rounded-[20px] rounded-br-md bg-sproutine-accent text-sproutine-bg'
    : speaking
      ? 'rounded-[20px] rounded-bl-md border-2 border-sproutine-accent bg-sproutine-card text-sproutine-text'
      : 'rounded-[20px] rounded-bl-md border border-sproutine-border bg-sproutine-card text-sproutine-text'

  return (
    <motion.div
      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
    >
      <div className={`max-w-[82%] px-3.5 py-2.5 text-[15px] leading-[1.45] ${bubbleClass}`}>
        {speaking && (
          <span className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-sproutine-accent">
            <Icon name="graphic_eq" size={16} />
            {t.chat.speaking}
          </span>
        )}
        <p className="whitespace-pre-wrap break-words">{content}</p>
        {!isUser && sources && sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[...new Map(sources.map((s) => [s.source, s])).values()].map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 rounded-full bg-sproutine-accent-soft px-2.5 py-0.5 text-[11px] font-semibold text-sproutine-accent"
              >
                <Icon name="nutrition" size={12} />
                {s.source}
              </span>
            ))}
          </div>
        )}
        {time && !failed && (
          <p className={`mt-1 text-xs ${isUser ? 'text-sproutine-bg/75' : 'text-sproutine-muted'}`}>
            {time}
          </p>
        )}
      </div>

      {!isUser && traceId && onReact && (
        <div className="-mt-0.5 -ml-1 flex items-center">
          <button
            type="button"
            onClick={() => !reaction && onReact(traceId, 1)}
            disabled={!!reaction}
            aria-label={t.chat.helpful}
            aria-pressed={reaction === 1}
            className={`flex h-11 items-center gap-1 rounded-full px-2.5 text-[13px] font-semibold disabled:cursor-default ${
              reaction === 1
                ? 'text-sproutine-accent'
                : 'text-sproutine-muted hover:text-sproutine-text'
            }`}
          >
            <Icon name="thumb_up" filled={reaction === 1} size={18} />
            {reaction === 1 && t.chat.thanks}
          </button>
          {reaction !== 1 && (
            <button
              type="button"
              onClick={() => !reaction && onReact(traceId, -1)}
              disabled={!!reaction}
              aria-label={t.chat.notHelpful}
              aria-pressed={reaction === -1}
              className={`flex h-11 w-11 items-center justify-center rounded-full disabled:cursor-default ${
                reaction === -1
                  ? 'text-sproutine-accent'
                  : 'text-sproutine-muted hover:text-sproutine-text'
              }`}
            >
              <Icon name="thumb_down" filled={reaction === -1} size={18} />
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
})
