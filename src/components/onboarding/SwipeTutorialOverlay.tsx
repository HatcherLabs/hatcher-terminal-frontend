"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "hatcher_swipe_tutored";

export function SwipeTutorialOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const tutored = localStorage.getItem(STORAGE_KEY);
      if (!tutored) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // localStorage unavailable
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer"
      onClick={dismiss}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") dismiss();
      }}
    >
      {/* Left arrow - PASS */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 animate-pulse-left">
        <svg
          viewBox="0 0 24 24"
          width={40}
          height={40}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-red"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        <span className="text-red text-xs font-bold tracking-wider uppercase">
          Pass
        </span>
      </div>

      {/* Right arrow - BUY */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 animate-pulse-right">
        <svg
          viewBox="0 0 24 24"
          width={40}
          height={40}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-green"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
        <span className="text-green text-xs font-bold tracking-wider uppercase">
          Buy
        </span>
      </div>

      {/* Up arrow - WATCHLIST */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-pulse-up">
        <svg
          viewBox="0 0 24 24"
          width={40}
          height={40}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-amber"
        >
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
        <span className="text-amber text-xs font-bold tracking-wider uppercase">
          Watchlist
        </span>
      </div>

      {/* Center instruction */}
      <div className="flex flex-col items-center gap-6 pointer-events-none">
        <div className="w-20 h-20 rounded-full border-2 border-text-secondary/30 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            width={32}
            height={32}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-text-secondary/60"
          >
            <path d="M18 8V6a2 2 0 00-2-2H4a2 2 0 00-2 2v7a2 2 0 002 2h2" />
            <path d="M22 12v7a2 2 0 01-2 2H10a2 2 0 01-2-2v-7a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
        </div>
        <p className="text-text-secondary text-sm font-medium">
          Swipe cards to trade
        </p>
      </div>

      {/* Bottom tap to dismiss */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
        <p className="text-text-muted/60 text-xs animate-pulse">
          Tap anywhere to dismiss
        </p>
      </div>

      {/* Inline animation keyframes */}
      <style jsx>{`
        @keyframes pulseLeft {
          0%, 100% { transform: translateY(-50%) translateX(0); opacity: 1; }
          50% { transform: translateY(-50%) translateX(-8px); opacity: 0.6; }
        }
        @keyframes pulseRight {
          0%, 100% { transform: translateY(-50%) translateX(0); opacity: 1; }
          50% { transform: translateY(-50%) translateX(8px); opacity: 0.6; }
        }
        @keyframes pulseUp {
          0%, 100% { transform: translateX(-50%) translateY(0); opacity: 1; }
          50% { transform: translateX(-50%) translateY(-8px); opacity: 0.6; }
        }
        .animate-pulse-left { animation: pulseLeft 1.5s ease-in-out infinite; }
        .animate-pulse-right { animation: pulseRight 1.5s ease-in-out infinite; }
        .animate-pulse-up { animation: pulseUp 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
