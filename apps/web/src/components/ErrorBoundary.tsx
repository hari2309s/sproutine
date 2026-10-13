'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  /** Custom fallback. Omit to use the default "Something went wrong" card. */
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="card m-4 space-y-2 py-6 text-center">
          <p className="text-sm text-sproutine-text-secondary">
            Something went wrong loading this part. That one&rsquo;s on us.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="btn-ghost h-11 text-sm"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
