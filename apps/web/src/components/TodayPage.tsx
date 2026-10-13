'use client'

import Image from 'next/image'
import Link from 'next/link'
import { AppColumn } from './AppColumn'
import { BottomNav } from './BottomNav'
import { TopBar } from './TopBar'
import { PageEnter } from './PageMotion'
import { Icon, type IconName } from './Icon'
import { useLanguage } from '@/contexts/LanguageContext'

const UPCOMING_ICONS: IconName[] = ['calendar_view_week', 'shopping_basket', 'eco']

// Phase 0 home: greeting plus an entry point into chat. The meals list and
// daily tally replace the empty card once logging lands (Phase 2).
export function TodayPage({ userId, name }: { userId: string; name: string }) {
  const { t, locale } = useLanguage()

  const now = new Date()
  const hour = now.getHours()
  const timeGreeting =
    hour < 12 ? t.today.goodMorning : hour < 17 ? t.today.goodAfternoon : t.today.goodEvening
  const greeting = name ? `${timeGreeting}, ${name}` : timeGreeting
  const dateLabel = now.toLocaleDateString(locale === 'en' ? 'en-GB' : locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <AppColumn>
      <TopBar userId={userId} />

      <PageEnter className="flex min-h-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 pt-3 pb-8">
          <div className="space-y-1.5">
            <p className="text-sm text-sproutine-muted">{dateLabel}</p>
            <h1 className="font-display text-[34px] leading-[1.08] text-sproutine-text">
              {greeting}
            </h1>
          </div>

          <section className="card flex flex-col items-center gap-2.5 px-5 py-6 text-center">
            <Image
              src="/icons/sproutine.png"
              alt=""
              width={120}
              height={120}
              priority
              className="-mt-3.5 -mb-4"
            />
            <h2 className="font-display text-[22px] text-sproutine-text">{t.today.emptyTitle}</h2>
            <p className="max-w-[280px] text-[15px] leading-normal text-pretty text-sproutine-text-secondary">
              {t.today.emptyBody}
            </p>
            <Link href="/chat" className="btn-primary mt-1.5 h-12 px-6 text-[15px]">
              {t.today.talkToRosie}
              <Icon name="arrow_forward" size={20} />
            </Link>
          </section>

          <section className="space-y-2.5">
            <h2 className="eyebrow">{t.today.comingSoon}</h2>
            <ul className="overflow-hidden rounded-[22px] bg-sproutine-surface">
              {t.today.upcoming.map((label, i) => (
                <li
                  key={label}
                  className="flex min-h-14 items-center gap-3 border-b border-sproutine-border px-4 text-[15px] text-sproutine-text last:border-b-0"
                >
                  <Icon
                    name={UPCOMING_ICONS[i] ?? 'eco'}
                    size={22}
                    className="text-sproutine-text-secondary"
                  />
                  {label}
                </li>
              ))}
            </ul>
          </section>
        </main>
      </PageEnter>

      <BottomNav active="today" />
    </AppColumn>
  )
}
