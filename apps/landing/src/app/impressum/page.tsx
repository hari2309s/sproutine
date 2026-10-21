import type { Metadata } from 'next'
import { LegalPage } from '@/components/LegalPage'
import { CONTACT_EMAIL, IMPRINT } from '@/lib/config'
import { imprintPage } from '@/lib/legal'

const page = imprintPage({ ...IMPRINT, email: CONTACT_EMAIL })

export const metadata: Metadata = {
  title: 'Impressum',
  description: page.summary,
  alternates: { canonical: '/impressum' },
}

export default function ImpressumPage() {
  return <LegalPage page={page} active="/impressum" />
}
