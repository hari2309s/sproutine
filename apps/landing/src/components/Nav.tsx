'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { APP_URL, NAV_LINKS } from '@/lib/config'
import { ThemeToggle } from './ThemeToggle'
import { Icon, Sprout } from './ui'

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    const onResize = () => innerWidth >= 820 && setMenu(false)
    document.body.style.overflow = 'hidden'
    addEventListener('keydown', onKey)
    addEventListener('resize', onResize)
    return () => {
      document.body.style.overflow = ''
      removeEventListener('keydown', onKey)
      removeEventListener('resize', onResize)
    }
  }, [menu])

  const solid = scrolled || menu
  return (
    <>
      <header
        className={`sticky top-0 z-50 border-b transition-[background-color,border-color] duration-200 ${
          solid
            ? 'border-line bg-[var(--nav)] backdrop-blur-[14px] backdrop-saturate-[1.2]'
            : 'border-transparent'
        }`}
      >
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center gap-1.5 px-[clamp(16px,4vw,40px)]">
          <Link
            href="/"
            className="flex min-h-11 flex-1 items-center gap-2.5 rounded-xl text-ink no-underline"
          >
            <Sprout size={40} />
            <span className="font-display text-[22px]">Sproutine</span>
          </Link>
          <nav aria-label="Main" className="mr-1.5 hidden gap-0.5 min-[820px]:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex h-11 items-center rounded-full px-3.5 text-[15px] font-medium text-ink2 no-underline hover:bg-surface hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
          <a
            href={APP_URL}
            className="ml-1.5 hidden h-11 items-center gap-1.5 rounded-full bg-accent px-5 text-[15px] font-semibold text-bg no-underline hover:brightness-110 min-[820px]:flex"
          >
            Open the app
            <Icon name="arrow_outward" size={18} />
          </a>
          <button
            type="button"
            onClick={() => setMenu((m) => !m)}
            aria-label={menu ? 'Close menu' : 'Open menu'}
            aria-expanded={menu}
            aria-controls="mobile-menu"
            className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-full border-none bg-surface text-ink min-[820px]:hidden"
          >
            <Icon name={menu ? 'close' : 'menu'} size={24} />
          </button>
        </div>
      </header>

      {menu && (
        <div
          id="mobile-menu"
          className="fixed inset-x-0 top-[72px] bottom-0 z-40 flex flex-col gap-1 bg-bg px-5 pt-3 pb-8 min-[820px]:hidden"
        >
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenu(false)}
              className="flex min-h-[60px] items-center justify-between border-b border-line font-display text-[28px] text-ink no-underline"
            >
              {l.label}
              <Icon name="arrow_forward" size={24} className="text-muted" />
            </Link>
          ))}
          <a
            href={APP_URL}
            className="mt-auto flex h-14 items-center justify-center gap-2 rounded-full bg-accent text-[17px] font-semibold text-bg no-underline"
          >
            Open the app
            <Icon name="arrow_outward" />
          </a>
          <span className="mt-2 text-center text-sm text-ink2">
            Free to start · 14 days of Pro included
          </span>
        </div>
      )}
    </>
  )
}
