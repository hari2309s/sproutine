/**
 * The signed-in app lives in a centred 512px column. On wider screens the
 * column gets side borders so it reads as a deliberate frame, not a stretched
 * phone layout.
 */
export function AppColumn({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col bg-sproutine-bg sm:border-x sm:border-sproutine-border">
      {children}
    </div>
  )
}
