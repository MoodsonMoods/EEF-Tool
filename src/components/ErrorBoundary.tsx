import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2 className="error-title">Something went wrong</h2>
            <p className="error-message">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="error-button"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <pre className="error-stack">{this.state.error.stack}</pre>
              </details>
            )}
          </div>

          <style jsx>{`
            .error-boundary {
              @apply min-h-screen flex items-center justify-center bg-gray-50 p-4;
            }
            
            .error-content {
              @apply max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center;
            }
            
            .error-title {
              @apply text-xl font-semibold text-gray-900 mb-2;
            }
            
            .error-message {
              @apply text-gray-600 mb-4;
            }
            
            .error-button {
              @apply bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors;
            }
            
            .error-details {
              @apply mt-4 text-left;
            }
            
            .error-stack {
              @apply mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
} 