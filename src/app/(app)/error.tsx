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
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
        style={{ background: "rgba(239,68,68,0.1)" }}
      >
        <svg
          viewBox="0 0 24 24"
          width={28}
          height={28}
          fill="none"
          stroke="#ef4444"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h1
        className="text-lg font-bold mb-2"
        style={{ color: "#f0f2f7" }}
      >
        Something went wrong
      </h1>
      <p
        className="text-sm mb-6 max-w-[320px] leading-relaxed"
        style={{ color: "#5c6380" }}
      >
        An unexpected error occurred. You can try again or head back to the main
        feed.
      </p>

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: "linear-gradient(135deg, #22c55e 0%, #00b060 100%)",
            color: "#06080e",
            boxShadow: "0 0 16px rgba(34,197,94,0.2)",
          }}
        >
          Try Again
        </button>
        <Link
          href="/swipe"
          className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all no-underline"
          style={{
            background: "#141820",
            color: "#8890a4",
            border: "1px solid #1c2030",
          }}
        >
          Go Home
        </Link>
      </div>

      <button
        onClick={() => setShowDetails((v) => !v)}
        className="text-[11px] transition-colors"
        style={{ color: "#444c60" }}
      >
        {showDetails ? "Hide details" : "Show details"}
      </button>

      {showDetails && (
        <div
          className="mt-3 w-full max-w-sm rounded-lg p-3 text-left"
          style={{ background: "#0d1017", border: "1px solid #1c2030" }}
        >
          <p
            className="text-[11px] font-mono break-all leading-relaxed"
            style={{ color: "#ef4444" }}
          >
            {error.message}
          </p>
          {error.digest && (
            <p
              className="text-[10px] font-mono mt-2"
              style={{ color: "#444c60" }}
            >
              Digest: {error.digest}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
