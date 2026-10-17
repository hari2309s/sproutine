'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Icon } from './Icon'
import { useLanguage } from '@/contexts/LanguageContext'

interface StreakMilestoneProps {
  milestone: number
  name: string
  onClose: () => void
  onShare?: () => void
}

// Deterministic confetti layout — no runtime randomness so no hydration mismatch.
const CONFETTI = [
  { l: 8,  t: 12, w: 8,  h: 8,  r: 15,  c: 'bg-green-400' },
  { l: 18, t: 28, w: 6,  h: 10, r: -20, c: 'bg-sproutine-accent' },
  { l: 5,  t: 55, w: 9,  h: 6,  r: 30,  c: 'bg-yellow-300' },
  { l: 14, t: 75, w: 7,  h: 7,  r: -10, c: 'bg-pink-400' },
  { l: 3,  t: 88, w: 5,  h: 9,  r: 25,  c: 'bg-sproutine-accent' },
  { l: 82, t: 8,  w: 8,  h: 6,  r: -18, c: 'bg-yellow-300' },
  { l: 90, t: 22, w: 6,  h: 10, r: 12,  c: 'bg-pink-400' },
  { l: 78, t: 42, w: 9,  h: 7,  r: -30, c: 'bg-green-400' },
  { l: 88, t: 65, w: 7,  h: 7,  r: 20,  c: 'bg-sproutine-accent' },
  { l: 75, t: 82, w: 5,  h: 8,  r: -15, c: 'bg-yellow-300' },
  { l: 35, t: 5,  w: 7,  h: 7,  r: 22,  c: 'bg-pink-400' },
  { l: 55, t: 3,  w: 6,  h: 9,  r: -25, c: 'bg-green-400' },
  { l: 42, t: 92, w: 8,  h: 6,  r: 10,  c: 'bg-sproutine-accent' },
  { l: 62, t: 90, w: 9,  h: 8,  r: -12, c: 'bg-yellow-300' },
  { l: 25, t: 40, w: 6,  h: 6,  r: 35,  c: 'bg-pink-400' },
  { l: 70, t: 55, w: 7,  h: 10, r: -22, c: 'bg-green-400' },
]

export function StreakMilestone({ milestone, name, onClose, onShare }: StreakMilestoneProps) {
  const { t } = useLanguage()
  const [confettiVisible, setConfettiVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setConfettiVisible(false), 1200)
    return () => clearTimeout(timer)
  }, [])

  const motivationalLine = t.streak.milestoneLines[milestone] ?? t.streak.backAtIt

  return (
    <div className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-sproutine-bg/95 backdrop-blur-sm">
      {/* Confetti */}
      {confettiVisible &&
        CONFETTI.map((d, i) => (
          <motion.span
            key={i}
            className={`pointer-events-none absolute rounded-sm ${d.c}`}
            style={{ left: `${d.l}%`, top: `${d.t}%`, width: d.w, height: d.h, rotate: d.r }}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: 60 }}
            transition={{ duration: 1.2, delay: i * 0.04, ease: 'easeIn' }}
          />
        ))}

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-sproutine-surface"
      >
        <Icon name="close" size={22} />
      </button>

      {/* Main card */}
      <motion.div
        className="flex w-full max-w-[340px] flex-col items-center gap-2 px-6 text-center"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        {/* Sproutine logo */}
        <Image
          src="/icons/sproutine.png"
          alt="Sproutine"
          width={180}
          height={180}
          className="object-contain"
          priority
        />

        {/* Milestone number */}
        <span className="font-display text-[132px] leading-none text-sproutine-accent">
          {milestone}
        </span>

        {/* "days in a row" */}
        <span className="font-display text-[26px] leading-tight">{t.streak.dayStreak}</span>

        {/* Rosie quote */}
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sproutine-accent-soft">
              <Image
                src="/icons/sproutine.png"
                alt="Rosie"
                width={28}
                height={28}
                className="object-contain"
              />
            </span>
            <p className="text-left text-[17px] leading-snug">{motivationalLine}</p>
          </div>
          <span className="font-display text-[15px] text-sproutine-text-secondary">— Rosie</span>
        </div>

        {/* Actions */}
        <div className="mt-6 flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary w-full"
          >
            {t.streak.keepGoing}
          </button>
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="flex items-center justify-center gap-1.5 text-[15px] font-semibold text-sproutine-accent"
            >
              <Icon name="ios_share" size={18} />
              {t.streak.share}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
