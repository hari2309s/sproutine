'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Icon } from './Icon'
import { fetchOnThisDay, dismissOnThisDay, type OnThisDayData } from '@/lib/calendarApi'

interface OnThisDayCardProps {
  gentle: boolean
  onReplay?: (data: OnThisDayData) => void
}

function monthsLabel(n: number): string {
  if (n === 1) return '1 month ago'
  if (n < 12) return `${n} months ago`
  const years = Math.floor(n / 12)
  return years === 1 ? '1 year ago' : `${years} years ago`
}

const STORAGE_KEY = 'on-this-day-last-shown'

function wasShownThisWeek(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const lastShown = new Date(raw)
    const now = new Date()
    const diff = now.getTime() - lastShown.getTime()
    return diff < 7 * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function markShown() {
  try {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString())
  } catch {
    /* noop */
  }
}

export function OnThisDayCard({ gentle, onReplay }: OnThisDayCardProps) {
  const [data, setData] = useState<OnThisDayData | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [visible, setVisible] = useState(false)

  const load = useCallback(async () => {
    if (gentle || wasShownThisWeek()) return
    try {
      const result = await fetchOnThisDay()
      if (result) {
        setData(result)
        setVisible(true)
        markShown()
      }
    } catch {
      /* silent */
    }
  }, [gentle])

  useEffect(() => { void load() }, [load])

  const x = useMotionValue(0)
  const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0])

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    if (Math.abs(info.offset.x) > 100 || Math.abs(info.velocity.x) > 500) {
      handleDismiss()
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    setVisible(false)
    if (data) void dismissOnThisDay('dismissed', data.mealLogId)
  }

  const handleReplay = () => {
    if (!data) return
    setVisible(false)
    void dismissOnThisDay('logged', data.mealLogId)
    onReplay?.(data)
  }

  if (!data || dismissed || !visible) return null

  const items = data.items.map((i) => i.name).join(', ')
  const slotLabel = data.slot.charAt(0).toUpperCase() + data.slot.slice(1)

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          style={{ x, opacity }}
          onDragEnd={handleDragEnd}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ x: 200, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="card relative overflow-hidden px-4 py-4 shadow-soft"
        >
          {/* Dismiss X */}
          <button
            type="button"
            onClick={handleDismiss}
            className="icon-btn absolute top-2 right-2 h-7 w-7"
            aria-label="Dismiss"
          >
            <Icon name="close" size={16} />
          </button>

          <div className="flex items-start gap-3">
            <Image
              src="/icons/sproutine.png"
              alt=""
              width={40}
              height={40}
              className="shrink-0 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-sproutine-muted">
                On this day — {monthsLabel(data.monthsAgo)}
              </p>
              <p className="mt-0.5 font-display text-[16px] leading-snug text-sproutine-text">
                {slotLabel}: {items}
              </p>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleReplay}
              className="btn-primary h-9 flex-1 text-[13px]"
            >
              <Icon name="replay" size={16} />
              Log it again
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="btn-secondary h-9 flex-1 text-[13px]"
            >
              Nice memory
            </button>
          </div>

          <p className="mt-2 text-center text-[11px] text-sproutine-muted">
            Swipe to dismiss
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
