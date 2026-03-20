"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useKey } from "@/components/providers/KeyProvider";
import { BalanceDisplay } from "@/components/wallet/BalanceDisplay";
import { DepositQR } from "@/components/wallet/DepositQR";
import { ImportKeyModal } from "@/components/wallet/ImportKeyModal";
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
  token: {
    name: string;
    ticker: string;
    imageUri: string | null;
  };
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

export default function WalletPage() {
  const { user } = useAuth();
  const { hasKey, publicKey, clearKey, importKey } = useKey();
  const [showImport, setShowImport] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [revealPassword, setRevealPassword] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealError, setRevealError] = useState("");
  const [revealLoading, setRevealLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState<WalletAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Trade history state
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const walletAddress = user?.wallet?.publicKey;

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

  useEffect(() => {
    if (!walletAddress) return;
    fetchAnalytics();
    fetchHistory();
  }, [walletAddress, fetchAnalytics, fetchHistory]);

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
          {/* Balance */}
          <div className="bg-bg-card border border-border rounded-xl p-6 flex flex-col items-center">
            <BalanceDisplay />
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
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="bg-bg-primary border border-border rounded-lg p-3">
                      <p className="font-mono text-xs text-text-primary break-all leading-relaxed">
                        {revealedKey}
                      </p>
                    </div>
                    <button
                      onClick={copyKey}
                      className="w-full py-1.5 text-xs font-medium rounded bg-bg-elevated hover:bg-bg-hover border border-border text-text-secondary transition-colors"
                    >
                      {copied ? "COPIED!" : "COPY TO CLIPBOARD"}
                    </button>
                    <button
                      onClick={() => { setRevealedKey(null); setShowReveal(false); setRevealPassword(""); }}
                      className="w-full py-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
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

          {/* Trade History */}
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Trade History</h2>

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

          {/* Deposit */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-4 text-center">
              Deposit SOL
            </h2>
            <DepositQR publicKey={walletAddress} />
          </div>
        </div>
      )}

      {showImport && (
        <ImportKeyModal
          onClose={() => setShowImport(false)}
          onSuccess={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
