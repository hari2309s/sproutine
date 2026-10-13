'use client'

import { motion } from 'framer-motion'
import { useRef, type RefObject } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Anomaly, Transaction } from '@truffle/types'
import { useTransactionsQuery } from '@/hooks/useTransactionsQuery'
import { detectSubscriptions } from '@/lib/subscriptions'
import { staggerItemVariants, staggerListVariants, truffleEase } from '@/lib/motion'
import { computeForecast } from '@/lib/forecast'
import type { Forecast } from '@/lib/forecast'
import { InsightsAccordionSection } from './InsightsAccordionSection'
import { PageEnter, SkeletonPulse } from './PageMotion'
import { SavingsGoalsEmbedded } from './SavingsGoals'
import { SavingsHabits } from './SavingsHabits'
import { SpendingHeatmap } from './SpendingHeatmap'
import { MonthlyBudgets } from './MonthlyBudgets'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { ErrorBoundary } from './ErrorBoundary'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { SectionAddFormProvider, useSectionAddForm } from '@/contexts/SectionAddFormContext'
import { toDateLocale } from '@/lib/date'

interface InsightsPageProps {
  userId: string
}

export function InsightsPage({ userId }: InsightsPageProps) {
  const { t, locale } = useLanguage()
  const mainRef = useRef<HTMLElement>(null)

  const { data: txData, isLoading: txLoading } = useTransactionsQuery(userId)

  const { data: anomalyData, isLoading: anomalyLoading } = useQuery({
    queryKey: ['anomalies', userId],
    queryFn: async () => {
      const res = await fetch(`/api/insights?userId=${userId}`)
      if (!res.ok) throw new Error('Failed to fetch anomalies')
      const json = await res.json()
      return (json.anomalies ?? []) as Anomaly[]
    },
  })

  const { formatAmount } = useCurrency()
  const forecast = txData?.transactions ? computeForecast(txData.transactions, formatAmount) : null
  const anomalies = anomalyData ?? []
  const subscriptions = txData?.transactions ? detectSubscriptions(txData.transactions) : []
  const isLoading = txLoading

  return (
    <div className="flex-1 w-full bg-truffle-bg flex flex-col max-w-lg mx-auto min-h-0">
      <TopBar title={t.insights.title} subtitle="" showControls userId={userId} />

      <PageEnter className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-shrink-0 px-4 pt-4 pb-2 bg-truffle-bg">
          <h2 className="text-sm font-medium text-truffle-text-secondary uppercase tracking-wide mb-3">
            {t.insights.monthForecast}
          </h2>
          {isLoading ? (
            <SkeletonPulse className="card h-24" />
          ) : forecast ? (
            <ForecastCard forecast={forecast} />
          ) : (
            <motion.div
              className="card border-dashed text-center text-truffle-muted text-sm py-6"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, ease: truffleEase }}
            >
              {t.insights.addTransactionsForForecast}
            </motion.div>
          )}
        </div>

        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto px-4 py-6 pb-[calc(5rem_+_env(safe-area-inset-bottom))] space-y-6 min-h-0"
        >
          <ErrorBoundary>
            <InsightsAccordionSection title={t.insights.spendingCalendar} scrollRootRef={mainRef}>
              {isLoading ? (
                <SkeletonPulse className="card h-64" />
              ) : (
                <SpendingHeatmap transactions={txData?.transactions ?? []} />
              )}
            </InsightsAccordionSection>

            <SectionAddFormProvider>
              <BudgetsSection
                userId={userId}
                transactions={txData?.transactions ?? []}
                isLoading={isLoading}
                mainRef={mainRef}
              />
            </SectionAddFormProvider>

            <SectionAddFormProvider>
              <GoalsSection userId={userId} mainRef={mainRef} />
            </SectionAddFormProvider>

            <InsightsAccordionSection title={t.insights.savingHabits} scrollRootRef={mainRef}>
              <SavingsHabits userId={userId} />
            </InsightsAccordionSection>

            {subscriptions.length > 0 && (
              <InsightsAccordionSection
                title={t.insights.recurringSubscriptions}
                scrollRootRef={mainRef}
              >
                <div className="space-y-2">
                  {subscriptions.map((sub) => (
                    <div key={sub.key} className="card flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-truffle-text">{sub.displayName}</p>
                        <p className="text-xs text-truffle-muted">
                          {t.insights.lastCharged}{' '}
                          {new Date(sub.lastCharged).toLocaleDateString(toDateLocale(locale), {
                            day: 'numeric',
                            month: 'short',
                          })}
                          {' · '}
                          {t.insights.detected(sub.monthsDetected)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-truffle-red">
                        -{formatAmount(sub.monthlyAmount)}
                        {t.insights.perMonth}
                      </span>
                    </div>
                  ))}
                </div>
              </InsightsAccordionSection>
            )}

            <InsightsAccordionSection title={t.insights.thingsToReview} scrollRootRef={mainRef}>
              {anomalyLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <SkeletonPulse key={i} className="card h-16" />
                  ))}
                </div>
              ) : anomalies.length ? (
                <motion.div
                  className="space-y-2"
                  initial="hidden"
                  animate="show"
                  variants={staggerListVariants}
                >
                  {anomalies.map((a) => (
                    <motion.div key={a.id} variants={staggerItemVariants}>
                      <AnomalyCard anomaly={a} />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  className="card border-dashed text-center text-truffle-muted text-sm py-6"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.34, ease: truffleEase }}
                >
                  {t.insights.noUnusualActivity}
                </motion.div>
              )}
            </InsightsAccordionSection>
          </ErrorBoundary>
        </main>
      </PageEnter>

      <BottomNav active="insights" />
    </div>
  )
}

