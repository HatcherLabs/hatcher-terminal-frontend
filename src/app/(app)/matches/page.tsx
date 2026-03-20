"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { PortfolioChart } from "@/components/positions/PortfolioChart";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useToast } from "@/components/ui/Toast";
import { useKey } from "@/components/providers/KeyProvider";
import { api } from "@/lib/api";
import { exportTradeHistoryCSV, exportPortfolioCSV } from "@/lib/csv-export";
import type { PositionData } from "@/types/position";

/* ──────────────────────── Types ──────────────────────── */

type Tab = "positions" | "history" | "analytics";
type SortKey = "pnl" | "size" | "duration";
type SortDir = "asc" | "desc";

interface Position {
  id: string;
  mintAddress: string;
  entrySol: number;
  entryTokenAmount: number;
  entryPricePerToken: number;
  entryTimestamp?: string;
  currentPriceSol: number | null;
  pnlPercent: number | null;
  pnlSol: number | null;
  status: string;
  token: {
    name: string;
    ticker: string;
    imageUri: string | null;
  };
}

interface ClosedPosition {
  id: string;
  mintAddress: string;
  entrySol: number;
  exitSol: number | null;
  entryPricePerToken: number;
  exitPricePerToken: number | null;
  entryTimestamp: string;
  exitTimestamp: string | null;
  pnlSol: number | null;
  pnlPercent: number | null;
  status: string;
  token: {
    name: string;
    ticker: string;
    imageUri: string | null;
  };
}

interface WalletAnalytics {
  totalPnlSol: number;
  winRate: number;
  totalTrades: number;
  bestTradeSol: number;
  worstTradeSol?: number;
  avgHoldTimeMs: number;
}

interface AutoSellSettings {
  autoSellProfitPct: number | null;
  stopLossPct: number | null;
}

/* ──────────────────────── Helpers ──────────────────────── */

function computePnl(pos: Position) {
  let pnlPercent = pos.pnlPercent;
  let pnlSol = pos.pnlSol;
  if (
    pnlPercent === null &&
    pos.entryPricePerToken > 0 &&
    pos.currentPriceSol !== null
  ) {
    pnlPercent =
      ((pos.currentPriceSol - pos.entryPricePerToken) /
        pos.entryPricePerToken) *
      100;
  }
  if (pnlSol === null && pnlPercent !== null) {
    pnlSol = pos.entrySol * (pnlPercent / 100);
  }
  return { pnlPercent: pnlPercent ?? 0, pnlSol: pnlSol ?? 0 };
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "--";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "< 1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function formatDurationFromEntry(entry: string | undefined): string {
  if (!entry) return "--";
  return formatDuration(Date.now() - new Date(entry).getTime());
}

function durationMs(entry: string | undefined): number {
  if (!entry) return 0;
  return Date.now() - new Date(entry).getTime();
}

