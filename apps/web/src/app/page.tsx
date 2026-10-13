import { Suspense } from 'react'
import { HomeClient } from '@/components/HomeClient'

export default function HomePage() {
  return (
    <Suspense>
      <HomeClient />
    </Suspense>
  )
}
