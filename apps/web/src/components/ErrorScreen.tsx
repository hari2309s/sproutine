'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Icon } from './Icon'
import { useLanguage } from '@/contexts/LanguageContext'

/** Full-screen error with a retry. Never blames the user. */
export function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-sproutine-bg px-8 text-center">
      <Image
        src="/icons/sproutine.png"
        alt=""
        width={150}
        height={150}
        className="-mb-4 -rotate-[8deg]"
      />
      <h1 className="font-display text-[30px] leading-tight text-sproutine-text">
        {t.states.errorTitle}
      </h1>
      <p className="max-w-sm text-base leading-normal text-sproutine-text-secondary">
        {t.states.errorBody}
      </p>
      <button type="button" onClick={onRetry} className="btn-primary mt-2.5 w-full max-w-sm">
        <Icon name="refresh" size={20} />
        {t.states.retry}
      </button>
      <Link href="/" className="btn-ghost h-11 text-[15px]">
        {t.states.backToToday}
      </Link>
    </div>
  )
}
