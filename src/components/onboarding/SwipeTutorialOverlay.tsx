"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "hatcher_swipe_tutored";
const AUTO_DISMISS_MS = 5000;

export function SwipeTutorialOverlay() {
  const [visible, setVisible] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // localStorage unavailable — show tutorial anyway
    }
    setVisible(true);
    // Trigger fade-in on next frame so the transition fires
    requestAnimationFrame(() => setFadeIn(true));
  }, []);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!visible) return;
    timerRef.current = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const dismiss = useCallback(() => {
    setFadeOut(true);
    // Wait for fade-out animation to complete
    setTimeout(() => {
      setVisible(false);
      try {
        localStorage.setItem(STORAGE_KEY, "true");
      } catch {
        // localStorage unavailable
      }
    }, 300);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center cursor-pointer select-none"
      onClick={dismiss}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " " || e.key === "Escape")
          dismiss();
      }}
      style={{
        backgroundColor: "rgba(4, 6, 11, 0.85)",
        opacity: fadeOut ? 0 : fadeIn ? 1 : 0,
        transition: "opacity 0.4s ease",
      }}
    >
      {/* ── Mock card in center ── */}
      <div
        className="pointer-events-none relative flex flex-col items-center"
        style={{ width: 220 }}
      >
        {/* Card */}
        <div
          className="rounded-card w-full flex flex-col items-center gap-3 px-5 py-6"
          style={{
            background: "#0a0d14",
            border: "1px solid #1a1f2e",
            boxShadow:
              "0 4px 24px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
          }}
        >
          {/* Fake logo circle */}
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 44,
              height: 44,
              background: "#10131c",
              border: "1px solid #1a1f2e",
            }}
          >
            <svg
              width={22}
              height={22}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5c6380"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>

          {/* Fake ticker */}
          <span
            className="font-mono text-sm font-semibold"
            style={{ color: "#eef0f6" }}
          >
            TOKEN
          </span>

          {/* Fake price */}
          <span className="font-mono text-xs" style={{ color: "#5c6380" }}>
            $0.00
          </span>

          {/* Fake bar shimmer */}
          <div
            className="w-full rounded-full"
            style={{
              height: 4,
              background:
                "linear-gradient(90deg, #1a1f2e 0%, #2a3048 50%, #1a1f2e 100%)",
            }}
          />
        </div>

        {/* Instruction below card */}
        <p
          className="mt-4 text-center text-sm font-medium"
          style={{ color: "#eef0f6" }}
        >
          Swipe cards to trade
        </p>
      </div>

      {/* ── Left arrow — PASS ── */}
      <div className="absolute left-4 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2 sm:left-8">
        <div className="tutorial-arrow-left flex flex-col items-center gap-1.5">
          <svg
            width={36}
            height={36}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f23645"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: "#f23645" }}
          >
            Pass
          </span>
        </div>
      </div>

      {/* ── Right arrow — BUY ── */}
      <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2 sm:right-8">
        <div className="tutorial-arrow-right flex flex-col items-center gap-1.5">
          <svg
            width={36}
            height={36}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00d672"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: "#00d672" }}
          >
            Buy
          </span>
        </div>
      </div>

      {/* ── Up arrow — DETAILS ── */}
      <div className="absolute left-1/2 top-20 flex -translate-x-1/2 flex-col items-center gap-2 sm:top-28">
        <div className="tutorial-arrow-up flex flex-col items-center gap-1.5">
          <svg
            width={36}
            height={36}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f0a000"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: "#f0a000" }}
          >
            Details
          </span>
        </div>
      </div>

      {/* ── Keyboard shortcuts ── */}
      <div className="absolute bottom-24 left-1/2 flex -translate-x-1/2 items-center gap-5 sm:bottom-32">
        <Shortcut keyLabel="←" label="Pass" />
        <Shortcut keyLabel="→" label="Buy" />
        <Shortcut keyLabel="↑" label="Details" />
      </div>

      {/* ── Tap to dismiss ── */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 sm:bottom-16">
        <p
          className="tutorial-pulse text-xs"
          style={{ color: "#5c6380" }}
        >
          Tap anywhere to dismiss
        </p>
      </div>

      {/* ── Keyframe animations ── */}
      <style>{`
        .tutorial-arrow-left {
          animation: swipeLeft 1.8s ease-in-out infinite;
        }
        .tutorial-arrow-right {
          animation: swipeRight 1.8s ease-in-out infinite;
        }
        .tutorial-arrow-up {
          animation: swipeUp 1.8s ease-in-out infinite;
        }
        .tutorial-pulse {
          animation: tutorialPulse 2s ease-in-out infinite;
        }

        @keyframes swipeLeft {
          0%, 100% { transform: translateX(0); opacity: 1; }
          50% { transform: translateX(-12px); opacity: 0.5; }
        }
        @keyframes swipeRight {
          0%, 100% { transform: translateX(0); opacity: 1; }
          50% { transform: translateX(12px); opacity: 0.5; }
        }
        @keyframes swipeUp {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(-12px); opacity: 0.5; }
        }
        @keyframes tutorialPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ── Keyboard shortcut badge ── */
function Shortcut({ keyLabel, label }: { keyLabel: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <kbd
        className="font-mono flex items-center justify-center rounded"
        style={{
          width: 32,
          height: 28,
          fontSize: 14,
          fontWeight: 600,
          color: "#eef0f6",
          background: "#10131c",
          border: "1px solid #2a3048",
          boxShadow: "0 2px 0 #1a1f2e",
        }}
      >
        {keyLabel}
      </kbd>
      <span className="text-[10px]" style={{ color: "#5c6380" }}>
        {label}
      </span>
    </div>
  );
}
