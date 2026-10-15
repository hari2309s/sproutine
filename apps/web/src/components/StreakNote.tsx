'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Icon, type IconName } from './Icon'

interface StreakNoteProps {
  habitTitle: string
  habitIcon?: IconName
  streak: number
  message: string
}

/**
 * Rosie's sticky-note celebration for streak milestones.
 * Tilted 1.5°, strip of tape, confetti dots, serif count.
 * Grows with each milestone: 3=small inline, 7/14=note, 30=big with sprout.
 */
export function StreakNote({ habitTitle, habitIcon = 'eco', streak, message }: StreakNoteProps) {
  // 3-day: just a warm inline message, no card
  if (streak < 7) {
    return (
      <motion.div
        className="flex flex-col gap-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="inline-flex h-8 items-center gap-1.5 self-start rounded-full bg-sproutine-surface px-3 text-[13px] font-semibold">
          <Icon name={habitIcon} size={17} className="text-sproutine-accent" filled />
          {habitTitle} · {streak} days
        </span>
      </motion.div>
    )
  }

  const isBig = streak >= 30
  const tilt = streak >= 14 ? (isBig ? -1 : 1.2) : -1.5
  const label = streak >= 14 ? (isBig ? `${streak} days` : 'Two weeks!') : `${streak} days!`

  return (
    <motion.div
      className="relative mx-1 my-1.5"
      style={{ transform: `rotate(${tilt}deg)` }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
    >
      {/* Tape strip */}
      <span
        className="absolute left-1/2 -top-2.5 z-10 h-6 w-[84px] -translate-x-1/2 rotate-[3deg] rounded-[3px] bg-sproutine-surface opacity-90 shadow-sm"
      />

      <div
        className={`relative overflow-hidden rounded-lg rounded-br-[26px] bg-sproutine-accent-soft p-5 shadow-soft ${
          isBig ? 'pt-6 text-center' : ''
        }`}
      >
        {/* Confetti dots */}
        <ConfettiDots count={streak >= 30 ? 10 : streak >= 14 ? 7 : 4} />

        {/* Sparkle icon */}
        {streak >= 7 && (
          <span className="absolute right-[30px] top-[76px]">
            <Icon name="auto_awesome" size={22} className="text-sproutine-accent" filled />
          </span>
        )}

        {/* Sprout illustration for 30+ */}
        {isBig && (
          <Image
            src="/icons/sproutine.png"
            alt=""
            width={110}
            height={110}
            className="relative mx-auto -mb-3.5 -mt-3 object-contain"
          />
        )}

        {/* Habit name */}
        <span
          className={`relative flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sproutine-text-secondary ${
            isBig ? 'justify-center' : ''
          }`}
        >
          <Icon name={habitIcon} size={18} className="text-sproutine-accent" />
          {habitTitle}
        </span>

        {/* Big serif count */}
        <span
          className={`relative mt-1 mb-1 block font-display leading-none text-sproutine-accent ${
            isBig ? 'text-[64px]' : 'text-[48px]'
          }`}
        >
          {label}
        </span>

        {/* Message */}
        <span className="relative block text-[15px] leading-relaxed">{message}</span>

        {/* Signature */}
        <span className="relative mt-1 block font-display text-[15px] text-sproutine-text-secondary">
          — Rosie
        </span>
      </div>
    </motion.div>
  )
}

/** Scattered confetti dots in palette colours. */
function ConfettiDots({ count }: { count: number }) {
  // Deterministic positions so they don't jump on re-render
  const positions = [
    { l: 90, t: 10, s: 7, c: 'bg-green-400' },
    { l: 80, t: 6, s: 5, c: 'bg-sproutine-text-secondary', sq: true },
    { l: 92, t: 58, s: 6, c: 'bg-sproutine-accent', sq: true },
    { l: 86, t: 86, s: 5, c: 'bg-green-400', sq: true },
    { l: 8, t: 24, s: 8, c: 'bg-green-400' },
    { l: 18, t: 58, s: 6, c: 'bg-sproutine-accent', sq: true },
    { l: 4, t: 130, s: 5, c: 'bg-sproutine-text-secondary' },
    { l: 3, t: 96, s: 7, c: 'bg-green-400', sq: true },
    { l: 84, t: 22, s: 7, c: 'bg-sproutine-accent' },
    { l: 72, t: 14, s: 5, c: 'bg-green-400' },
  ]

  return (
    <>
      {positions.slice(0, count).map((d, i) => (
        <span
          key={i}
          className={`absolute ${d.c} ${d.sq ? 'rotate-[22deg] rounded-sm' : 'rounded-full'}`}
          style={{
            left: `${d.l}%`,
            top: d.t,
            width: d.s,
            height: d.s,
          }}
        />
      ))}
    </>
  )
}
