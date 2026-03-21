import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-3xl text-error">error</span>
          </div>
          <h1 className="text-xl font-bold text-on-surface mb-2">Something went wrong</h1>
          <p className="text-sm text-slate-500 mb-6">
            An unexpected error occurred. Please refresh the page to try again.
          </p>
          {this.state.error && (
            <p className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3 mb-6 font-mono break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="gradient-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
}
