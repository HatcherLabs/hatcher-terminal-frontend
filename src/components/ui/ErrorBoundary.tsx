"use client";

import React, { Component, type ReactNode } from "react";
import Link from "next/link";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isDev = process.env.NODE_ENV === "development";

      return (
        <div
          className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-lg mx-auto max-w-md"
          style={{
            backgroundColor: "#0a0d14",
            border: "1px solid #f23645",
          }}
        >
          {/* Terminal-style error icon */}
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: "rgba(242, 54, 69, 0.1)" }}
          >
            <svg
              viewBox="0 0 24 24"
              width={24}
              height={24}
              fill="none"
              stroke="#f23645"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>

          {/* Terminal prompt style title */}
          <h2
            className="text-sm font-bold font-mono tracking-wider uppercase mb-1"
            style={{ color: "#f23645" }}
          >
            {this.props.fallbackTitle || "Something went wrong"}
          </h2>

          <p
            className="text-xs font-mono mb-6 max-w-[280px] leading-relaxed"
            style={{ color: "#5c6380" }}
          >
            An unexpected error occurred. Try again or return home.
          </p>

          {/* Dev-only error message */}
          {isDev && this.state.error && (
            <div
              className="w-full max-w-sm rounded-lg p-3 text-left mb-6"
              style={{
                backgroundColor: "#04060b",
                border: "1px solid #1a1f2e",
              }}
            >
              <p
                className="text-[9px] font-bold uppercase tracking-widest mb-1.5"
                style={{ color: "#f23645" }}
              >
                DEV ERROR
              </p>
              <p
                className="text-[11px] font-mono break-all leading-relaxed"
                style={{ color: "#9ca3b8" }}
              >
                {this.state.error.message}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleRetry}
              className="px-5 py-2 rounded-lg text-sm font-bold font-mono uppercase tracking-wider transition-all hover:brightness-110"
              style={{
                backgroundColor: "#00d672",
                color: "#04060b",
              }}
            >
              Try Again
            </button>

            <Link
              href="/"
              className="px-5 py-2 rounded-lg text-sm font-medium font-mono uppercase tracking-wider transition-all hover:brightness-110"
              style={{
                backgroundColor: "#10131c",
                color: "#9ca3b8",
                border: "1px solid #1a1f2e",
              }}
            >
              Go Home
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
