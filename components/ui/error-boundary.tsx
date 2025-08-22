"use client"

import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">
              Oops! Something went wrong
            </h2>
            <p className="text-gray-600">
              We apologize for the inconvenience. Please try refreshing the page or contact support if the problem persists.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.reload()}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.history.back()}
              >
                Go Back
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Error Details (Dev Only)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export function ErrorMessage({ 
  error, 
  onRetry, 
  title = "An error occurred" 
}: { 
  error: string
  onRetry?: () => void
  title?: string 
}) {
  return (
    <div className="border border-red-200 bg-red-50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-red-800">{title}</h3>
          <p className="text-red-700 text-sm mt-1">{error}</p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-3 text-red-700 border-red-300 hover:bg-red-100"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}