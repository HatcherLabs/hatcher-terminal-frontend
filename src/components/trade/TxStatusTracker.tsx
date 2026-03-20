"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { create } from "zustand";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types & Store
// ---------------------------------------------------------------------------

export type TxStatus = "signing" | "submitting" | "confirming" | "confirmed" | "failed";

export interface TrackedTx {
  id: string;
  txHash?: string;
  mintAddress?: string;
  tokenTicker?: string;
  type: "buy" | "sell" | "withdraw" | "other";
  status: TxStatus;
  error?: string;
  startedAt: number;
  updatedAt: number;
}

interface TxTrackerStore {
  transactions: TrackedTx[];
  add: (tx: Omit<TrackedTx, "startedAt" | "updatedAt">) => void;
  update: (id: string, patch: Partial<TrackedTx>) => void;
  remove: (id: string) => void;
  clearCompleted: () => void;
}

export const useTxTracker = create<TxTrackerStore>((set) => ({
  transactions: [],
  add: (tx) =>
    set((s) => ({
      transactions: [
        ...s.transactions,
        { ...tx, startedAt: Date.now(), updatedAt: Date.now() },
      ],
    })),
  update: (id, patch) =>
    set((s) => ({
      transactions: s.transactions.map((tx) =>
        tx.id === id ? { ...tx, ...patch, updatedAt: Date.now() } : tx
      ),
    })),
  remove: (id) =>
    set((s) => ({
      transactions: s.transactions.filter((tx) => tx.id !== id),
    })),
  clearCompleted: () =>
    set((s) => ({
      transactions: s.transactions.filter(
        (tx) => tx.status !== "confirmed" && tx.status !== "failed"
      ),
    })),
}));

// ---------------------------------------------------------------------------
// Confirmation poller
// ---------------------------------------------------------------------------

function useConfirmationPoller(tx: TrackedTx) {
  const update = useTxTracker((s) => s.update);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (tx.status !== "confirming" || !tx.txHash) return;

    let attempts = 0;
    const maxAttempts = 30; // ~60 seconds at 2s intervals

    async function poll() {
      attempts++;
      try {
        const res = await api.raw(`/api/tx/status/${tx.txHash}`);
        if (res.ok) {
          const { data } = await res.json();
          if (data.confirmed) {
            update(tx.id, { status: "confirmed" });
            if (intervalRef.current) clearInterval(intervalRef.current);
          } else if (data.failed) {
            update(tx.id, { status: "failed", error: data.error || "Transaction failed" });
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        }
      } catch {
        // Network error, keep polling
      }

      if (attempts >= maxAttempts) {
        update(tx.id, { status: "failed", error: "Confirmation timeout" });
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }

    poll();
    intervalRef.current = setInterval(poll, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tx.id, tx.txHash, tx.status, update]);
}

// ---------------------------------------------------------------------------
// Individual Tx Row
// ---------------------------------------------------------------------------

const statusConfig: Record<TxStatus, { label: string; color: string; bgColor: string }> = {
  signing: { label: "Signing", color: "#f0a000", bgColor: "rgba(240,160,0,0.08)" },
  submitting: { label: "Submitting", color: "#3b82f6", bgColor: "rgba(59,130,246,0.08)" },
  confirming: { label: "Confirming", color: "#8b5cf6", bgColor: "rgba(139,92,246,0.08)" },
  confirmed: { label: "Confirmed", color: "#00d672", bgColor: "rgba(0,214,114,0.08)" },
  failed: { label: "Failed", color: "#f23645", bgColor: "rgba(242,54,69,0.08)" },
};

const typeLabels: Record<TrackedTx["type"], string> = {
  buy: "BUY",
  sell: "SELL",
  withdraw: "WITHDRAW",
  other: "TX",
};

function TxRow({ tx }: { tx: TrackedTx }) {
  const remove = useTxTracker((s) => s.remove);
  useConfirmationPoller(tx);

  const config = statusConfig[tx.status];
  const elapsed = Math.floor((Date.now() - tx.startedAt) / 1000);
  const [elapsedStr, setElapsedStr] = useState(`${elapsed}s`);

  useEffect(() => {
    const interval = setInterval(() => {
      const s = Math.floor((Date.now() - tx.startedAt) / 1000);
      setElapsedStr(`${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [tx.startedAt]);

  const isTerminal = tx.status === "confirmed" || tx.status === "failed";

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all"
      style={{ background: config.bgColor, border: `1px solid ${config.color}20` }}
    >
      {/* Status indicator */}
      <div className="flex-shrink-0">
        {isTerminal ? (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ background: config.color, color: "#04060b" }}
          >
            {tx.status === "confirmed" ? "✓" : "✕"}
          </div>
        ) : (
          <div
            className="w-5 h-5 rounded-full animate-spin"
            style={{
              border: `2px solid ${config.color}40`,
              borderTopColor: config.color,
            }}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{
              color: tx.type === "buy" ? "#00d672" : tx.type === "sell" ? "#f23645" : "#9ca3b8",
              background: tx.type === "buy" ? "rgba(0,214,114,0.1)" : tx.type === "sell" ? "rgba(242,54,69,0.1)" : "rgba(156,163,184,0.1)",
            }}
          >
            {typeLabels[tx.type]}
          </span>
          {tx.tokenTicker && (
            <span className="text-xs font-medium truncate" style={{ color: "#eef0f6" }}>
              ${tx.tokenTicker}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-medium" style={{ color: config.color }}>
            {config.label}
          </span>
          {tx.error && (
            <span className="text-[10px] truncate" style={{ color: "#f23645" }}>
              — {tx.error}
            </span>
          )}
        </div>
      </div>

      {/* Timer + actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] font-mono tabular-nums" style={{ color: "#5c6380" }}>
          {elapsedStr}
        </span>
        {tx.txHash && (
          <a
            href={`https://solscan.io/tx/${tx.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] transition-colors"
            style={{ color: "#5c6380" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#00d672"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#5c6380"; }}
            title="View on Solscan"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        )}
        {isTerminal && (
          <button
            onClick={() => remove(tx.id)}
            className="transition-colors"
            style={{ color: "#5c6380" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#9ca3b8"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#5c6380"; }}
            aria-label="Dismiss"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component — renders as a floating panel
// ---------------------------------------------------------------------------

export function TxStatusTracker() {
  const transactions = useTxTracker((s) => s.transactions);
  const clearCompleted = useTxTracker((s) => s.clearCompleted);

  if (transactions.length === 0) return null;

  const hasCompleted = transactions.some(
    (tx) => tx.status === "confirmed" || tx.status === "failed"
  );

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] w-[320px] max-h-[400px] overflow-y-auto terminal-scrollbar rounded-xl shadow-2xl"
      style={{
        background: "rgba(10,13,20,0.95)",
        border: "1px solid #1a1f2e",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 sticky top-0"
        style={{
          background: "rgba(10,13,20,0.95)",
          borderBottom: "1px solid #1a1f2e",
        }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: "#8b5cf6" }}
          />
          <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "#5c6380" }}>
            Transactions ({transactions.length})
          </span>
        </div>
        {hasCompleted && (
          <button
            onClick={clearCompleted}
            className="text-[10px] transition-colors"
            style={{ color: "#5c6380" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#9ca3b8"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#5c6380"; }}
          >
            Clear done
          </button>
        )}
      </div>

      {/* Transaction list */}
      <div className="p-2 space-y-1.5">
        {transactions.map((tx) => (
          <TxRow key={tx.id} tx={tx} />
        ))}
      </div>
    </div>
  );
}
