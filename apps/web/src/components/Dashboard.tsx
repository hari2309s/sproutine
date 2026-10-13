'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { FinancialBrief } from './FinancialBrief'
import { TransactionList } from './TransactionList'
import { AddTransactionForm } from './AddTransactionForm'
import { WeeklySummary } from './WeeklySummary'
import { BottomNav } from './BottomNav'
import { ErrorBoundary } from './ErrorBoundary'
import { TopBar } from './TopBar'
import { PageEnter } from './PageMotion'
import { useLanguage } from '@/contexts/LanguageContext'

const CSVImport = dynamic(() => import('./CSVImport').then((m) => m.CSVImport))
const ReceiptUpload = dynamic(() => import('./ReceiptUpload').then((m) => m.ReceiptUpload))

interface DashboardProps {
  userId: string
  name: string
}

type ActivePanel = 'add' | 'csv' | 'receipt' | null

export function Dashboard({ userId, name }: DashboardProps) {
  const { t } = useLanguage()
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)

  const hour = new Date().getHours()
  const timeGreeting =
    hour < 12
      ? t.dashboard.goodMorning
      : hour < 17
        ? t.dashboard.goodAfternoon
        : t.dashboard.goodEvening
  const greeting = name ? `${timeGreeting}, ${name}` : timeGreeting

  const togglePanel = (panel: Exclude<ActivePanel, null>) =>
    setActivePanel((current) => (current === panel ? null : panel))

  return (
    <div className="flex-1 w-full bg-truffle-bg flex flex-col max-w-lg mx-auto min-h-0">
      <TopBar title="Truffle" subtitle={name ? greeting : ''}>
        <TopBar.ThemeToggle />
        <TopBar.Settings userId={userId} />
        <TopBar.SignOut />
      </TopBar>

      {/* Content — single scroll container so items flow behind the translucent nav */}
      <PageEnter className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto min-h-0">
          {/* Sticky top section — stays visible as transactions scroll underneath */}
          <div className="sticky top-0 z-10 bg-truffle-bg px-4 pt-6 pb-4 space-y-4">
            <ErrorBoundary>
              <WeeklySummary userId={userId} />
            </ErrorBoundary>
            <ErrorBoundary>
              <FinancialBrief userId={userId} />
            </ErrorBoundary>

            {activePanel === 'add' && (
              <AddTransactionForm userId={userId} onClose={() => setActivePanel(null)} />
            )}

            {activePanel === 'csv' && (
              <CSVImport userId={userId} onClose={() => setActivePanel(null)} />
            )}

            {activePanel === 'receipt' && (
              <ReceiptUpload userId={userId} onClose={() => setActivePanel(null)} />
            )}
          </div>

          {/* Transactions — scroll naturally, last item clears the nav bar */}
          <ErrorBoundary>
            <div className="px-4 pb-[calc(6rem_+_env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-truffle-text">{t.dashboard.recent}</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => togglePanel('receipt')}
                    className="text-sm text-truffle-muted hover:text-truffle-text transition-colors"
                  >
                    {activePanel === 'receipt' ? t.dashboard.cancel : t.dashboard.scan}
                  </button>
                  <button
                    onClick={() => togglePanel('csv')}
                    className="text-sm text-truffle-muted hover:text-truffle-text transition-colors"
                  >
                    {activePanel === 'csv' ? t.dashboard.cancel : t.dashboard.csv}
                  </button>
                  <button
                    onClick={() => togglePanel('add')}
                    className="text-sm text-truffle-amber hover:text-truffle-amber-light transition-colors"
                  >
                    {activePanel === 'add' ? t.dashboard.cancel : t.dashboard.add}
                  </button>
                </div>
              </div>
              <TransactionList userId={userId} />
            </div>
          </ErrorBoundary>
        </main>
      </PageEnter>

      <BottomNav active="home" />
    </div>
  )
}
