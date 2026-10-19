import { Faq } from '@/components/Faq'
import { Features } from '@/components/features/Features'
import { FinalCta } from '@/components/FinalCta'
import { Footer } from '@/components/Footer'
import { Hero } from '@/components/Hero'
import { HowItWorks } from '@/components/HowItWorks'
import { Nav } from '@/components/Nav'
import { Pricing } from '@/components/Pricing'
import { RevealObserver } from '@/components/RevealObserver'
import { Safety } from '@/components/Safety'
import { TrustStrip } from '@/components/TrustStrip'

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <TrustStrip />
        <Features />
        <HowItWorks />
        <Safety />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <RevealObserver />
    </>
  )
}
