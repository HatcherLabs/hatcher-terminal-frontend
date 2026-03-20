"use client";

import React, { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-red/10 flex items-center justify-center mb-4">
            <svg
              viewBox="0 0 24 24"
              width={24}
              height={24}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h2 className="text-sm font-semibold text-text-primary mb-1">
            {this.props.fallbackTitle || "Something went wrong"}
          </h2>
          <p className="text-xs text-text-muted mb-4 max-w-[280px]">
            An unexpected error occurred. Try again or reload the page.
          </p>

          <button
            onClick={this.handleRetry}
            className="px-5 py-2 rounded-lg bg-green text-bg-primary text-sm font-semibold hover:brightness-110 transition-all mb-3"
          >
            Try Again
          </button>

          {this.state.error && (
            <button
              onClick={() =>
                this.setState((s) => ({ showDetails: !s.showDetails }))
              }
              className="text-[11px] text-text-faint hover:text-text-muted transition-colors"
            >
              {this.state.showDetails ? "Hide details" : "Show details"}
            </button>
          )}

          {this.state.showDetails && this.state.error && (
            <div className="mt-3 w-full max-w-sm bg-bg-card border border-border rounded-lg p-3 text-left">
              <p className="text-[11px] font-mono text-red break-all leading-relaxed">
                {this.state.error.message}
              </p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
