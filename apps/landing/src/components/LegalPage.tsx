import Link from 'next/link'
import { CONTACT_EMAIL } from '@/lib/config'
import { LAST_UPDATED, type LegalPage as Page } from '@/lib/legal'
import { Footer } from './Footer'
import { Nav } from './Nav'
import { Sprout } from './ui'

const TABS = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
] as const

export function LegalPage({ page, active }: { page: Page; active: '/privacy' | '/terms' }) {
  return (
    <>
      <Nav />
      <main className="mx-auto flex max-w-[1200px] flex-col gap-[clamp(32px,5vw,56px)] px-[clamp(20px,5vw,48px)] pt-[clamp(40px,7vw,88px)] pb-[clamp(64px,9vw,112px)]">
        <div className="flex max-w-[760px] flex-col gap-3.5">
          <nav
            aria-label="Legal pages"
            className="flex gap-1 self-start rounded-full bg-surface p-1"
          >
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                aria-current={t.href === active ? 'page' : undefined}
                className={`flex h-10 items-center rounded-full px-4 text-[15px] no-underline ${
                  t.href === active
                    ? 'bg-card font-semibold text-ink shadow-soft'
                    : 'font-medium text-ink2'
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <h1 className="m-0 font-display text-[clamp(40px,6vw,72px)] leading-[1.04] font-normal">
            {page.title}
          </h1>
          <span className="text-[15px] text-ink2">Last updated {LAST_UPDATED}</span>
        </div>

        <div className="flex flex-wrap items-start gap-[clamp(32px,6vw,80px)]">
          <nav
            aria-label="On this page"
            className="flex flex-[0_1_240px] flex-col gap-0.5 md:sticky md:top-24"
          >
            <span className="mb-1.5 text-[13px] font-bold tracking-[.06em] text-muted uppercase">
              On this page
            </span>
            {page.sections.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className="flex min-h-10 items-center border-l-2 border-line pl-3.5 text-[15px] text-ink2 no-underline hover:border-accent hover:text-accent"
              >
                {sec.heading}
              </a>
            ))}
          </nav>
          <article className="flex max-w-[700px] flex-[1_1_520px] flex-col gap-10">
            <div className="flex items-start gap-3.5 rounded-3xl border border-line bg-card px-6 py-[22px]">
              <Sprout size={48} />
              <div className="flex flex-col gap-1.5">
                <span className="font-display text-xl">In plain words</span>
                <span className="text-[17px] leading-[1.65] text-ink2">{page.summary}</span>
              </div>
            </div>
            {page.sections.map((sec) => (
              <section key={sec.id} id={sec.id} className="flex scroll-mt-24 flex-col gap-3.5">
                <h2 className="m-0 font-display text-[clamp(26px,3vw,32px)] leading-[1.15] font-normal">
                  {sec.heading}
                </h2>
                {sec.paragraphs.map((p) => (
                  <p key={p} className="m-0 text-lg leading-[1.75] text-pretty">
                    {p}
                  </p>
                ))}
              </section>
            ))}
            <div className="border-t border-line pt-6 text-base leading-[1.7] text-ink2">
              Questions about this page? Write to{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-accent">
                {CONTACT_EMAIL}
              </a>
              .
            </div>
          </article>
        </div>
      </main>
      <Footer />
    </>
  )
}
