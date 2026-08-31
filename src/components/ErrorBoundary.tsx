import { Component, type ErrorInfo, type ReactNode } from 'react'

export class ErrorBoundary extends Component<
  { children: ReactNode; fallbackTitle?: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Atlas render error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="crash">
        <h2>{this.props.fallbackTitle ?? 'The atlas hit a snag'}</h2>
        <pre>{this.state.error.message}</pre>
        <button type="button" onClick={() => this.setState({ error: null })}>
          Try again
        </button>
      </div>
    )
  }
}
