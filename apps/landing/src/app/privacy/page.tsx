import type { Metadata } from 'next'
import { LegalPage } from '@/components/LegalPage'
import { PRIVACY } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: PRIVACY.summary,
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return <LegalPage page={PRIVACY} active="/privacy" />
}
