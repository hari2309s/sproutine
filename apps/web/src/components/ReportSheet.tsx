'use client'

import { useState } from 'react'
import { BottomSheet } from './BottomSheet'
import { Icon } from './Icon'
import { useLanguage } from '@/contexts/LanguageContext'

interface ReportSheetProps {
  onClose: () => void
}

export function ReportSheet({ onClose }: ReportSheetProps) {
  const { t } = useLanguage()
  const [generating, setGenerating] = useState<string | null>(null)

  const download = async (range: 'week' | 'month') => {
    setGenerating(range)
    try {
      const res = await fetch(`/api/reports?range=${range}&format=csv`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sproutine-report-${range}-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      onClose()
    } catch {
      /* silent */
    } finally {
      setGenerating(null)
    }
  }

  return (
    <BottomSheet title={t.reports.title} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-sproutine-text-secondary">{t.reports.subtitle}</p>

        <button
          type="button"
          onClick={() => download('week')}
          disabled={generating !== null}
          className="card flex w-full items-center gap-3 p-4 shadow-none transition-colors hover:bg-sproutine-surface"
        >
          <Icon name="calendar_view_week" size={22} className="text-sproutine-accent" />
          <div className="flex-1 text-left">
            <span className="text-[15px] font-semibold text-sproutine-text">{t.reports.weekly}</span>
            <p className="text-[13px] text-sproutine-text-secondary">{t.reports.weeklyDesc}</p>
          </div>
          {generating === 'week' ? (
            <span className="text-sm text-sproutine-muted">{t.settings.preparing}</span>
          ) : (
            <Icon name="download" size={20} className="text-sproutine-text-secondary" />
          )}
        </button>

        <button
          type="button"
          onClick={() => download('month')}
          disabled={generating !== null}
          className="card flex w-full items-center gap-3 p-4 shadow-none transition-colors hover:bg-sproutine-surface"
        >
          <Icon name="calendar_month" size={22} className="text-sproutine-accent" />
          <div className="flex-1 text-left">
            <span className="text-[15px] font-semibold text-sproutine-text">{t.reports.monthly}</span>
            <p className="text-[13px] text-sproutine-text-secondary">{t.reports.monthlyDesc}</p>
          </div>
          {generating === 'month' ? (
            <span className="text-sm text-sproutine-muted">{t.settings.preparing}</span>
          ) : (
            <Icon name="download" size={20} className="text-sproutine-text-secondary" />
          )}
        </button>
      </div>
    </BottomSheet>
  )
}
