"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useKey } from "@/components/providers/KeyProvider";
import { BalanceDisplay } from "@/components/wallet/BalanceDisplay";
import { DepositQR } from "@/components/wallet/DepositQR";
import { ImportKeyModal } from "@/components/wallet/ImportKeyModal";
import { WithdrawModal } from "@/components/wallet/WithdrawModal";
import { PortfolioChart } from "@/components/wallet/PortfolioChart";
import { PnLCalendar } from "@/components/wallet/PnLCalendar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";

interface WalletAnalytics {
  totalPortfolioValue: number;
  totalRealizedPnl: number;
  winRate: number;
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  avgHoldTimeMs: number;
  bestTrade: {
    tokenName: string;
    tokenTicker: string;
    pnlPercent: number;
    pnlSol: number;
  } | null;
  worstTrade: {
    tokenName: string;
    tokenTicker: string;
    pnlPercent: number;
    pnlSol: number;
  } | null;
}

interface TradeHistoryItem {
  id: string;
  entrySol: number;
  exitSol: number | null;
  entryPricePerToken: number;
  exitPricePerToken: number | null;
  entryTimestamp: string;
  exitTimestamp: string | null;
  pnlSol: number | null;
  pnlPercent: number | null;
  txHash?: string | null;
  token: {
    name: string;
    ticker: string;
    imageUri: string | null;
  };
}

interface PortfolioSnapshot {
  time: string;
  value: number;
}

function formatHoldTime(ms: number): string {
  if (ms <= 0) return "--";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  if (hours < 24) return `${hours}h ${remainMin}m`;
  const days = Math.floor(hours / 24);
  const remainHrs = hours % 24;
  return `${days}d ${remainHrs}h`;
}

