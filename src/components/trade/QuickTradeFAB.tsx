"use client";

import { useQuickTrade } from "@/components/providers/QuickTradeProvider";

export function QuickTradeFAB() {
  const { selectedToken, isOpen, togglePanel } = useQuickTrade();

  // Only show when a token is selected and the panel is not already open
  if (!selectedToken || isOpen) return null;

  return (
    <button
      onClick={togglePanel}
      className="
        fixed z-40
        bottom-20 right-4
        md:bottom-6 md:right-6
        w-14 h-14 rounded-full
        flex items-center justify-center
        transition-all duration-200
        hover:scale-105
        active:scale-95
        animate-pulse-fab
      "
      style={{
        background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
        color: "#ffffff",
        boxShadow: "0 0 25px rgba(139,92,246,0.3), 0 0 50px rgba(139,92,246,0.1), 0 8px 20px rgba(0,0,0,0.3)",
      }}
      aria-label={`Quick trade ${selectedToken.ticker}`}
      title={`Quick trade ${selectedToken.ticker}`}
    >
      {/* Lightning bolt icon */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.3))" }}
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>

      {/* Ticker badge */}
      <span
        className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono leading-none"
        style={{
          background: "#0d1017",
          border: "1px solid rgba(139, 92, 246, 0.3)",
          color: "#c4b5fd",
          boxShadow: "0 0 8px rgba(139, 92, 246, 0.15)",
        }}
      >
        ${selectedToken.ticker}
      </span>
    </button>
  );
}