/** Reads its own SectionAddFormProvider so the header's "add" toggle and the
 * embedded MonthlyBudgets both share open/close state without InsightsPage
 * threading it as controlled props. */
function BudgetsSection({
  userId,
  transactions,
  isLoading,
  mainRef,
}: {
  userId: string
  transactions: Transaction[]
  isLoading: boolean
  mainRef: RefObject<HTMLElement | null>
}) {
  const { t } = useLanguage()
  const { open, setOpen } = useSectionAddForm()

  return (
    <InsightsAccordionSection
      title={t.insights.monthlyBudgets}
      scrollRootRef={mainRef}
      headerRight={
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-xs text-truffle-amber hover:text-truffle-amber-light transition-colors"
        >
          {open ? t.savingsGoals.cancel : t.insights.newBudget}
        </button>
      }
    >
      {isLoading ? (
        <SkeletonPulse className="card h-24" />
      ) : (
        <MonthlyBudgets userId={userId} transactions={transactions} />
      )}
    </InsightsAccordionSection>
  )
}

/** Same pattern as BudgetsSection, for the embedded savings-goals accordion section. */
function GoalsSection({
  userId,
  mainRef,
}: {
  userId: string
  mainRef: RefObject<HTMLElement | null>
}) {
  const { t } = useLanguage()
  const { open, setOpen } = useSectionAddForm()

  return (
    <InsightsAccordionSection
      title={t.insights.savingsGoals}
      scrollRootRef={mainRef}
      onLeaveViewport={() => setOpen(false)}
      headerRight={
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-xs text-truffle-amber hover:text-truffle-amber-light transition-colors"
        >
          {open ? t.savingsGoals.cancel : t.insights.newGoal}
        </button>
      }
    >
      <SavingsGoalsEmbedded userId={userId} />
    </InsightsAccordionSection>
  )
}

function ForecastCard({ forecast }: { forecast: Forecast }) {
  const { t } = useLanguage()
  const { formatAmount } = useCurrency()
  const isPositive = forecast.projectedEndOfMonth >= 0
  const progress = Math.min(
    100,
    Math.max(
      0,
      forecast.projectedEndOfMonth > 0 && forecast.currentBalance > 0
        ? (forecast.currentBalance / forecast.projectedEndOfMonth) * 100
        : 0
    )
  )

  return (
    <motion.div
      className="card space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: truffleEase }}
    >
      <div className="flex justify-between items-end">
        <div>
          <p className="text-xs text-truffle-muted mb-1">{t.insights.projectedEndOfMonth}</p>
          <p
            className={`text-2xl font-bold ${isPositive ? 'text-truffle-green' : 'text-truffle-red'}`}
          >
            {formatAmount(forecast.projectedEndOfMonth)}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            forecast.confidence === 'high'
              ? 'bg-truffle-green/20 text-truffle-green'
              : forecast.confidence === 'medium'
                ? 'bg-truffle-amber/20 text-truffle-amber'
                : 'bg-truffle-muted/20 text-truffle-muted'
          }`}
        >
          {t.financialBrief.confidence[forecast.confidence]}
        </span>
      </div>

      <div className="h-2 bg-truffle-surface rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${isPositive ? 'bg-truffle-green' : 'bg-truffle-red'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <ul className="space-y-1">
        {forecast.assumptions.map((assumption, i) => (
          <li key={i} className="text-xs text-truffle-muted flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-truffle-muted inline-block flex-shrink-0" />
            {assumption}
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  const severityColors = {
    high: 'text-truffle-red bg-truffle-red/10',
    medium: 'text-truffle-amber bg-truffle-amber/10',
    low: 'text-truffle-muted bg-truffle-muted/10',
  }

  const typeEmoji = {
    unusual_amount: '⚠️',
    forgotten_subscription: '🔄',
    category_spike: '📈',
    new_merchant: '🆕',
  }

  return (
    <div className="card flex gap-3">
      <span className="text-xl flex-shrink-0">{typeEmoji[anomaly.type] ?? '⚠️'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-truffle-text">{anomaly.description}</p>
        <span
          className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full ${severityColors[anomaly.severity]}`}
        >
          {anomaly.severity}
        </span>
      </div>
    </div>
  )
}
