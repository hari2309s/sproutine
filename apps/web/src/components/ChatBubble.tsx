'use client'

import Image from 'next/image'
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

  /* ── User bubble ── */
  if (isUser) {
    return (
      <motion.div
        className="flex flex-col items-end"
        initial={{ opacity: 0, y: 10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
      >
        <div
          className={`max-w-[80%] rounded-[22px] rounded-br-[6px] px-[15px] py-[11px] text-[15px] leading-[1.45] ${
            failed
              ? 'border-[1.5px] border-dashed border-sproutine-red bg-sproutine-card text-sproutine-text'
              : 'bg-sproutine-accent text-sproutine-bg'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{content}</p>
        </div>
      </motion.div>
    )
  }

  /* ── Assistant: full-width "Kitchen Table" style ── */
  return (
    <motion.div
      className="flex flex-col items-start gap-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
    >
      {/* Avatar + name line */}
      <span className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sproutine-accent-soft">
          <Image
            src="/icons/sproutine.png"
            alt=""
            width={42}
            height={42}
            className="object-cover"
          />
        </span>
        <span className="text-[13px] font-semibold text-sproutine-text-secondary">
          {t.chat.rosieName}
        </span>
        {speaking && (
          <span className="flex items-center gap-1 text-[13px] font-semibold text-sproutine-accent">
            <Icon name="graphic_eq" size={16} />
            {t.chat.speaking}
          </span>
        )}
      </span>

      {/* Message text */}
      <p className="whitespace-pre-wrap break-words text-[16px] leading-[1.55]">{content}</p>

      {/* Sources + feedback in one row */}
      <div className="flex items-center gap-1">
        {sources && sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {[...new Map(sources.map((s) => [s.source, s])).values()].map((s) => (
              <span
                key={s.id}
                className="inline-flex h-8 items-center gap-[5px] rounded-full bg-sproutine-accent-soft px-3 text-[13px] font-semibold"
              >
                <Icon name="nutrition" size={16} className="text-sproutine-accent" />
                {s.source}
              </span>
            ))}
          </div>
        )}
        <span className="flex-1" />
        {traceId && onReact && (
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => !reaction && onReact(traceId, 1)}
              disabled={!!reaction}
              aria-label={t.chat.helpful}
              aria-pressed={reaction === 1}
              className={`flex h-11 w-10 items-center justify-center disabled:cursor-default ${
                reaction === 1
                  ? 'text-sproutine-accent'
                  : 'text-sproutine-muted hover:text-sproutine-text'
              }`}
            >
              <Icon name="thumb_up" filled={reaction === 1} size={18} />
            </button>
            {reaction !== 1 && (
              <button
                type="button"
                onClick={() => !reaction && onReact(traceId, -1)}
                disabled={!!reaction}
                aria-label={t.chat.notHelpful}
                aria-pressed={reaction === -1}
                className={`flex h-11 w-10 items-center justify-center disabled:cursor-default ${
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
      </div>

      {time && (
        <p className="-mt-1 text-xs text-sproutine-muted">{time}</p>
      )}
    </motion.div>
  )
})
