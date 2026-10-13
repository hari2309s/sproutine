'use client'

import Image from 'next/image'
import { useLanguage } from '@/contexts/LanguageContext'

/** Full-screen loading state: the plate, the wordmark and three soft dots. */
export function LoadingScreen() {
  const { t } = useLanguage()
  return (
    <div
      role="status"
      className="flex flex-1 flex-col items-center justify-center gap-2 bg-sproutine-bg"
    >
      <Image
        src="/icons/sproutine.png"
        alt=""
        width={180}
        height={180}
        priority
        className="-mb-4"
      />
      <span className="font-display text-[28px] text-sproutine-text">Sproutine</span>
      <span className="text-[15px] text-sproutine-text-secondary">{t.states.loading}</span>
      <span aria-hidden className="mt-2.5 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-sproutine-accent motion-safe:animate-pulse"
            style={{ opacity: 1 - i * 0.3, animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
    </div>
  )
}
