"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { create } from "zustand";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

const AUTO_DISMISS_MS = 30_000;

export interface AutoSellAlertData {
  positionId: string;
  mintAddress: string;
  tokenTicker: string;
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
      // Deduplicate by positionId
      if (s.alerts.some((a) => a.positionId === alert.positionId)) return s;
      return { alerts: [...s.alerts, alert] };
    }),
  dismiss: (positionId) =>
    set((s) => ({
      alerts: s.alerts.filter((a) => a.positionId !== positionId),
    })),
}));

export function AutoSellAlert() {
  const alerts = useAutoSellAlertStore((s) => s.alerts);
  const current = alerts[0] ?? null;

  if (!current) return null;

  return <AutoSellAlertModal alert={current} />;
}

function AutoSellAlertModal({ alert }: { alert: AutoSellAlertData }) {
  const dismiss = useAutoSellAlertStore((s) => s.dismiss);
  const addToast = useToast((s) => s.add);
  const [selling, setSelling] = useState(false);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Auto-dismiss after 30s
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      dismiss(alert.positionId);
    }, AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [alert.positionId, dismiss]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => dismiss(alert.positionId), 200);
  }, [alert.positionId, dismiss]);

  const handleSell = useCallback(async () => {
    if (selling) return;
    setSelling(true);

    try {
      // Build close transaction
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

      // Submit for server-side signing
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
          `${alert.reason === "take-profit" ? "Take-profit" : "Stop-loss"} sell submitted for $${alert.tokenTicker}!`,
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
  }, [alert, selling, addToast, dismiss]);

  const isTakeProfit = alert.reason === "take-profit";
  const accentColor = isTakeProfit ? "green" : "red";

  return (
    <div
      className={`fixed inset-0 z-[110] flex items-center justify-center transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div
        className={`relative w-[340px] max-w-[90vw] bg-bg-card border rounded-xl shadow-2xl overflow-hidden transition-all duration-200 ${
          visible ? "scale-100 translate-y-0" : "scale-95 translate-y-2"
        } ${
          isTakeProfit ? "border-green/30" : "border-red/30"
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 py-3 flex items-center gap-2 ${
            isTakeProfit ? "bg-green/10" : "bg-red/10"
          }`}
        >
          <span className="text-lg">
            {isTakeProfit ? "\u2B06" : "\u2B07"}
          </span>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${isTakeProfit ? "text-green" : "text-red"}`}>
              {isTakeProfit ? "Take-Profit Triggered" : "Stop-Loss Triggered"}
            </p>
            <p className="text-xs text-text-muted">
              ${alert.tokenTicker}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
            aria-label="Dismiss alert"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          {/* P&L vs Threshold */}
          <div className="bg-bg-elevated rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-muted">Current P&L</span>
              <span
                className={`font-mono font-bold text-sm ${
                  alert.pnlPercent >= 0 ? "text-green" : "text-red"
                }`}
              >
                {alert.pnlPercent >= 0 ? "+" : ""}
                {alert.pnlPercent.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-muted">Threshold</span>
              <span className={`font-mono font-semibold ${isTakeProfit ? "text-green" : "text-red"}`}>
                {isTakeProfit ? "+" : "-"}
                {Math.abs(alert.threshold).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-muted">Entry price</span>
              <span className="font-mono text-text-secondary">
                {alert.entryPricePerToken < 0.0001
                  ? alert.entryPricePerToken.toExponential(2)
                  : alert.entryPricePerToken.toFixed(6)}{" "}
                SOL
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-muted">Current price</span>
              <span className="font-mono text-text-secondary">
                {alert.currentPriceSol < 0.0001
                  ? alert.currentPriceSol.toExponential(2)
                  : alert.currentPriceSol.toFixed(6)}{" "}
                SOL
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-muted">Token amount</span>
              <span className="font-mono text-text-secondary">
                {alert.tokenAmount >= 1_000_000
                  ? `${(alert.tokenAmount / 1_000_000).toFixed(1)}M`
                  : alert.tokenAmount >= 1_000
                    ? `${(alert.tokenAmount / 1_000).toFixed(1)}K`
                    : alert.tokenAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-bg-elevated border border-border text-text-secondary hover:text-text-primary transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={handleSell}
              disabled={selling}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-40 ${
                isTakeProfit
                  ? "bg-green text-bg-primary hover:brightness-110"
                  : "bg-red text-white hover:brightness-110"
              }`}
            >
              {selling ? (
                <span className="flex items-center justify-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  Selling...
                </span>
              ) : (
                "Sell Now"
              )}
            </button>
          </div>

          {/* Auto-dismiss hint */}
          <p className="text-[10px] text-text-faint text-center">
            Auto-dismisses in 30 seconds
          </p>
        </div>
      </div>
    </div>
  );
}
