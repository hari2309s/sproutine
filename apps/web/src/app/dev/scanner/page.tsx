'use client'

import { notFound, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { BarcodeScanner } from '@/components/BarcodeScanner'

// Development-only harness for the barcode scanner (camera tests with a fake
// video feed). Returns 404 in production builds.
function ScannerHarness() {
  const params = useSearchParams()
  const [code, setCode] = useState<string | null>(null)
  if (code) return <p data-testid="detected">{code}</p>
  return (
    <BarcodeScanner
      decoder={params.get('decoder') === 'zxing' ? 'zxing' : 'auto'}
      onDetected={setCode}
      onClose={() => setCode('closed')}
      onTellRosie={() => setCode('tell-rosie')}
    />
  )
}

export default function DevScannerPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <Suspense>
      <ScannerHarness />
    </Suspense>
  )
}
