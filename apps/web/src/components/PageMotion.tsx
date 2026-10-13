'use client'

import { motion } from 'framer-motion'
import { useSyncExternalStore } from 'react'
import { pageEnterVariants } from '@/lib/motion'

/**
 * Tracks the user's `prefers-reduced-motion` setting so the infinite
 * entrance and loop animations can be disabled for users who've
 * requested reduced motion. These are framer-motion `animate` props (not
 * CSS), so a JS matchMedia check is used instead of a media-query guard.
 */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false
  )
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
