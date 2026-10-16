'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { motion } from 'framer-motion'

interface BottomSheetProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * Reusable bottom sheet with overlay, drag handle, focus trap, and Escape to close.
 * Extracted from the SettingsSheet pattern.
 */
export function BottomSheet({ title, onClose, children }: BottomSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    closeRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !sheetRef.current) return
      const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const titleId = `sheet-${title.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div
      className="fixed inset-0 z-50 mx-auto flex max-w-lg flex-col justify-end"
      onClick={onClose}
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-sproutine-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[85dvh] flex-col rounded-t-[28px] bg-sproutine-bg shadow-soft"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          aria-hidden
          className="mt-2.5 h-[5px] w-10 shrink-0 self-center rounded-full bg-sproutine-border-strong"
        />
        <div className="flex shrink-0 items-center justify-between border-b border-sproutine-border py-2 pr-3 pl-5">
          <h2 id={titleId} className="font-display text-[22px] text-sproutine-text">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="icon-btn bg-sproutine-surface text-sproutine-text"
          >
            <span className="icon" style={{ fontSize: 22, width: 22, height: 22 }}>
              close
            </span>
          </button>
        </div>

        <div
          className="safe-bottom overflow-y-auto px-5 pt-4 pb-6"
          style={{ overscrollBehavior: 'contain' }}
        >
          {children}
        </div>
      </motion.div>
    </div>
  )
}