function formatDate(timestamp: string | null): string {
  if (!timestamp) return "--";
  const d = new Date(timestamp);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(timestamp: string | null): string {
  if (!timestamp) return "--";
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) {
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function pnlColor(value: number): string {
  return value >= 0 ? "#00d672" : "#f23645";
}

function pnlClass(value: number): string {
  return value >= 0 ? "text-green" : "text-red";
}

function pnlSign(value: number): string {
  return value >= 0 ? "+" : "";
}

/* ──────────────────────── Sell Spinner ──────────────────────── */

function SellSpinner() {
  return (
    <svg className="animate-spin h-3 w-3 mx-auto" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/* ──────────────────────── Portfolio Summary Header ──────────────────────── */

function PortfolioSummaryHeader({
  positions,
  analytics,
  analyticsLoading,
  closedPositions,
}: {
  positions: Position[];
  analytics: WalletAnalytics | null;
  analyticsLoading: boolean;
  closedPositions: ClosedPosition[];
}) {
  const totalUnrealized = positions.reduce((s, p) => s + computePnl(p).pnlSol, 0);
  const realizedPnl = analytics?.totalPnlSol ?? 0;
  const totalPnl = realizedPnl + totalUnrealized;

  // Approximate USD (placeholder rate)
  const solUsdRate = 150;
  const totalPnlUsd = totalPnl * solUsdRate;

  // Today's PnL: sum of closed positions exited today + current unrealized
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayClosedPnl = closedPositions
    .filter((p) => p.exitTimestamp && new Date(p.exitTimestamp).getTime() >= todayStart.getTime())
    .reduce((s, p) => s + (p.pnlSol ?? 0), 0);
  const todayPnl = todayClosedPnl + totalUnrealized;
  const todayPnlUsd = todayPnl * solUsdRate;

  const winRate = analytics?.winRate ?? 0;

  // Best / worst trades
  const bestTrade = analytics?.bestTradeSol ?? 0;
  const losses = closedPositions.filter((p) => (p.pnlSol ?? 0) < 0);
  const worstTrade = analytics?.worstTradeSol ?? (losses.length > 0 ? Math.min(...losses.map((p) => p.pnlSol ?? 0)) : 0);

  const stats = [
    {
      label: "Total PnL",
      primary: `${pnlSign(totalPnl)}${totalPnl.toFixed(4)} SOL`,
      secondary: `~$${Math.abs(totalPnlUsd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      color: pnlColor(totalPnl),
    },
    {
      label: "Today",
      primary: `${pnlSign(todayPnl)}${todayPnl.toFixed(4)} SOL`,
      secondary: `~$${Math.abs(todayPnlUsd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      color: pnlColor(todayPnl),
    },
    {
      label: "Win Rate",
      primary: analyticsLoading ? null : `${winRate.toFixed(1)}%`,
      secondary: analyticsLoading ? null : `${analytics?.totalTrades ?? 0} trades`,
      color: winRate >= 50 ? "#00d672" : "#f23645",
    },
    {
      label: "Best Trade",
      primary: analyticsLoading ? null : `${pnlSign(bestTrade)}${bestTrade.toFixed(4)}`,
      secondary: "SOL",
      color: "#00d672",
    },
    {
      label: "Worst Trade",
      primary: analyticsLoading ? null : `${worstTrade.toFixed(4)}`,
      secondary: "SOL",
      color: "#f23645",
    },
  ];

  return (
    <div
      style={{ background: "#0a0d14", border: "1px solid #1a1f2e", borderRadius: 8 }}
      className="px-2 py-2.5 flex items-stretch gap-0 overflow-x-auto"
    >
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className="flex-1 min-w-0 px-3 flex flex-col justify-center"
          style={i < stats.length - 1 ? { borderRight: "1px solid #1a1f2e" } : undefined}
        >
          <p style={{ color: "#5c6380" }} className="text-[9px] uppercase tracking-wider font-medium mb-0.5 whitespace-nowrap">
            {stat.label}
          </p>
          {stat.primary === null ? (
            <Skeleton className="h-4 w-16 rounded" />
          ) : (
            <p className="font-mono text-xs font-bold whitespace-nowrap" style={{ color: stat.color }}>
              {stat.primary}
            </p>
          )}
          {stat.secondary === null ? (
            <Skeleton className="h-3 w-10 rounded mt-0.5" />
          ) : (
            <p className="font-mono text-[10px] whitespace-nowrap" style={{ color: "#5c6380" }}>
              {stat.secondary}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────── Positions Table ──────────────────────── */

function PositionsTable({
  positions,
  sortKey,
  sortDir,
  onSort,
  onClose,
}: {
  positions: Position[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onClose: (id: string, pct: number) => Promise<void>;
}) {
  const [sellingState, setSellingState] = useState<{ id: string; pct: number } | null>(null);

  const sorted = useMemo(() => {
    const arr = [...positions];
    arr.sort((a, b) => {
      let av: number, bv: number;
      switch (sortKey) {
        case "pnl":
          av = computePnl(a).pnlPercent;
          bv = computePnl(b).pnlPercent;
          break;
        case "size":
          av = a.entrySol;
          bv = b.entrySol;
          break;
        case "duration":
          av = durationMs(a.entryTimestamp);
          bv = durationMs(b.entryTimestamp);
          break;
        default:
          av = 0;
          bv = 0;
      }
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return arr;
  }, [positions, sortKey, sortDir]);

  const handleSell = async (id: string, pct: number) => {
    setSellingState({ id, pct });
    try {
      await onClose(id, pct);
    } finally {
      setSellingState(null);
    }
  };

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <button
      onClick={() => onSort(k)}
      className="flex items-center gap-0.5 text-[10px] uppercase tracking-wider font-medium hover:opacity-80 transition-opacity"
      style={{ color: sortKey === k ? "#eef0f6" : "#5c6380" }}
    >
      {label}
      {sortKey === k && (
        <span className="text-[8px]">{sortDir === "desc" ? "\u25BC" : "\u25B2"}</span>
      )}
    </button>
  );

  if (positions.length === 0) {
    return null;
  }

  return (
    <div style={{ background: "#0a0d14", border: "1px solid #1a1f2e", borderRadius: 8 }} className="overflow-hidden">
      {/* Table header */}
      <div
        className="grid gap-2 px-3 py-2 border-b"
        style={{
          gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr auto",
          borderColor: "#1a1f2e",
          background: "#10131c",
        }}
      >
        <span style={{ color: "#5c6380" }} className="text-[10px] uppercase tracking-wider font-medium">Token</span>
        <span style={{ color: "#5c6380" }} className="text-[10px] uppercase tracking-wider font-medium text-right">Entry</span>
        <span style={{ color: "#5c6380" }} className="text-[10px] uppercase tracking-wider font-medium text-right">Current</span>
        <div className="text-right"><SortHeader label="P&L %" k="pnl" /></div>
        <div className="text-right"><SortHeader label="Unreal. PnL" k="size" /></div>
        <div className="text-right"><SortHeader label="Age" k="duration" /></div>
        <span style={{ color: "#5c6380" }} className="text-[10px] uppercase tracking-wider font-medium text-right">Actions</span>
      </div>

      {/* Rows */}
      {sorted.map((pos) => {
        const { pnlPercent, pnlSol } = computePnl(pos);
        const isPositive = pnlPercent >= 0;
        const currentPrice = pos.currentPriceSol ?? pos.entryPricePerToken;
        const isSelling = sellingState?.id === pos.id;

        return (
          <div
            key={pos.id}
            className="grid gap-2 px-3 py-2.5 items-center border-b transition-colors hover:bg-[#10131c]/50"
            style={{
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr auto",
              borderColor: "#1a1f2e",
              borderLeft: `2px solid ${pnlColor(pnlPercent)}`,
            }}
          >
            {/* Token */}
            <div className="flex items-center gap-2 min-w-0">
              <TokenAvatar
                mintAddress={pos.mintAddress}
                imageUri={pos.token.imageUri}
                size={28}
                ticker={pos.token.ticker}
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: "#eef0f6" }}>
                  ${pos.token.ticker}
                </p>
                <p className="text-[10px] truncate" style={{ color: "#5c6380" }}>
                  {pos.entrySol.toFixed(3)} SOL
                </p>
              </div>
            </div>

            {/* Entry price */}
            <p className="font-mono text-[11px] text-right" style={{ color: "#9ca3b8" }}>
              {pos.entryPricePerToken < 0.0001
                ? pos.entryPricePerToken.toExponential(2)
                : pos.entryPricePerToken.toFixed(6)}
            </p>

            {/* Current price */}
            <p className="font-mono text-[11px] text-right" style={{ color: "#eef0f6" }}>
              {currentPrice < 0.0001
                ? currentPrice.toExponential(2)
                : currentPrice.toFixed(6)}
            </p>

            {/* P&L % */}
            <p className="font-mono text-[11px] font-bold text-right" style={{ color: pnlColor(pnlPercent) }}>
              {pnlSign(pnlPercent)}{pnlPercent.toFixed(1)}%
            </p>

            {/* P&L SOL */}
            <p className="font-mono text-[11px] font-bold text-right" style={{ color: pnlColor(pnlSol) }}>
              {pnlSign(pnlSol)}{pnlSol.toFixed(4)}
            </p>

            {/* Duration */}
            <p className="font-mono text-[11px] text-right" style={{ color: "#9ca3b8" }}>
              {formatDurationFromEntry(pos.entryTimestamp)}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {[25, 50, 100].map((pct) => (
                <button
                  key={pct}
                  disabled={isSelling}
                  onClick={() => handleSell(pos.id, pct)}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium transition-colors disabled:opacity-40"
                  style={{
                    background: pct === 100 ? "rgba(242, 54, 69, 0.15)" : "rgba(255,255,255,0.05)",
                    color: pct === 100 ? "#f23645" : "#9ca3b8",
                    border: `1px solid ${pct === 100 ? "rgba(242, 54, 69, 0.3)" : "#1a1f2e"}`,
                  }}
                >
                  {isSelling && sellingState.pct === pct ? <SellSpinner /> : pct === 100 ? "Close All" : `Close ${pct}%`}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ──────────────────────── Mobile Position Card ──────────────────────── */

function MobilePositionCard({
  position,
  onClose,
}: {
  position: Position;
  onClose: (id: string, pct: number) => Promise<void>;
}) {
  const [sellingPct, setSellingPct] = useState<number | null>(null);
  const [showActions, setShowActions] = useState(false);
  const { pnlPercent, pnlSol } = computePnl(position);
  const currentPrice = position.currentPriceSol ?? position.entryPricePerToken;

  const handleSell = async (pct: number) => {
    setSellingPct(pct);
    try {
      await onClose(position.id, pct);
    } finally {
      setSellingPct(null);
    }
  };

  return (
    <div
      style={{
        background: "#0a0d14",
        border: "1px solid #1a1f2e",
        borderLeft: `2px solid ${pnlColor(pnlPercent)}`,
        borderRadius: 8,
      }}
      className="p-3"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <TokenAvatar
          mintAddress={position.mintAddress}
          imageUri={position.token.imageUri}
          size={32}
          ticker={position.token.ticker}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: "#eef0f6" }}>
            ${position.token.ticker}
          </p>
          <p className="text-[10px] truncate" style={{ color: "#5c6380" }}>
            {position.token.name}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm font-bold" style={{ color: pnlColor(pnlPercent) }}>
            {pnlSign(pnlPercent)}{pnlPercent.toFixed(1)}%
          </p>
          <p className="font-mono text-[10px]" style={{ color: pnlColor(pnlSol), opacity: 0.8 }}>
            {pnlSign(pnlSol)}{pnlSol.toFixed(4)} SOL
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 text-[10px] font-mono mb-2">
        <div>
          <p style={{ color: "#5c6380" }}>Entry</p>
          <p style={{ color: "#9ca3b8" }}>
            {position.entryPricePerToken < 0.0001
              ? position.entryPricePerToken.toExponential(2)
              : position.entryPricePerToken.toFixed(6)}
          </p>
        </div>
        <div>
          <p style={{ color: "#5c6380" }}>Current</p>
          <p style={{ color: "#eef0f6" }}>
            {currentPrice < 0.0001
              ? currentPrice.toExponential(2)
              : currentPrice.toFixed(6)}
          </p>
        </div>
        <div>
          <p style={{ color: "#5c6380" }}>Size</p>
          <p style={{ color: "#9ca3b8" }}>{position.entrySol.toFixed(3)}</p>
        </div>
        <div>
          <p style={{ color: "#5c6380" }}>Unreal. PnL</p>
          <p style={{ color: pnlColor(pnlSol) }}>{pnlSign(pnlSol)}{pnlSol.toFixed(4)}</p>
        </div>
        <div>
          <p style={{ color: "#5c6380" }}>Age</p>
          <p style={{ color: "#9ca3b8" }}>{formatDurationFromEntry(position.entryTimestamp)}</p>
        </div>
      </div>

      {/* Sell toggle & buttons */}
      <button
        onClick={() => setShowActions((p) => !p)}
        className="w-full py-1 text-[10px] font-medium transition-colors"
        style={{ color: "#5c6380" }}
      >
        {showActions ? "Hide" : "Quick Sell..."}
      </button>
      {showActions && (
        <div className="grid grid-cols-3 gap-2 mt-1.5">
          {[25, 50, 100].map((pct) => (
            <button
              key={pct}
              disabled={sellingPct !== null}
              onClick={() => handleSell(pct)}
              className="py-1.5 rounded text-[11px] font-mono font-medium transition-colors disabled:opacity-40"
              style={{
                background: pct === 100 ? "rgba(242, 54, 69, 0.15)" : "rgba(255,255,255,0.05)",
                color: pct === 100 ? "#f23645" : "#9ca3b8",
                border: `1px solid ${pct === 100 ? "rgba(242, 54, 69, 0.3)" : "#1a1f2e"}`,
              }}
            >
              {sellingPct === pct ? <SellSpinner /> : pct === 100 ? "Close All" : `Sell ${pct}%`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── Trade History Table ──────────────────────── */

function TradeHistorySection({
  positions,
  loading,
}: {
  positions: ClosedPosition[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <EmptyState
        icon={
          <svg viewBox="0 0 24 24" width={48} height={48} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
          </svg>
        }
        title="No closed trades yet"
        description="Your trade history will appear here once you close a position."
      />
    );
  }

  const handleExport = () => {
    const mapped: PositionData[] = positions.map((p) => ({
      id: p.id,
      mintAddress: p.mintAddress,
      tokenName: p.token.name,
      tokenTicker: p.token.ticker,
      tokenImageUri: p.token.imageUri,
      entrySol: p.entrySol,
      entryTokenAmount: 0,
      entryPricePerToken: p.entryPricePerToken,
      entryTimestamp: p.entryTimestamp,
      exitSol: p.exitSol,
      exitPricePerToken: p.exitPricePerToken,
      exitTimestamp: p.exitTimestamp,
      status: p.status as PositionData["status"],
      currentPriceSol: null,
      pnlPercent: p.pnlPercent,
      pnlSol: p.pnlSol,
    }));
    exportTradeHistoryCSV(mapped);
  };

  const totalRealized = positions.reduce((s, p) => s + (p.pnlSol ?? 0), 0);
  const wins = positions.filter((p) => (p.pnlSol ?? 0) >= 0).length;
  const losses = positions.length - wins;

  return (
    <div>
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold" style={{ color: "#eef0f6" }}>
            {positions.length} trades
          </span>
          <span className="font-mono text-[10px]" style={{ color: "#00d672" }}>{wins}W</span>
          <span className="font-mono text-[10px]" style={{ color: "#f23645" }}>{losses}L</span>
          <span className="font-mono text-xs font-bold" style={{ color: pnlColor(totalRealized) }}>
            {pnlSign(totalRealized)}{totalRealized.toFixed(4)} SOL
          </span>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors"
          style={{
            background: "rgba(255,255,255,0.05)",
            color: "#9ca3b8",
            border: "1px solid #1a1f2e",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block" style={{ background: "#0a0d14", border: "1px solid #1a1f2e", borderRadius: 8 }}>
        {/* Header */}
        <div
          className="grid gap-2 px-3 py-2 border-b"
          style={{
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
            borderColor: "#1a1f2e",
            background: "#10131c",
            borderRadius: "8px 8px 0 0",
          }}
        >
          {["Token", "Entry", "Exit", "P&L SOL", "P&L %", "Closed"].map((h) => (
            <span key={h} style={{ color: "#5c6380" }} className="text-[10px] uppercase tracking-wider font-medium text-right first:text-left">
              {h}
            </span>
          ))}
        </div>

        {positions.map((pos) => {
          const pnl = pos.pnlSol ?? 0;
          const pnlPct = pos.pnlPercent ?? 0;
          const isWin = pnl >= 0;

          return (
            <div
              key={pos.id}
              className="grid gap-2 px-3 py-2 items-center border-b transition-colors"
              style={{
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
                borderColor: "#1a1f2e",
                borderLeft: `2px solid ${isWin ? "#00d672" : "#f23645"}`,
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <TokenAvatar
                  mintAddress={pos.mintAddress}
                  imageUri={pos.token.imageUri}
                  size={24}
                  ticker={pos.token.ticker}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold" style={{ color: "#eef0f6" }}>
                      ${pos.token.ticker}
                    </span>
                    <span
                      className="text-[9px] font-mono font-bold px-1 py-0.5 rounded"
                      style={{
                        background: isWin ? "rgba(0, 214, 114, 0.15)" : "rgba(242, 54, 69, 0.15)",
                        color: isWin ? "#00d672" : "#f23645",
                      }}
                    >
                      {isWin ? "WIN" : "LOSS"}
                    </span>
                  </div>
                </div>
              </div>
              <p className="font-mono text-[11px] text-right" style={{ color: "#9ca3b8" }}>
                {pos.entrySol.toFixed(4)}
              </p>
              <p className="font-mono text-[11px] text-right" style={{ color: "#9ca3b8" }}>
                {pos.exitSol !== null ? pos.exitSol.toFixed(4) : "--"}
              </p>
              <p className="font-mono text-[11px] font-bold text-right" style={{ color: pnlColor(pnl) }}>
                {pnlSign(pnl)}{pnl.toFixed(4)}
              </p>
              <p className="font-mono text-[11px] font-bold text-right" style={{ color: pnlColor(pnlPct) }}>
                {pnlSign(pnlPct)}{pnlPct.toFixed(1)}%
              </p>
              <p className="font-mono text-[10px] text-right" style={{ color: "#5c6380" }}>
                {formatDateShort(pos.exitTimestamp)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {positions.map((pos) => {
          const pnl = pos.pnlSol ?? 0;
          const pnlPct = pos.pnlPercent ?? 0;
          const isWin = pnl >= 0;
          const held =
            pos.exitTimestamp && pos.entryTimestamp
              ? formatDuration(new Date(pos.exitTimestamp).getTime() - new Date(pos.entryTimestamp).getTime())
              : "--";

          return (
            <div
              key={pos.id}
              style={{
                background: "#0a0d14",
                border: "1px solid #1a1f2e",
                borderLeft: `2px solid ${isWin ? "#00d672" : "#f23645"}`,
                borderRadius: 8,
              }}
              className="p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <TokenAvatar
                  mintAddress={pos.mintAddress}
                  imageUri={pos.token.imageUri}
                  size={28}
                  ticker={pos.token.ticker}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold" style={{ color: "#eef0f6" }}>
                      ${pos.token.ticker}
                    </span>
                    <span
                      className="text-[9px] font-mono font-bold px-1 py-0.5 rounded"
                      style={{
                        background: isWin ? "rgba(0, 214, 114, 0.15)" : "rgba(242, 54, 69, 0.15)",
                        color: isWin ? "#00d672" : "#f23645",
                      }}
                    >
                      {isWin ? "WIN" : "LOSS"}
                    </span>
                  </div>
                  <p className="text-[10px]" style={{ color: "#5c6380" }}>
                    {formatDate(pos.exitTimestamp)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-bold" style={{ color: pnlColor(pnlPct) }}>
                    {pnlSign(pnlPct)}{pnlPct.toFixed(1)}%
                  </p>
                  <p className="font-mono text-[10px]" style={{ color: pnlColor(pnl), opacity: 0.8 }}>
                    {pnlSign(pnl)}{pnl.toFixed(4)} SOL
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                <div>
                  <p style={{ color: "#5c6380" }}>Entry</p>
                  <p style={{ color: "#9ca3b8" }}>{pos.entrySol.toFixed(4)} SOL</p>
                </div>
                <div>
                  <p style={{ color: "#5c6380" }}>Exit</p>
                  <p style={{ color: "#9ca3b8" }}>{pos.exitSol !== null ? `${pos.exitSol.toFixed(4)} SOL` : "--"}</p>
                </div>
                <div>
                  <p style={{ color: "#5c6380" }}>Held</p>
                  <p style={{ color: "#9ca3b8" }}>{held}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────── Analytics Tab ──────────────────────── */

function AnalyticsSection({
  analytics,
  loading,
  closedPositions,
}: {
  analytics: WalletAnalytics | null;
  loading: boolean;
  closedPositions: ClosedPosition[];
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-xs" style={{ color: "#5c6380" }}>No analytics data available yet.</p>
      </div>
    );
  }

  const wins = closedPositions.filter((p) => (p.pnlSol ?? 0) >= 0);
  const losses = closedPositions.filter((p) => (p.pnlSol ?? 0) < 0);
  const avgWin = wins.length > 0 ? wins.reduce((s, p) => s + (p.pnlSol ?? 0), 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, p) => s + (p.pnlSol ?? 0), 0) / losses.length : 0;
  const bestTrade = analytics.bestTradeSol;
  const worstTrade = analytics.worstTradeSol ?? (losses.length > 0 ? Math.min(...losses.map((p) => p.pnlSol ?? 0)) : 0);
  const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;

  const stats = [
    { label: "Total P&L", value: `${pnlSign(analytics.totalPnlSol)}${analytics.totalPnlSol.toFixed(4)} SOL`, color: pnlColor(analytics.totalPnlSol) },
    { label: "Win Rate", value: `${analytics.winRate.toFixed(1)}%`, color: analytics.winRate >= 50 ? "#00d672" : "#f23645" },
    { label: "Total Trades", value: String(analytics.totalTrades), color: "#eef0f6" },
    { label: "Avg Hold Time", value: formatDuration(analytics.avgHoldTimeMs), color: "#eef0f6" },
    { label: "Best Trade", value: `${pnlSign(bestTrade)}${bestTrade.toFixed(4)} SOL`, color: "#00d672" },
    { label: "Worst Trade", value: `${worstTrade.toFixed(4)} SOL`, color: "#f23645" },
    { label: "Avg Win", value: `+${avgWin.toFixed(4)} SOL`, color: "#00d672" },
    { label: "Avg Loss", value: `${avgLoss.toFixed(4)} SOL`, color: "#f23645" },
    { label: "Profit Factor", value: profitFactor.toFixed(2), color: profitFactor >= 1 ? "#00d672" : "#f23645" },
    { label: "Wins / Losses", value: `${wins.length} / ${losses.length}`, color: "#eef0f6" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      {stats.map((stat) => (
        <div
          key={stat.label}
          style={{ background: "#0a0d14", border: "1px solid #1a1f2e", borderRadius: 8 }}
          className="p-3"
        >
          <p style={{ color: "#5c6380" }} className="text-[10px] uppercase tracking-wider mb-1">
            {stat.label}
          </p>
          <p className="font-mono text-sm font-bold" style={{ color: stat.color }}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────── Main Page ──────────────────────── */

export default function MatchesPage() {
  const router = useRouter();
  const toast = useToast();
  const { hasKey } = useKey();

  const [activeTab, setActiveTab] = useState<Tab>("positions");
  const [sortKey, setSortKey] = useState<SortKey>("pnl");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Positions
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const fetchFailRef = useRef(0);

  // Trade history
  const [closedPositions, setClosedPositions] = useState<ClosedPosition[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const historyFailRef = useRef(0);

  // Analytics
  const [analytics, setAnalytics] = useState<WalletAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Auto-sell settings
  const [autoSell, setAutoSell] = useState<AutoSellSettings>({
    autoSellProfitPct: null,
    stopLossPct: null,
  });

  const fetchPositions = useCallback(async () => {
    try {
      const res = await api.raw("/api/positions?status=open");
      if (res.ok) {
        const { data } = await res.json();
        setPositions(data);
        fetchFailRef.current = 0;
      } else {
        fetchFailRef.current++;
        if (fetchFailRef.current >= 3) {
          toast.add("Unable to load positions", "error");
          fetchFailRef.current = 0;
        }
      }
    } catch {
      fetchFailRef.current++;
      if (fetchFailRef.current >= 3) {
        toast.add("Unable to load positions", "error");
        fetchFailRef.current = 0;
      }
    } finally {
      setPositionsLoading(false);
    }
  }, [toast]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.raw("/api/positions/history");
      if (res.ok) {
        const json = await res.json();
        const data: ClosedPosition[] = json.data ?? json;
        data.sort((a, b) => {
          const aTime = a.exitTimestamp ? new Date(a.exitTimestamp).getTime() : 0;
          const bTime = b.exitTimestamp ? new Date(b.exitTimestamp).getTime() : 0;
          return bTime - aTime;
        });
        setClosedPositions(data);
        historyFailRef.current = 0;
      } else {
        historyFailRef.current++;
        if (historyFailRef.current >= 3) {
          toast.add("Unable to load trade history", "error");
          historyFailRef.current = 0;
        }
      }
    } catch {
      historyFailRef.current++;
      if (historyFailRef.current >= 3) {
        toast.add("Unable to load trade history", "error");
        historyFailRef.current = 0;
      }
    } finally {
      setHistoryLoading(false);
    }
  }, [toast]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await api.raw("/api/wallet/analytics");
      if (res.ok) {
        const json = await res.json();
        setAnalytics(json.data ?? json);
      }
    } catch {
      // silently fail
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPositions();
    fetchHistory();
    fetchAnalytics();
    api.raw("/api/settings")
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) {
          setAutoSell({
            autoSellProfitPct: data.autoSellProfitPct ?? null,
            stopLossPct: data.stopLossPct ?? null,
          });
        }
      })
      .catch(() => {});

    const interval = setInterval(fetchPositions, 10_000);
    return () => clearInterval(interval);
  }, [fetchPositions, fetchHistory, fetchAnalytics]);

  const handleClose = async (positionId: string, percent: number = 100) => {
    if (!hasKey) {
      toast.add("Import your private key to sell", "error");
      return;
    }
    const label = percent === 100 ? "sell" : `sell ${percent}%`;
    try {
      const res = await api.raw(
        `/api/positions/${positionId}/close?percent=${percent}`,
        { method: "POST" }
      );
      if (!res.ok) {
        toast.add(`Failed to build ${label} transaction`, "error");
        return;
      }
      const { data } = await res.json();
      const position = positions.find((p) => p.id === positionId);
      const submitRes = await api.raw("/api/tx/submit", {
        method: "POST",
        body: JSON.stringify({
          unsignedTx: data.unsignedTx,
          positionType: "sell",
          mintAddress: position?.mintAddress || "",
          positionId,
          sellPercent: percent,
        }),
      });
      if (submitRes.ok) {
        toast.add(
          percent === 100 ? "Sell transaction submitted!" : `Selling ${percent}% - tx submitted!`,
          "success"
        );
        fetchPositions();
      } else {
        const err = await submitRes.json();
        toast.add(err.error || `${label} failed`, "error");
      }
    } catch {
      toast.add(`Failed to ${label} position`, "error");
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "positions", label: "Open Positions", count: positions.length },
    { key: "history", label: "Trade History", count: closedPositions.length },
    { key: "analytics", label: "Analytics" },
  ];

  return (
    <ErrorBoundary fallbackTitle="Portfolio error">
      <div className="space-y-4">
        {/* Page title */}
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-bold uppercase tracking-wider" style={{ color: "#eef0f6" }}>
            Portfolio
          </h1>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#00d672" }} />
            <span className="text-[10px] font-mono" style={{ color: "#5c6380" }}>Live</span>
          </div>
        </div>

        {/* Portfolio summary header */}
        {positionsLoading ? (
          <Skeleton className="h-44 rounded-lg" />
        ) : (
          <PortfolioSummaryHeader
            positions={positions}
            analytics={analytics}
            analyticsLoading={analyticsLoading}
            closedPositions={closedPositions}
          />
        )}

        {/* P&L Chart */}
        <PortfolioChart />

        {/* Tab system */}
        <div
          className="flex gap-0"
          style={{ borderBottom: "1px solid #1a1f2e" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="relative px-4 py-2 text-xs font-medium transition-colors"
              style={{
                color: activeTab === tab.key ? "#eef0f6" : "#5c6380",
                borderBottom: activeTab === tab.key ? "2px solid #8b5cf6" : "2px solid transparent",
              }}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className="ml-1.5 font-mono text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    background: activeTab === tab.key ? "rgba(139, 92, 246, 0.2)" : "rgba(255,255,255,0.05)",
                    color: activeTab === tab.key ? "#8b5cf6" : "#5c6380",
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "positions" && (
          <>
            {positionsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : positions.length === 0 ? (
              <EmptyState
                icon={
                  <svg viewBox="0 0 24 24" width={48} height={48} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0022 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                }
                title="No open positions"
                description="Start trading by swiping right on tokens you believe in."
                action={{
                  label: "Go to Discover",
                  onClick: () => router.push("/swipe"),
                }}
              />
            ) : (
              <>
                {/* Export bar */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold" style={{ color: "#eef0f6" }}>
                    {positions.length} open position{positions.length !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={() => {
                      const mapped: PositionData[] = positions.map((p) => ({
                        id: p.id,
                        mintAddress: p.mintAddress,
                        tokenName: p.token.name,
                        tokenTicker: p.token.ticker,
                        tokenImageUri: p.token.imageUri,
                        entrySol: p.entrySol,
                        entryTokenAmount: p.entryTokenAmount,
                        entryPricePerToken: p.entryPricePerToken,
                        entryTimestamp: p.entryTimestamp ?? "",
                        exitSol: null,
                        exitPricePerToken: null,
                        exitTimestamp: null,
                        status: "open" as const,
                        currentPriceSol: p.currentPriceSol,
                        pnlPercent: p.pnlPercent,
                        pnlSol: p.pnlSol,
                      }));
                      exportPortfolioCSV(mapped);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      color: "#9ca3b8",
                      border: "1px solid #1a1f2e",
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export CSV
                  </button>
                </div>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <PositionsTable
                    positions={positions}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    onClose={handleClose}
                  />
                </div>
                {/* Mobile cards */}
                <div className="md:hidden space-y-2">
                  {positions.map((pos) => (
                    <MobilePositionCard
                      key={pos.id}
                      position={pos}
                      onClose={handleClose}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "history" && (
          <TradeHistorySection
            positions={closedPositions}
            loading={historyLoading}
          />
        )}

        {activeTab === "analytics" && (
          <AnalyticsSection
            analytics={analytics}
            loading={analyticsLoading}
            closedPositions={closedPositions}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
