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
        <div className="card border-dashed text-center py-6 space-y-2">
          <p className="text-truffle-muted text-sm">Something went wrong loading this section.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-xs text-truffle-amber hover:text-truffle-amber-light transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
