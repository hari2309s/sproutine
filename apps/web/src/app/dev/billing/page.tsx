'use client'

import { notFound } from 'next/navigation'
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { PlanNotices } from '@/components/PlanNotices'
import { ProGateSheet } from '@/components/ProGateSheet'
import { SubscriptionSection } from '@/components/SubscriptionSection'

// Development-only harness for plan UI (e2e tests stub /api/billing/*).
// Returns 404 in production builds.
export default function DevBillingPage() {
  const [gate, setGate] = useState(false)
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <main className="mx-auto max-w-lg space-y-6 p-5">
      <PlanNotices />
      <SubscriptionSection />
      <button
        type="button"
        data-testid="open-gate"
        onClick={() => setGate(true)}
        className="btn-secondary"
      >
        Open gate
      </button>
      <AnimatePresence>
        {gate && <ProGateSheet source="chat" onClose={() => setGate(false)} />}
      </AnimatePresence>
    </main>
  )
}
