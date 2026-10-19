import Link from 'next/link'
import { APP_URL, GITHUB_URL, NAV_LINKS } from '@/lib/config'
import { Icon, Sprout } from './ui'

const COLUMNS: { heading: string; links: { label: string; href: string; external?: boolean }[] }[] =
  [
    { heading: 'Product', links: [...NAV_LINKS] },
    {
      heading: 'Legal',
      links: [
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
        { label: 'Data sources', href: '/privacy#sources' },
      ],
    },
    {
      heading: 'Open source',
      links: [
        { label: 'GitHub', href: GITHUB_URL, external: true },
        { label: 'Open the app', href: APP_URL, external: true },
      ],
    },
  ]

const linkClass = 'flex min-h-11 items-center text-[15px] text-ink no-underline hover:text-accent'

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-[clamp(20px,5vw,48px)] pt-12 pb-10">
        <div className="flex flex-wrap gap-x-12 gap-y-8">
          <div className="flex flex-[2_1_260px] flex-col gap-3">
            <span className="flex items-center gap-2.5">
              <Sprout size={40} />
              <span className="font-display text-[22px]">Sproutine</span>
            </span>
            <span className="max-w-[320px] text-[15px] leading-[1.55] text-ink2">
              Eat well, one sprout at a time. A calm food companion, made in Berlin.
            </span>
          </div>
          {COLUMNS.map((col) => (
            <nav
              key={col.heading}
              aria-label={col.heading}
              className="flex flex-[1_1_140px] flex-col gap-0.5"
            >
              <span className="mb-1.5 text-[13px] font-bold tracking-[.06em] text-muted uppercase">
                {col.heading}
              </span>
              {col.links.map((l) =>
                l.external ? (
                  <a key={l.label} href={l.href} className={linkClass}>
                    {l.label}
                  </a>
                ) : (
                  <Link key={l.label} href={l.href} className={linkClass}>
                    {l.label}
                  </Link>
                )
              )}
            </nav>
          ))}
        </div>
        <div className="flex flex-col gap-2 border-t border-line pt-5 text-[13px] leading-[1.6] text-ink2">
          <span>
            <b className="text-ink">Not medical advice.</b> Sproutine offers general wellness
            guidance. For health concerns, please talk to a doctor.
          </span>
          <span>
            Open source (MIT). The hosted app is free to start, with an optional Pro plan.
          </span>
          <span>
            Food data: BLS 4.0 (Max Rubner-Institut, CC BY 4.0) · Open Food Facts (ODbL) · USDA
            FoodData Central (public domain).
          </span>
          <span className="flex flex-wrap items-center gap-1">
            Built with health and
            <Icon name="favorite" size={16} filled className="text-accent" />
            <span className="sr-only">love</span>
            from Berlin · © {new Date().getFullYear()} Sproutine
          </span>
        </div>
      </div>
    </footer>
  )
}
