import { LoadingSpinner } from '@/components/PageMotion'
import { TopBar } from '@/components/TopBar'
import { BottomNav } from '@/components/BottomNav'

export default function Loading() {
  return (
    <div className="h-dvh bg-truffle-bg flex flex-col max-w-lg mx-auto overflow-hidden">
      <TopBar />
      <main className="flex-1 flex items-center justify-center pb-14">
        <LoadingSpinner />
      </main>
      <BottomNav active="chat" />
    </div>
  )
}
