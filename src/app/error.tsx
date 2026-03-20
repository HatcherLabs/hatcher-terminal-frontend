"use client";

import { useState } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-4 text-center"
      style={{ background: "#06080e" }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>

      <h1 className="text-xl font-bold mb-2" style={{ color: "#f0f2f7" }}>
        Critical Error
      </h1>
      <p className="text-sm mb-6 max-w-[360px] leading-relaxed" style={{ color: "#5c6380" }}>
        Hatcher Terminal encountered an unexpected error. This has been logged automatically.
      </p>

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: "linear-gradient(135deg, #22c55e 0%, #00b060 100%)",
            color: "#06080e",
          }}
        >
          Reload App
        </button>
        <button
          onClick={() => window.location.assign("/swipe")}
          className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{ background: "#141820", color: "#8890a4", border: "1px solid #1c2030" }}
        >
          Go Home
        </button>
      </div>

      <button
        onClick={() => setShowDetails((v) => !v)}
        className="text-[11px] transition-colors"
        style={{ color: "#444c60" }}
      >
        {showDetails ? "Hide details" : "Show error details"}
      </button>

      {showDetails && (
        <div
          className="mt-3 w-full max-w-md rounded-lg p-3 text-left"
          style={{ background: "#0d1017", border: "1px solid #1c2030" }}
        >
          <p className="text-[11px] font-mono break-all leading-relaxed" style={{ color: "#ef4444" }}>
            {error.message}
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono mt-2" style={{ color: "#444c60" }}>
              Digest: {error.digest}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
