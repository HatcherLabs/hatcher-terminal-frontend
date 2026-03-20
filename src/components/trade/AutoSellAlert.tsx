"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { create } from "zustand";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

const AUTO_DISMISS_MS = 15_000;
const SLIDE_DURATION_MS = 300;
const MAX_VISIBLE_ALERTS = 5;

// ---------------------------------------------------------------------------
// Data & Store
// ---------------------------------------------------------------------------

export interface AutoSellAlertData {
  positionId: string;
  mintAddress: string;
  tokenTicker: string;
  tokenImageUri?: string | null;
  reason: "take-profit" | "stop-loss";
  pnlPercent: number;
  threshold: number;
  currentPriceSol: number;
  entryPricePerToken: number;
  tokenAmount: number;
}

interface AutoSellAlertStore {
  alerts: AutoSellAlertData[];
  push: (alert: AutoSellAlertData) => void;
  dismiss: (positionId: string) => void;
}

export const useAutoSellAlertStore = create<AutoSellAlertStore>((set) => ({
  alerts: [],
  push: (alert) =>
    set((s) => {
      if (s.alerts.some((a) => a.positionId === alert.positionId)) return s;
      return { alerts: [...s.alerts, alert] };
    }),
  dismiss: (positionId) =>
    set((s) => ({
      alerts: s.alerts.filter((a) => a.positionId !== positionId),
    })),
}));

// ---------------------------------------------------------------------------
// Sound helper
// ---------------------------------------------------------------------------

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 0.3);
    setTimeout(() => ctx.close(), 500);
  } catch {
    // AudioContext may not be available — ignore silently
  }
}

// ---------------------------------------------------------------------------
// Price formatter
// ---------------------------------------------------------------------------

function formatPrice(val: number): string {
  if (val < 0.0001) return val.toExponential(2);
  return val.toFixed(6);
}

// ---------------------------------------------------------------------------
// Root component — renders stacked banners
// ---------------------------------------------------------------------------

