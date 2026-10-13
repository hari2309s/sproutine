'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-dvh bg-truffle-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-truffle-text text-lg font-medium">Something went wrong</p>
      <p className="text-truffle-muted text-sm">
        {error.message ?? 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        className="mt-2 px-4 py-2 rounded-xl bg-truffle-accent text-white text-sm font-medium"
      >
        Try again
      </button>
    </div>
  )
}
