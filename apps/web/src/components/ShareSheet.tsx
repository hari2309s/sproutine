'use client'

import { useRef, useState } from 'react'
import { BottomSheet } from './BottomSheet'
import { Icon } from './Icon'
import { SummaryCard } from './SummaryCard'
import { useLanguage } from '@/contexts/LanguageContext'
import type { MealSlot, Nutrients } from '@sproutine/food/client'

interface ShareLog {
  slot: MealSlot
  items: { name: string }[]
  totals?: Nutrients
}

interface ShareSheetProps {
  logs: ShareLog[]
  gentle: boolean
  streak?: number
  onClose: () => void
}

type Format = 'story' | 'square'

export function ShareSheet({ logs, gentle, streak, onClose }: ShareSheetProps) {
  const { t } = useLanguage()
  const [format, setFormat] = useState<Format>('story')
  const cardRef = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)

  const handleShare = async () => {
    if (!cardRef.current) return
    setSharing(true)
    try {
      // Dynamic import to keep bundle small
      const { toPng } = await import('html-to-image')
      const scale = format === 'story' ? 1080 / 360 : 1080 / 360
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: scale,
        cacheBust: true,
      })

      // Convert to blob
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File(
        [blob],
        `sproutine-${format}-${new Date().toISOString().slice(0, 10)}.png`,
        { type: 'image/png' }
      )

      // Try Web Share API first, fall back to download
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
      onClose()
    } catch {
      /* user cancelled share or error */
    } finally {
      setSharing(false)
    }
  }

  return (
    <BottomSheet title={t.share.title} onClose={onClose}>
      <div className="space-y-4">
        {/* Format toggle */}
        <div className="flex gap-2">
          {(['story', 'square'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                format === f
                  ? 'bg-sproutine-accent text-sproutine-bg'
                  : 'bg-sproutine-surface text-sproutine-text-secondary'
              }`}
            >
              {t.share[f]}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="flex justify-center">
          <div
            className="overflow-hidden rounded-2xl"
            style={{
              width: format === 'story' ? 200 : 200,
              height: format === 'story' ? 356 : 200,
            }}
          >
            <div
              style={{
                transform: format === 'story' ? 'scale(0.556)' : 'scale(0.556)',
                transformOrigin: 'top left',
                width: 360,
                height: format === 'story' ? 640 : 360,
              }}
            >
              <SummaryCard
                ref={cardRef}
                logs={logs}
                gentle={gentle}
                streak={streak}
                format={format}
              />
            </div>
          </div>
        </div>

        <p className="text-center text-[13px] text-sproutine-muted">{t.share.privacy}</p>

        <button
          type="button"
          onClick={handleShare}
          disabled={sharing}
          className="btn-primary w-full"
        >
          <Icon name="ios_share" size={20} />
          {sharing ? t.share.sharing : t.share.shareButton}
        </button>
      </div>
    </BottomSheet>
  )
}