export function AutoSellAlert() {
  const alerts = useAutoSellAlertStore((s) => s.alerts);
  const visible = alerts.slice(0, MAX_VISIBLE_ALERTS);

  if (visible.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[120] flex flex-col items-center gap-2 pt-3 px-3 pointer-events-none">
      {visible.map((alert, idx) => (
        <AlertBanner key={alert.positionId} alert={alert} index={idx} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual alert banner
// ---------------------------------------------------------------------------

function AlertBanner({
  alert,
  index,
}: {
  alert: AutoSellAlertData;
  index: number;
}) {
  const dismiss = useAutoSellAlertStore((s) => s.dismiss);
  const addToast = useToast((s) => s.add);
  const [selling, setSelling] = useState(false);
  const [phase, setPhase] = useState<"entering" | "visible" | "exiting">("entering");
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef(Date.now());

  const isTakeProfit = alert.reason === "take-profit";
  const accentColor = isTakeProfit ? "#00d672" : "#f23645";

  // Play sound on mount
  useEffect(() => {
    playBeep();
  }, []);

  // Animate entrance
  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase("visible"));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Progress bar countdown
  useEffect(() => {
    startTimeRef.current = Date.now();

    function tick() {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    }
    animFrameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  // Auto-dismiss timer
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = useCallback(() => {
    setPhase("exiting");
    setTimeout(() => dismiss(alert.positionId), SLIDE_DURATION_MS);
  }, [alert.positionId, dismiss]);

  const handleSell = useCallback(async () => {
    if (selling) return;
    setSelling(true);

    try {
      const res = await api.raw(
        `/api/positions/${alert.positionId}/close?percent=100`,
        { method: "POST" }
      );

      if (!res.ok) {
        addToast("Failed to build sell transaction", "error");
        setSelling(false);
        return;
      }

      const { data } = await res.json();

      const submitRes = await api.raw("/api/tx/submit", {
        method: "POST",
        body: JSON.stringify({
          unsignedTx: data.unsignedTx,
          positionType: "sell",
          mintAddress: alert.mintAddress,
          positionId: alert.positionId,
          sellPercent: 100,
        }),
      });

      if (submitRes.ok) {
        addToast(
          `${isTakeProfit ? "Take-profit" : "Stop-loss"} sell submitted for $${alert.tokenTicker}!`,
          "success"
        );
      } else {
        const err = await submitRes.json();
        addToast(err.error || "Sell failed", "error");
      }
    } catch {
      addToast("Failed to sell position", "error");
    } finally {
      setSelling(false);
      dismiss(alert.positionId);
    }
  }, [alert, selling, addToast, dismiss, isTakeProfit]);

  // Memoize the slide transform style
  const bannerStyle = useMemo(
    () => ({
      transitionDuration: `${SLIDE_DURATION_MS}ms`,
      transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      zIndex: 120 - index,
      border: `1px solid ${isTakeProfit ? "rgba(0,214,114,0.4)" : "rgba(242,54,69,0.4)"}`,
    }),
    [index, isTakeProfit]
  );

  const pnlFormatted = `${alert.pnlPercent >= 0 ? "+" : ""}${alert.pnlPercent.toFixed(1)}%`;

  return (
    <div
      style={bannerStyle}
      className={`pointer-events-auto w-full max-w-[460px] rounded-xl shadow-2xl overflow-hidden transition-all ${
        phase === "entering"
          ? "-translate-y-full opacity-0"
          : phase === "exiting"
            ? "-translate-y-full opacity-0"
            : "translate-y-0 opacity-100"
      }`}
    >
      {/* Glass background */}
      <div className="relative backdrop-blur-md" style={{ background: "rgba(16,19,28,0.93)" }}>
        {/* Accent glow at top */}
        <div
          className="absolute inset-x-0 top-0 h-[1px]"
          style={{ background: accentColor }}
        />

        {/* Content */}
        <div className="px-4 py-3 flex items-center gap-3">
          {/* Icon / Avatar */}
          <div className="flex-shrink-0 relative">
            {alert.tokenImageUri ? (
              <img
                src={alert.tokenImageUri}
                alt={alert.tokenTicker}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold"
                style={{
                  background: isTakeProfit ? "rgba(0,214,114,0.15)" : "rgba(242,54,69,0.15)",
                  color: accentColor,
                }}
              >
                {alert.tokenTicker?.charAt(0) ?? "?"}
              </div>
            )}
            {/* Reason badge */}
            <div
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
              style={{
                background: accentColor,
                color: isTakeProfit ? "#04060b" : "#ffffff",
              }}
            >
              {isTakeProfit ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="7 14 12 9 17 14" />
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="7 10 12 15 17 10" />
                </svg>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: accentColor }}>
                {isTakeProfit ? "Take Profit Hit!" : "Stop Loss Hit!"}
              </span>
              <span className="text-xs font-medium truncate" style={{ color: "#5c6380" }}>
                ${alert.tokenTicker}
              </span>
            </div>

            {/* Price row */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono text-[11px]" style={{ color: "#9ca3b8" }}>
                {formatPrice(alert.entryPricePerToken)}
              </span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#363d54"
                strokeWidth="2"
                strokeLinecap="round"
                className="flex-shrink-0"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
              <span className="font-mono text-[11px]" style={{ color: "#9ca3b8" }}>
                {formatPrice(alert.currentPriceSol)}
              </span>
              <span
                className="font-mono text-[11px] font-bold ml-1"
                style={{ color: alert.pnlPercent >= 0 ? "#00d672" : "#f23645" }}
              >
                {pnlFormatted}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleSell}
              disabled={selling}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-[0.96] disabled:opacity-40"
              style={{
                background: accentColor,
                color: isTakeProfit ? "#04060b" : "#ffffff",
              }}
            >
              {selling ? (
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-full animate-spin"
                    style={{ border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "currentColor" }}
                  />
                  Selling
                </span>
              ) : (
                "Sell Now"
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ background: "rgba(16,19,28,0.6)", color: "#5c6380" }}
              aria-label="Dismiss alert"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress bar — auto-dismiss countdown */}
        <div className="h-[2px] w-full" style={{ background: "rgba(16,19,28,0.4)" }}>
          <div
            className="h-full"
            style={{
              width: `${progress}%`,
              background: isTakeProfit ? "rgba(0,214,114,0.6)" : "rgba(242,54,69,0.6)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
