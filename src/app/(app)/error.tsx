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
        style={{ background: "rgba(242,54,69,0.1)" }}
      >
        <svg
          viewBox="0 0 24 24"
          width={28}
          height={28}
          fill="none"
          stroke="#f23645"
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
        style={{ color: "#eef0f6" }}
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
            background: "linear-gradient(135deg, #00d672 0%, #00b060 100%)",
            color: "#04060b",
            boxShadow: "0 0 16px rgba(0,214,114,0.2)",
          }}
        >
          Try Again
        </button>
        <Link
          href="/swipe"
          className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all no-underline"
          style={{
            background: "#10131c",
            color: "#9ca3b8",
            border: "1px solid #1a1f2e",
          }}
        >
          Go Home
        </Link>
      </div>

      <button
        onClick={() => setShowDetails((v) => !v)}
        className="text-[11px] transition-colors"
        style={{ color: "#363d54" }}
      >
        {showDetails ? "Hide details" : "Show details"}
      </button>

      {showDetails && (
        <div
          className="mt-3 w-full max-w-sm rounded-lg p-3 text-left"
          style={{ background: "#0a0d14", border: "1px solid #1a1f2e" }}
        >
          <p
            className="text-[11px] font-mono break-all leading-relaxed"
            style={{ color: "#f23645" }}
          >
            {error.message}
          </p>
          {error.digest && (
            <p
              className="text-[10px] font-mono mt-2"
              style={{ color: "#363d54" }}
            >
              Digest: {error.digest}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
