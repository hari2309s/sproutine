'use client'

import type { HTMLMotionProps } from 'framer-motion'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { pageEnterVariants } from '@/lib/motion'

/**
 * Tracks the user's `prefers-reduced-motion` setting so the infinite
 * loading/typing animations below can be disabled for users who've
 * requested reduced motion. These are framer-motion `animate` props (not
 * CSS), so a JS matchMedia check is used instead of a media-query guard.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

type PageEnterProps = {
  children: React.ReactNode
  className?: string
}

/** Fade + slight rise for full pages or major sections on first paint. */
export function PageEnter({ children, className }: PageEnterProps) {
  return (
    <motion.div
      className={className}
      initial={pageEnterVariants.initial}
      animate={pageEnterVariants.animate}
      transition={pageEnterVariants.transition}
    >
      {children}
    </motion.div>
  )
}

type SkeletonPulseProps = HTMLMotionProps<'div'>

/** Softer than CSS animate-pulse; use for loading placeholders. */
export function SkeletonPulse({ className, ...props }: SkeletonPulseProps) {
  const reducedMotion = usePrefersReducedMotion()
  return (
    <motion.div
      className={className}
      animate={reducedMotion ? { opacity: 0.6 } : { opacity: [0.42, 0.78, 0.42] }}
      transition={
        reducedMotion ? { duration: 0 } : { duration: 1.45, repeat: Infinity, ease: 'easeInOut' }
      }
      {...props}
    />
  )
}

/** App shell loading (Home auth check, chat history load, etc.) — 5-bar waveform. */
export function LoadingDots({ className }: { className?: string }) {
  const reducedMotion = usePrefersReducedMotion()
  return (
    <div className={className ?? 'flex items-center gap-1'} style={{ height: 24 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="rounded-full bg-truffle-amber"
          style={{ width: 4, height: 20, transformOrigin: 'center' }}
          animate={
            reducedMotion
              ? { scaleY: 0.6, opacity: 0.75 }
              : { scaleY: [0.2, 1, 0.5, 0.85, 0.2], opacity: [0.4, 1, 0.65, 1, 0.4] }
          }
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: 1.1, repeat: Infinity, delay: i * 0.1, ease: [0.45, 0, 0.55, 1] }
          }
        />
      ))}
    </div>
  )
}

/** Centered route loading (chat/insights while auth resolves) — pulsing orb, not a spinner. */
export function LoadingSpinner() {
  const reducedMotion = usePrefersReducedMotion()
  return (
    <div role="status" aria-label="Loading" className="flex items-center justify-center w-16 h-16">
      <motion.div
        className="w-4 h-4 rounded-full bg-truffle-amber"
        animate={
          reducedMotion
            ? { scale: 1.3, opacity: 0.85 }
            : {
                scale: [1, 2, 1],
                opacity: [0.7, 1, 0.7],
                boxShadow: [
                  '0 0 0 0 rgba(232,168,78,0)',
                  '0 0 24px 8px rgba(232,168,78,0.35)',
                  '0 0 0 0 rgba(232,168,78,0)',
                ],
              }
        }
        transition={
          reducedMotion ? { duration: 0 } : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
        }
      />
    </div>
  )
}

/** Inline typing indicator (chat) — audio waveform bars. */
export function TypingDots({ className }: { className?: string }) {
  const reducedMotion = usePrefersReducedMotion()
  return (
    <div className={className ?? 'flex items-center gap-[3px]'} style={{ height: 18 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="rounded-full bg-truffle-amber"
          style={{ width: 3, height: 16, transformOrigin: 'center' }}
          animate={
            reducedMotion
              ? { scaleY: 0.6, opacity: 0.75 }
              : { scaleY: [0.25, 1, 0.55, 0.9, 0.25], opacity: [0.45, 1, 0.7, 1, 0.45] }
          }
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: 1.0, repeat: Infinity, delay: i * 0.1, ease: [0.45, 0, 0.55, 1] }
          }
        />
      ))}
    </div>
  )
}
