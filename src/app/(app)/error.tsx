"use client";

import { useState } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-red/10 flex items-center justify-center mb-5">
        <svg
          viewBox="0 0 24 24"
          width={28}
          height={28}
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

      <h1 className="text-lg font-bold text-text-primary mb-2">
        Something went wrong
      </h1>
      <p className="text-sm text-text-muted mb-6 max-w-[320px] leading-relaxed">
        An unexpected error occurred. You can try again or head back to the main
        feed.
      </p>

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-lg bg-green text-bg-primary text-sm font-semibold hover:brightness-110 transition-all"
        >
          Try Again
        </button>
        <Link
          href="/swipe"
          className="px-5 py-2.5 rounded-lg bg-bg-elevated border border-border text-text-secondary text-sm font-medium hover:bg-bg-hover transition-all"
        >
          Go Home
        </Link>
      </div>

      <button
        onClick={() => setShowDetails((v) => !v)}
        className="text-[11px] text-text-faint hover:text-text-muted transition-colors"
      >
        {showDetails ? "Hide details" : "Show details"}
      </button>

      {showDetails && (
        <div className="mt-3 w-full max-w-sm bg-bg-card border border-border rounded-lg p-3 text-left">
          <p className="text-[11px] font-mono text-red break-all leading-relaxed">
            {error.message}
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono text-text-faint mt-2">
              Digest: {error.digest}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
