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
        shadow-lg
        flex items-center justify-center
        transition-all duration-200
        hover:scale-105 hover:shadow-xl
        active:scale-95
        animate-pulse-fab
      "
      style={{ background: "#8b5cf6", color: "#ffffff", boxShadow: "0 10px 15px rgba(139,92,246,0.25)" }}
      aria-label={`Quick trade ${selectedToken.ticker}`}
      title={`Quick trade ${selectedToken.ticker}`}
    >
      {/* Lightning bolt icon */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="drop-shadow-sm"
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>

      {/* Ticker badge */}
      <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono leading-none shadow-sm" style={{ background: "#0a0d14", border: "1px solid #1a1f2e", color: "#eef0f6" }}>
        ${selectedToken.ticker}
      </span>
    </button>
  );
}