function formatPnl(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(4)}`;
}

function formatPnlPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function PnlText({ value, className = "" }: { value: number; className?: string }) {
  const color = value >= 0 ? "text-green" : "text-red";
  return <span className={`${color} ${className}`}>{formatPnl(value)}</span>;
}

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function exportTradesToCsv(trades: TradeHistoryItem[]) {
  const header = ["Date", "Token", "Type", "Amount (SOL)", "Price", "P&L", "TX Hash"];
  const rows = trades.map((trade) => {
    const date = trade.exitTimestamp
      ? new Date(trade.exitTimestamp).toISOString().split("T")[0]
      : new Date(trade.entryTimestamp).toISOString().split("T")[0];
    const token = `${trade.token.ticker} (${trade.token.name})`;
    const type = trade.exitSol !== null ? "Sell" : "Buy";
    const amount = trade.exitSol !== null
      ? trade.exitSol.toFixed(6)
      : trade.entrySol.toFixed(6);
    const price = trade.exitPricePerToken !== null
      ? trade.exitPricePerToken.toFixed(12)
      : trade.entryPricePerToken.toFixed(12);
    const pnl = trade.pnlSol !== null ? formatPnl(trade.pnlSol) : "--";
    const txHash = trade.txHash ?? "";

    return [date, token, type, amount, price, pnl, txHash].map(escapeCsvField).join(",");
  });

  const csvContent = [header.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const today = new Date().toISOString().split("T")[0];
  const filename = `hatcher-trades-${today}.csv`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function WalletPage() {
  const { user } = useAuth();
  const { hasKey, publicKey, clearKey, importKey } = useKey();
  const [showImport, setShowImport] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [balanceSol, setBalanceSol] = useState<number>(0);
  const [showReveal, setShowReveal] = useState(false);
  const [revealPassword, setRevealPassword] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealError, setRevealError] = useState("");
  const [revealLoading, setRevealLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [keyMasked, setKeyMasked] = useState(true);

  // Analytics state
  const [analytics, setAnalytics] = useState<WalletAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Trade history state
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Portfolio chart state
  const [portfolioSnapshots, setPortfolioSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);

  const walletAddress = user?.wallet?.publicKey;

  const fetchBalance = useCallback(async () => {
    try {
      const res = await api.raw("/api/wallet/balance");
      if (res.ok) {
        const { data } = await res.json();
        setBalanceSol(data.sol);
      }
    } catch {
      // silently fail
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await api.raw("/api/wallet/analytics");
      if (res.ok) {
        const { data } = await res.json();
        setAnalytics(data);
      }
    } catch {
      // silently fail
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.raw("/api/positions/history");
      if (res.ok) {
        const { data } = await res.json();
        setTradeHistory(data);
      }
    } catch {
      // silently fail
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const fetchPortfolioSnapshots = useCallback(async () => {
    try {
      const res = await api.raw("/api/wallet/portfolio-history");
      if (res.ok) {
        const { data } = await res.json();
        setPortfolioSnapshots(data);
      }
    } catch {
      // silently fail
    } finally {
      setSnapshotsLoading(false);
    }
  }, []);

  // Derive daily P&L from trade history
  const dailyPnl = useMemo(() => {
    const pnlMap: Record<string, number> = {};
    for (const trade of tradeHistory) {
      if (trade.pnlSol === null || !trade.exitTimestamp) continue;
      const dateStr = new Date(trade.exitTimestamp).toISOString().split("T")[0];
      pnlMap[dateStr] = (pnlMap[dateStr] ?? 0) + trade.pnlSol;
    }
    return pnlMap;
  }, [tradeHistory]);

  useEffect(() => {
    if (!walletAddress) return;
    fetchBalance();
    fetchAnalytics();
    fetchHistory();
    fetchPortfolioSnapshots();
  }, [walletAddress, fetchBalance, fetchAnalytics, fetchHistory, fetchPortfolioSnapshots]);

  const handleRevealKey = async () => {
    if (!revealPassword) return;
    setRevealLoading(true);
    setRevealError("");

    try {
      const res = await api.raw("/api/wallet/key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: revealPassword }),
      });

      if (res.ok) {
        const { data } = await res.json();
        setRevealedKey(data.privateKey);
        if (!hasKey) {
          importKey(data.privateKey);
        }
      } else {
        const err = await res.json();
        setRevealError(err.error || "Failed to decrypt");
      }
    } catch {
      setRevealError("Something went wrong");
    }
    setRevealLoading(false);
  };

  const copyKey = async () => {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAddress = async () => {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleUnlockKey = async () => {
    if (!revealPassword) return;
    setRevealLoading(true);
    setRevealError("");

    try {
      const res = await api.raw("/api/wallet/key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: revealPassword }),
      });

      if (res.ok) {
        const { data } = await res.json();
        importKey(data.privateKey);
        setRevealPassword("");
      } else {
        const err = await res.json();
        setRevealError(err.error || "Failed to decrypt");
      }
    } catch {
      setRevealError("Something went wrong");
    }
    setRevealLoading(false);
  };

  return (
    <div>
      <h1 className="text-lg font-bold text-text-primary mb-6">Wallet</h1>

      {!walletAddress ? (
        <div className="flex flex-col items-center justify-center gap-3 mt-16 text-center">
          <p className="text-4xl">&#x1F45B;</p>
          <p className="text-text-secondary text-sm">No wallet registered.</p>
          <p className="text-text-muted text-xs">Complete signup to generate a wallet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Balance & Address */}
          <div
            className="rounded-xl p-6 flex flex-col items-center"
            style={{ backgroundColor: "#1a1f2e", border: "1px solid #1a1f2e" }}
          >
            <BalanceDisplay />

            {/* Public key display */}
            <div className="w-full mt-4 pt-4" style={{ borderTop: "1px solid #1a1f2e" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#5c6380" }}>
                  Wallet Address
                </span>
                <button
                  onClick={() => setShowFullAddress(!showFullAddress)}
                  className="text-[10px] font-medium uppercase tracking-wide transition-colors"
                  style={{ color: "#9ca3b8" }}
                  type="button"
                >
                  {showFullAddress ? "Truncate" : "Show Full"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <p
                  className="font-mono text-sm break-all leading-relaxed flex-1"
                  style={{ color: "#eef0f6" }}
                >
                  {showFullAddress
                    ? walletAddress
                    : `${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)}`}
                </p>
                <button
                  onClick={copyAddress}
                  className="shrink-0 p-1.5 rounded-md transition-colors"
                  style={{
                    backgroundColor: copiedAddress ? "rgba(0, 214, 114, 0.10)" : "#1f2435",
                    border: copiedAddress ? "1px solid rgba(0, 214, 114, 0.30)" : "1px solid #1a1f2e",
                    color: copiedAddress ? "#00d672" : "#9ca3b8",
                  }}
                  title="Copy address"
                  type="button"
                >
                  {copiedAddress ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Key status */}
          <div className="bg-bg-card border border-border rounded-xl p-4">
            {hasKey ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green font-medium">Key loaded</p>
                    <p className="text-xs font-mono text-text-muted mt-0.5">
                      {publicKey?.slice(0, 8)}...{publicKey?.slice(-6)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowReveal(!showReveal)}
                      className="text-xs text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {showReveal ? "Hide" : "Show key"}
                    </button>
                    <button
                      onClick={clearKey}
                      className="text-xs text-red hover:underline"
                    >
                      Lock
                    </button>
                  </div>
                </div>

                {/* Reveal key section */}
                {showReveal && !revealedKey && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs text-text-muted">Enter your password to reveal private key</p>
                    <input
                      type="password"
                      value={revealPassword}
                      onChange={(e) => setRevealPassword(e.target.value)}
                      className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-green focus:outline-none"
                      placeholder="Your password"
                    />
                    {revealError && <p className="text-xs text-red">{revealError}</p>}
                    <button
                      onClick={handleRevealKey}
                      disabled={!revealPassword || revealLoading}
                      className="w-full py-2 rounded-lg text-sm font-medium bg-bg-elevated border border-border text-text-secondary hover:bg-bg-hover transition-colors disabled:opacity-30"
                    >
                      {revealLoading ? "Decrypting..." : "Reveal Key"}
                    </button>
                  </div>
                )}

                {showReveal && revealedKey && (
                  <div className="space-y-2 pt-2" style={{ borderTop: "1px solid #1a1f2e" }}>
                    {/* Warning banner */}
                    <div
                      className="flex items-center gap-2 p-2.5 rounded-lg"
                      style={{
                        backgroundColor: "rgba(242, 54, 69, 0.10)",
                        border: "1px solid rgba(242, 54, 69, 0.20)",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f23645" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <p className="text-[11px] font-medium" style={{ color: "#f23645" }}>
                        Never share your private key. Anyone with it can steal your funds.
                      </p>
                    </div>

                    {/* Key display with toggle */}
                    <div className="rounded-lg p-3" style={{ backgroundColor: "#10131c", border: "1px solid #1a1f2e" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "rgba(242, 54, 69, 0.70)" }}>
                          Private Key
                        </span>
                        <button
                          onClick={() => setKeyMasked(!keyMasked)}
                          className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide transition-colors"
                          style={{ color: "#9ca3b8" }}
                          type="button"
                        >
                          {keyMasked ? (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              SHOW
                            </>
                          ) : (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                              </svg>
                              HIDE
                            </>
                          )}
                        </button>
                      </div>
                      <p
                        className="font-mono text-xs break-all leading-relaxed"
                        style={{
                          color: keyMasked ? "#5c6380" : "#eef0f6",
                          userSelect: keyMasked ? "none" : "text",
                          WebkitUserSelect: keyMasked ? "none" : "text",
                        }}
                      >
                        {keyMasked ? "\u2022".repeat(44) : revealedKey}
                      </p>
                    </div>

                    <button
                      onClick={copyKey}
                      className="w-full py-1.5 text-xs font-medium rounded transition-colors"
                      style={{
                        backgroundColor: copied ? "rgba(0, 214, 114, 0.10)" : "#1f2435",
                        border: copied ? "1px solid rgba(0, 214, 114, 0.30)" : "1px solid #1a1f2e",
                        color: copied ? "#00d672" : "#9ca3b8",
                      }}
                    >
                      {copied ? "COPIED!" : "COPY TO CLIPBOARD"}
                    </button>
                    <button
                      onClick={() => { setRevealedKey(null); setShowReveal(false); setRevealPassword(""); setKeyMasked(true); }}
                      className="w-full py-1.5 text-xs transition-colors"
                      style={{ color: "#5c6380" }}
                    >
                      Hide
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-amber text-center">Key locked — enter password to unlock</p>
                <input
                  type="password"
                  value={revealPassword}
                  onChange={(e) => setRevealPassword(e.target.value)}
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:border-green focus:outline-none"
                  placeholder="Your password"
                />
                {revealError && <p className="text-xs text-red text-center">{revealError}</p>}
                <button
                  onClick={handleUnlockKey}
                  disabled={!revealPassword || revealLoading}
                  className="w-full py-2.5 rounded-lg bg-green text-bg-primary font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-30"
                >
                  {revealLoading ? "Unlocking..." : "Unlock"}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowImport(true)}
                    className="flex-1 py-2 rounded-lg text-xs font-medium border border-border text-text-secondary hover:bg-bg-hover transition-colors"
                  >
                    Import different key
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Portfolio Analytics */}
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Portfolio Analytics</h2>

            {analyticsLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : analytics ? (
              <div className="space-y-4">
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-bg-elevated border border-border rounded-lg p-3">
                    <p className="text-xs text-text-muted mb-1">Portfolio Value</p>
                    <p className="text-lg font-bold font-mono text-text-primary">
                      {analytics.totalPortfolioValue.toFixed(4)}
                    </p>
                    <p className="text-xs text-text-muted">SOL</p>
                  </div>
                  <div className="bg-bg-elevated border border-border rounded-lg p-3">
                    <p className="text-xs text-text-muted mb-1">Realized P&L</p>
                    <p className="text-lg font-bold font-mono">
                      <PnlText value={analytics.totalRealizedPnl} />
                    </p>
                    <p className="text-xs text-text-muted">SOL</p>
                  </div>
                  <div className="bg-bg-elevated border border-border rounded-lg p-3">
                    <p className="text-xs text-text-muted mb-1">Win Rate</p>
                    <p className={`text-lg font-bold font-mono ${analytics.winRate >= 50 ? "text-green" : "text-red"}`}>
                      {analytics.winRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-text-muted">
                      {analytics.closedTrades} closed
                    </p>
                  </div>
                  <div className="bg-bg-elevated border border-border rounded-lg p-3">
                    <p className="text-xs text-text-muted mb-1">Total Trades</p>
                    <p className="text-lg font-bold font-mono text-text-primary">
                      {analytics.totalTrades}
                    </p>
                    <p className="text-xs text-text-muted">
                      {analytics.openTrades} open
                    </p>
                  </div>
                </div>

                {/* Best / Worst / Avg hold */}
                <div className="space-y-2">
                  {analytics.bestTrade && (
                    <div className="flex items-center justify-between bg-bg-elevated border border-border rounded-lg px-3 py-2">
                      <div>
                        <p className="text-xs text-text-muted">Best Trade</p>
                        <p className="text-sm text-text-primary font-medium">
                          ${analytics.bestTrade.tokenTicker}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono text-green">
                          {formatPnlPercent(analytics.bestTrade.pnlPercent)}
                        </p>
                        <p className="text-xs font-mono text-green">
                          {formatPnl(analytics.bestTrade.pnlSol)} SOL
                        </p>
                      </div>
                    </div>
                  )}
                  {analytics.worstTrade && (
                    <div className="flex items-center justify-between bg-bg-elevated border border-border rounded-lg px-3 py-2">
                      <div>
                        <p className="text-xs text-text-muted">Worst Trade</p>
                        <p className="text-sm text-text-primary font-medium">
                          ${analytics.worstTrade.tokenTicker}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono text-red">
                          {formatPnlPercent(analytics.worstTrade.pnlPercent)}
                        </p>
                        <p className="text-xs font-mono text-red">
                          {formatPnl(analytics.worstTrade.pnlSol)} SOL
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between bg-bg-elevated border border-border rounded-lg px-3 py-2">
                    <p className="text-xs text-text-muted">Avg Hold Time</p>
                    <p className="text-sm font-mono text-text-primary">
                      {formatHoldTime(analytics.avgHoldTimeMs)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-muted text-center py-4">
                No analytics data available
              </p>
            )}
          </div>

          {/* Portfolio Value Chart */}
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Portfolio Value</h2>
            {snapshotsLoading ? (
              <Skeleton className="h-[200px] w-full rounded-lg" />
            ) : (
              <PortfolioChart data={portfolioSnapshots} />
            )}
          </div>

          {/* P&L Calendar */}
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Daily P&L</h2>
            <PnLCalendar dailyPnl={dailyPnl} />
          </div>

          {/* Trade History */}
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-primary">Trade History</h2>
              {tradeHistory.length > 0 && (
                <button
                  onClick={() => exportTradesToCsv(tradeHistory)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export CSV
                </button>
              )}
            </div>

            {historyLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : tradeHistory.length > 0 ? (
              <div className="space-y-2">
                {tradeHistory.map((trade) => {
                  const holdTimeMs =
                    trade.exitTimestamp && trade.entryTimestamp
                      ? new Date(trade.exitTimestamp).getTime() -
                        new Date(trade.entryTimestamp).getTime()
                      : 0;
                  const pnl = trade.pnlSol ?? 0;
                  const pnlPct = trade.pnlPercent ?? 0;
                  const isProfit = pnl >= 0;

                  return (
                    <div
                      key={trade.id}
                      className="bg-bg-elevated border border-border rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {trade.token.imageUri && (
                            <img
                              src={trade.token.imageUri}
                              alt={trade.token.ticker}
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <div>
                            <p className="text-sm font-medium text-text-primary">
                              ${trade.token.ticker}
                            </p>
                            <p className="text-xs text-text-muted truncate max-w-[120px]">
                              {trade.token.name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold font-mono ${isProfit ? "text-green" : "text-red"}`}>
                            {formatPnlPercent(pnlPct)}
                          </p>
                          <p className={`text-xs font-mono ${isProfit ? "text-green" : "text-red"}`}>
                            {formatPnl(pnl)} SOL
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-text-muted">
                        <div className="flex gap-3">
                          <span>
                            In: <span className="font-mono text-text-secondary">{trade.entrySol.toFixed(4)}</span>
                          </span>
                          <span>
                            Out: <span className="font-mono text-text-secondary">{trade.exitSol?.toFixed(4) ?? "--"}</span>
                          </span>
                        </div>
                        <div className="flex gap-3">
                          <span className="font-mono">{formatHoldTime(holdTimeMs)}</span>
                          <span>
                            {trade.exitTimestamp
                              ? new Date(trade.exitTimestamp).toLocaleDateString()
                              : "--"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={
                  <svg viewBox="0 0 24 24" width={48} height={48} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="20" x2="12" y2="10" />
                    <line x1="18" y1="20" x2="18" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="16" />
                  </svg>
                }
                title="No trades yet"
                description="Your trade history will appear here once you start trading."
                className="py-8"
              />
            )}
          </div>

          {/* Deposit & Withdraw */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-4 text-center">
              Deposit SOL
            </h2>
            <DepositQR publicKey={walletAddress} />
            {hasKey && (
              <button
                onClick={() => setShowWithdraw(true)}
                className="w-full mt-4 py-2.5 rounded-lg text-sm font-semibold bg-red/10 border border-red/20 text-red hover:bg-red/20 transition-colors"
              >
                Withdraw SOL
              </button>
            )}
          </div>
        </div>
      )}

      {showImport && (
        <ImportKeyModal
          onClose={() => setShowImport(false)}
          onSuccess={() => setShowImport(false)}
        />
      )}

      {showWithdraw && (
        <WithdrawModal
          onClose={() => {
            setShowWithdraw(false);
            fetchBalance();
          }}
          balanceSol={balanceSol}
        />
      )}
    </div>
  );
}
