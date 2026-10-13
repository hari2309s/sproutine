'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface ChatBubbleProps {
  role: 'user' | 'assistant'
  content: string
  name?: string
  timestamp?: string
  traceId?: string
  reaction?: 1 | -1 | null
  onReact?: (traceId: string, score: 1 | -1) => void
}

export const ChatBubble = memo(function ChatBubble({
  role,
  content,
  name,
  timestamp,
  traceId,
  reaction,
  onReact,
}: ChatBubbleProps) {
  const isUser = role === 'user'

  return (
    <motion.div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
      initial={{ opacity: 0, y: 10, scale: 0.93, x: isUser ? 12 : -12 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-truffle-amber text-truffle-bg rounded-br-sm'
            : 'bg-truffle-card border border-truffle-border text-truffle-text rounded-bl-sm'
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center">
              <Image src="/icons/truffle.png" alt="Truffle" width={16} height={16} />
            </div>
            <span className="text-xs font-medium text-truffle-amber">Truffle</span>
          </div>
        )}
        {isUser && name && (
          <div className="flex items-center justify-end mb-1.5">
            <span className="text-xs font-medium text-truffle-bg/70">{name}</span>
          </div>
        )}
        <p className={`text-sm leading-relaxed ${isUser ? 'font-medium' : ''}`}>{content}</p>
        {timestamp && (
          <p className={`text-xs mt-1 ${isUser ? 'text-truffle-bg/60' : 'text-truffle-muted'}`}>
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        {!isUser && traceId && onReact && (
          <div className="flex gap-0.5 mt-2">
            <button
              onClick={() => !reaction && onReact(traceId, 1)}
              disabled={!!reaction}
              aria-label="Helpful"
              className={`p-1 rounded-md transition-colors disabled:cursor-default ${
                reaction === 1 ? 'text-truffle-green' : 'text-truffle-muted hover:text-truffle-text'
              }`}
            >
              <ThumbUpIcon />
            </button>
            <button
              onClick={() => !reaction && onReact(traceId, -1)}
              disabled={!!reaction}
              aria-label="Not helpful"
              className={`p-1 rounded-md transition-colors disabled:cursor-default ${
                reaction === -1 ? 'text-red-400' : 'text-truffle-muted hover:text-truffle-text'
              }`}
            >
              <ThumbDownIcon />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
})

function ThumbUpIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-3.5 h-3.5"
    >
      <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zm-5.17 0a.75.75 0 00-.75-.75h-1.5a.75.75 0 000 1.5h1.5a.75.75 0 00.75-.75zM2.323 8.25H.75a.75.75 0 000 1.5h1.573a.75.75 0 000-1.5z" />
    </svg>
  )
}

function ThumbDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-3.5 h-3.5"
    >
      <path d="M15.73 5.25h1.035A7.465 7.465 0 0118 9.375a7.465 7.465 0 01-1.235 4.125h-.148c-.806 0-1.534.446-2.031 1.08a9.04 9.04 0 01-2.861 2.4c-.723.384-1.35.956-1.653 1.715a4.498 4.498 0 00-.322 1.672V21a.75.75 0 01-.75.75 2.25 2.25 0 01-2.25-2.25c0-1.152.26-2.243.723-3.218.266-.558-.107-1.282-.725-1.282H3.622c-1.026 0-1.945-.694-2.054-1.715A12.134 12.134 0 011.5 12c0-2.848.992-5.464 2.649-7.521.388-.482.987-.729 1.605-.729H9.77a4.5 4.5 0 011.423.23l3.114 1.04a4.5 4.5 0 001.423.23zM21.669 13.773c.536-1.362.831-2.845.831-4.398 0-1.22-.182-2.398-.52-3.507-.26-.85-1.084-1.368-1.973-1.368H19.1c.445.246.696.744.62 1.25-.767 4.836-3.698 8.293-7.394 9.742a.75.75 0 00.184 1.463h3.113c.842 0 1.605-.479 1.97-1.229l.051-.103a.75.75 0 011.346.656l-.052.104c-.58 1.158-1.754 1.822-3.033 1.822h-.975a.75.75 0 000 1.5h1.5c.675 0 1.199-.37 1.5-.916z" />
    </svg>
  )
}
