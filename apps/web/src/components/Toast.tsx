'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon, type IconName } from './Icon'

interface ToastProps {
  message: string
  icon?: IconName
  duration?: number
  onDone?: () => void
}

export function Toast({ message, icon, duration = 2500, onDone }: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onDone?.()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onDone])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="pointer-events-none fixed inset-x-0 bottom-24 z-50 mx-auto flex max-w-lg justify-center px-5"
        >
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-sproutine-text px-4 py-2.5 shadow-soft">
            {icon && <Icon name={icon} size={18} className="text-sproutine-bg" />}
            <span className="text-sm font-semibold text-sproutine-bg">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Global toast state for imperative calls
let showToastFn: ((message: string, icon?: IconName) => void) | null = null

export function registerToast(fn: typeof showToastFn) {
  showToastFn = fn
}

export function toast(message: string, icon?: IconName) {
  showToastFn?.(message, icon)
}
