'use client'

import { TopBar } from '@/components/TopBar'
import { BottomNav } from '@/components/BottomNav'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="h-dvh bg-truffle-bg flex flex-col max-w-lg mx-auto overflow-hidden">
      <TopBar />
      <main className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center pb-14">
        <p className="text-truffle-text text-lg font-medium">Chat unavailable</p>
        <p className="text-truffle-muted text-sm">{error.message ?? 'Something went wrong.'}</p>
        <button
          onClick={reset}
          className="mt-2 px-4 py-2 rounded-xl bg-truffle-accent text-white text-sm font-medium"
        >
          Try again
        </button>
      </main>
      <BottomNav active="chat" />
    </div>
  )
}
