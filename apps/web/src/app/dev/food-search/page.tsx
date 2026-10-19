'use client'

import { notFound, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { FoodSearchSheet } from '@/components/FoodSearchSheet'

// Development-only harness for the food search sheet (e2e tests stub the API
// routes). Returns 404 in production builds.
function SearchHarness() {
  const params = useSearchParams()
  const [result, setResult] = useState<string | null>(null)
  if (result) return <p data-testid="result">{result}</p>
  return (
    <FoodSearchSheet
      slot="lunch"
      gentle={params.get('gentle') === '1'}
      onClose={() => setResult('closed')}
      onSaved={(slot) => setResult(`saved:${slot}`)}
      onScan={() => setResult('scan')}
    />
  )
}

export default function DevFoodSearchPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <Suspense>
      <SearchHarness />
    </Suspense>
  )
}
