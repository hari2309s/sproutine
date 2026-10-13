'use client'

import { motion } from 'framer-motion'
import { useEffect, useId, useRef, useState } from 'react'

const panelTransition = {
  duration: 0.32,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
}

interface InsightsAccordionSectionProps {
  title: string
  /** Scrollable `<main>` (or any ancestor with overflow) — intersection is vs this box, not the window. */
  scrollRootRef: React.RefObject<HTMLElement | null>
  children: React.ReactNode
  defaultOpen?: boolean
  headerRight?: React.ReactNode
  /** Called when this section auto-collapses after leaving the scroll root viewport. */
  onLeaveViewport?: () => void
}

function ChevronIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-truffle-muted flex-shrink-0"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function InsightsAccordionSection({
  title,
  scrollRootRef,
  children,
  defaultOpen = true,
  headerRight,
  onLeaveViewport,
}: InsightsAccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()
  const sectionRef = useRef<HTMLElement>(null)
  const wasIntersectingRef = useRef<boolean | null>(null)
  const scrollTopAtCollapseRef = useRef<number | null>(null)
  const onLeaveRef = useRef(onLeaveViewport)
  onLeaveRef.current = onLeaveViewport

  useEffect(() => {
    const root = scrollRootRef.current
    const section = sectionRef.current
    if (!root || !section) return

    wasIntersectingRef.current = null

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        const now = entry.isIntersecting
        const prev = wasIntersectingRef.current
        if (prev === null) {
          wasIntersectingRef.current = now
          return
        }
        if (prev && !now) {
          // Section left viewport — record scroll position and auto-collapse
          scrollTopAtCollapseRef.current = root.scrollTop
          setOpen(false)
          onLeaveRef.current?.()
        } else if (!prev && now) {
          // Section re-entered viewport — only expand if the user actually scrolled
          // (scroll position changed). If another accordion collapsed and caused a
          // reflow that pushed this section back into view, scrollTop is unchanged.
          const scrollDelta = Math.abs(
            root.scrollTop - (scrollTopAtCollapseRef.current ?? root.scrollTop)
          )
          if (scrollDelta > 20) {
            setOpen(true)
          }
        }
        wasIntersectingRef.current = now
      },
      { root, threshold: 0 }
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [scrollRootRef])

  return (
    <section ref={sectionRef}>
      <div className="flex items-center gap-2 mb-3 min-w-0">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-left min-w-0 rounded-lg -ml-1 pl-1 py-0.5 hover:bg-truffle-surface/60 transition-colors"
          aria-expanded={open}
          aria-controls={panelId}
        >
          <motion.span
            className="inline-flex"
            animate={{ rotate: open ? 180 : 0 }}
            transition={panelTransition}
          >
            <ChevronIcon />
          </motion.span>
          <h2 className="text-sm font-medium text-truffle-text-secondary uppercase tracking-wide truncate">
            {title}
          </h2>
        </button>
        {headerRight ? <div className="flex-shrink-0">{headerRight}</div> : null}
      </div>
      <motion.div
        id={panelId}
        initial={false}
        animate={{
          height: open ? 'auto' : 0,
          opacity: open ? 1 : 0,
        }}
        transition={panelTransition}
        style={{ overflow: 'hidden' }}
        aria-hidden={!open}
      >
        <div className="pb-1">{children}</div>
      </motion.div>
    </section>
  )
}
