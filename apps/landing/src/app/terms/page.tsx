import type { Metadata } from 'next'
import { LegalPage } from '@/components/LegalPage'
import { TERMS } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Terms of use',
  description: TERMS.summary,
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return <LegalPage page={TERMS} active="/terms" />
}
