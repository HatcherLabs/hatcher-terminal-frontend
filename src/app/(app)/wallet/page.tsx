"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useKey } from "@/components/providers/KeyProvider";
import { useSolPriceContext } from "@/components/providers/SolPriceProvider";
import { DepositQR } from "@/components/wallet/DepositQR";
import { ImportKeyModal } from "@/components/wallet/ImportKeyModal";
import { WithdrawModal } from "@/components/wallet/WithdrawModal";
import { PortfolioChart } from "@/components/wallet/PortfolioChart";
import { PnLCalendar } from "@/components/wallet/PnLCalendar";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { api } from "@/lib/api";

/* ───────────────────────── Types ───────────────────────── */

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

/* ───────────────────────── Palette ───────────────────────── */

const C = {
  bg:        "#0a0d14",
  bgCard:    "#10131c",
  bgPanel:   "#1a1f2e",
  bgElevated:"#1f2435",
  border:    "#1a1f2e",
  text:      "#eef0f6",
  textSec:   "#9ca3b8",
  textMuted: "#5c6380",
  green:     "#00d672",
  red:       "#f23645",
  amber:     "#f5a623",
} as const;

/* ───────────────────────── Helpers ───────────────────────── */

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

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
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
  const link = document.createElement("a");
  link.href = url;
  link.download = `hatcher-trades-${today}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ───────────────────────── Tiny SVG Icons ───────────────────────── */

function IconCopy({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function IconCheck({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconDownload({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function IconUpload({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function IconKey({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}
function IconLock({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function IconEye({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconEyeOff({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );
}
function IconChevronDown({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/* ───────────────────────── Deposit QR Modal ───────────────────────── */

function DepositModal({ publicKey, onClose }: { publicKey: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.80)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="max-w-sm w-full p-6 space-y-4"
        style={{ backgroundColor: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 12 }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: C.text }}>Deposit SOL</h3>
          <button onClick={onClose} className="text-xs" style={{ color: C.textMuted }}>ESC</button>
        </div>
        <DepositQR publicKey={publicKey} />
        <button
          onClick={onClose}
          className="w-full py-2 text-xs font-medium rounded-lg"
          style={{ backgroundColor: C.bgElevated, border: `1px solid ${C.border}`, color: C.textSec }}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── Section Panel ───────────────────────── */

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg p-4 ${className}`}
      style={{ backgroundColor: C.bgCard, border: `1px solid ${C.border}` }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-widest"
      style={{ color: C.textMuted }}
    >
      {children}
    </span>
  );
}

/* ───────────────────────── Stat Cell ───────────────────────── */

function StatCell({ label, value, sub, color }: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="p-3 rounded-lg" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
      <p className="text-[10px] uppercase tracking-wider font-medium mb-1" style={{ color: C.textMuted }}>{label}</p>
      <p className="text-base font-bold font-mono" style={{ color: color ?? C.text }}>{value}</p>
      {sub && <p className="text-[10px] font-mono mt-0.5" style={{ color: C.textMuted }}>{sub}</p>}
    </div>
  );
}

/* ───────────────────────── Chart Time Range ───────────────────────── */

const TIME_RANGES = ["7D", "30D", "90D", "ALL"] as const;
type TimeRange = (typeof TIME_RANGES)[number];

function filterSnapshots(data: PortfolioSnapshot[], range: TimeRange): PortfolioSnapshot[] {
  if (range === "ALL" || data.length === 0) return data;
  const days = range === "7D" ? 7 : range === "30D" ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return data.filter((s) => s.time >= cutoffStr);
}

/* ───────────────────────── Main Page ───────────────────────── */

export default function WalletPage() {
  const { user } = useAuth();
  const { hasKey, publicKey, importKey } = useKey();
  const { solPrice } = useSolPriceContext();

  /* Modals */
  const [showImport, setShowImport] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);

  /* Balance */
  const [balanceSol, setBalanceSol] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(true);

  /* Key reveal */
  const [showReveal, setShowReveal] = useState(false);
  const [revealPassword, setRevealPassword] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealError, setRevealError] = useState("");
  const [revealLoading, setRevealLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [keyMasked, setKeyMasked] = useState(true);

  /* Analytics */
  const [analytics, setAnalytics] = useState<WalletAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  /* Trade history */
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  /* Daily P&L */
  const [dailyPnlData, setDailyPnlData] = useState<Record<string, number>>({});
  const [dailyPnlLoading, setDailyPnlLoading] = useState(true);

  /* Portfolio chart */
  const [portfolioSnapshots, setPortfolioSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);
  const [chartRange, setChartRange] = useState<TimeRange>("30D");

  const walletAddress = user?.wallet?.publicKey;

  /* ─── Fetchers ─── */

  const fetchBalance = useCallback(async () => {
    try {
      const res = await api.raw("/api/wallet/balance");
      if (res.ok) {
        const { data } = await res.json();
        setBalanceSol(data.sol);
      }
    } catch { /* silent */ } finally {
      setBalanceLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await api.raw("/api/wallet/analytics");
      if (res.ok) {
        const { data } = await res.json();
        setAnalytics(data);
      }
    } catch { /* silent */ } finally {
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
    } catch { /* silent */ } finally {
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
    } catch { /* silent */ } finally {
      setSnapshotsLoading(false);
    }
  }, []);

  const fetchDailyPnl = useCallback(async () => {
    try {
      const res = await api.raw("/api/positions/daily-pnl?days=90");
      if (res.ok) {
        const { data } = await res.json();
        const pnlMap: Record<string, number> = {};
        for (const entry of data) {
          pnlMap[entry.date] = entry.realizedPnl;
        }
        setDailyPnlData(pnlMap);
      }
    } catch { /* silent */ } finally {
      setDailyPnlLoading(false);
    }
  }, []);

  const filteredSnapshots = useMemo(
    () => filterSnapshots(portfolioSnapshots, chartRange),
    [portfolioSnapshots, chartRange],
  );

  const recentTrades = useMemo(() => tradeHistory.slice(0, 5), [tradeHistory]);

  useEffect(() => {
    if (!walletAddress) return;
    fetchBalance();
    fetchAnalytics();
    fetchHistory();
    fetchPortfolioSnapshots();
    fetchDailyPnl();
    const balanceInterval = setInterval(fetchBalance, 15_000);
    return () => clearInterval(balanceInterval);
  }, [walletAddress, fetchBalance, fetchAnalytics, fetchHistory, fetchPortfolioSnapshots, fetchDailyPnl]);

  /* ─── Key handlers ─── */

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
        if (!hasKey) importKey(data.privateKey);
      } else {
        const err = await res.json();
        setRevealError(err.error || "Failed to decrypt");
      }
    } catch { setRevealError("Something went wrong"); }
    setRevealLoading(false);
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
    } catch { setRevealError("Something went wrong"); }
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

  /* ─── No wallet state ─── */

  if (!walletAddress) {
    return (
      <ErrorBoundary fallbackTitle="Wallet error">
      <div className="flex flex-col items-center justify-center gap-3 mt-24 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: C.bgPanel }}>
          <IconLock size={20} />
        </div>
        <p className="text-sm font-medium" style={{ color: C.textSec }}>No wallet registered.</p>
        <p className="text-xs" style={{ color: C.textMuted }}>Complete signup to generate a wallet.</p>
      </div>
      </ErrorBoundary>
    );
  }

  const balanceUsd = balanceSol * solPrice;

  /* ─── Render ─── */

  return (
    <ErrorBoundary fallbackTitle="Wallet error">
    <div className="max-w-5xl mx-auto pb-24">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1
            className="text-sm font-bold uppercase tracking-widest"
            style={{ color: C.text }}
          >
            Account
          </h1>
          {!balanceLoading && (
            <span
              className="text-[10px] font-bold font-mono px-2 py-0.5 rounded"
              style={{ backgroundColor: "rgba(0,214,114,0.12)", color: C.green }}
            >
              {balanceSol.toFixed(2)} SOL
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {hasKey && (
            <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: C.green }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: C.green }} />
              UNLOCKED
            </span>
          )}
        </div>
      </div>

      {/* ═══ 2-COL GRID ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ─── LEFT COLUMN ─── */}
        <div className="space-y-4">

          {/* Balance + Address Card */}
          <Panel>
            <div className="flex items-center justify-between mb-4">
              <SectionLabel>Balance</SectionLabel>
              <button
                onClick={fetchBalance}
                className="text-[10px] font-medium uppercase tracking-wide"
                style={{ color: C.textMuted }}
              >
                Refresh
              </button>
            </div>

            {balanceLoading ? (
              <Skeleton className="h-14 w-48 rounded-lg mb-2" />
            ) : (
              <div className="mb-4">
                <p className="text-3xl font-bold font-mono" style={{ color: C.text }}>
                  {balanceSol.toFixed(4)}
                  <span className="text-sm font-medium ml-2" style={{ color: C.textMuted }}>SOL</span>
                </p>
                <p className="text-sm font-mono mt-0.5" style={{ color: C.textSec }}>
                  {formatUsd(balanceUsd)}
                </p>
              </div>
            )}

            {/* Wallet address */}
            <div className="pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
              <SectionLabel>Wallet Address</SectionLabel>
              <div className="flex items-center gap-2 mt-1.5">
                <p className="font-mono text-xs" style={{ color: C.text }}>
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </p>
                <button
                  onClick={copyAddress}
                  className="p-1 rounded transition-colors"
                  style={{
                    color: copiedAddress ? C.green : C.textMuted,
                    backgroundColor: copiedAddress ? "rgba(0,214,114,0.10)" : "transparent",
                  }}
                  title="Copy address"
                >
                  {copiedAddress ? <IconCheck size={12} /> : <IconCopy size={12} />}
                </button>
              </div>
            </div>
          </Panel>

          {/* Action Buttons Row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Deposit", icon: <IconDownload size={16} />, onClick: () => setShowDeposit(true), color: C.green },
              { label: "Withdraw", icon: <IconUpload size={16} />, onClick: () => setShowWithdraw(true), color: C.red, disabled: !hasKey },
              { label: "Import", icon: <IconKey size={16} />, onClick: () => setShowImport(true), color: C.textSec },
              { label: "Export", icon: <IconLock size={16} />, onClick: () => setShowReveal(!showReveal), color: C.textSec },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={btn.onClick}
                disabled={btn.disabled}
                className="flex flex-col items-center gap-1.5 py-3 rounded-lg transition-colors disabled:opacity-30"
                style={{ backgroundColor: C.bgCard, border: `1px solid ${C.border}`, color: btn.color }}
              >
                {btn.icon}
                <span className="text-[10px] font-bold uppercase tracking-wider">{btn.label}</span>
              </button>
            ))}
          </div>

          {/* Key Status / Unlock */}
          {!hasKey && (
            <Panel>
              <p className="text-xs font-medium text-center mb-3" style={{ color: C.amber }}>
                Key locked -- enter password to unlock trading
              </p>
              <input
                type="password"
                value={revealPassword}
                onChange={(e) => setRevealPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleUnlockKey(); }}
                className="w-full rounded-lg px-3 py-2 text-sm font-mono focus:outline-none"
                style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                placeholder="Your password"
              />
              {revealError && <p className="text-xs mt-1.5 text-center" style={{ color: C.red }}>{revealError}</p>}
              <button
                onClick={handleUnlockKey}
                disabled={!revealPassword || revealLoading}
                className="w-full mt-2 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-30"
                style={{ backgroundColor: C.green, color: C.bg }}
              >
                {revealLoading ? "Unlocking..." : "Unlock"}
              </button>
            </Panel>
          )}

          {/* Export Key Panel (toggled) */}
          {showReveal && hasKey && (
            <Panel>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>Export Private Key</SectionLabel>
                <button onClick={() => { setShowReveal(false); setRevealedKey(null); setRevealPassword(""); setKeyMasked(true); }} className="text-[10px]" style={{ color: C.textMuted }}>CLOSE</button>
              </div>

              {!revealedKey ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: "rgba(242,54,69,0.08)", border: "1px solid rgba(242,54,69,0.15)" }}>
                    <span className="text-[10px] font-medium" style={{ color: C.red }}>
                      Never share your private key. Anyone with it can steal your funds.
                    </span>
                  </div>
                  <input
                    type="password"
                    value={revealPassword}
                    onChange={(e) => setRevealPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRevealKey(); }}
                    className="w-full rounded-lg px-3 py-2 text-sm font-mono focus:outline-none"
                    style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                    placeholder="Password to decrypt"
                  />
                  {revealError && <p className="text-xs" style={{ color: C.red }}>{revealError}</p>}
                  <button
                    onClick={handleRevealKey}
                    disabled={!revealPassword || revealLoading}
                    className="w-full py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
                    style={{ backgroundColor: C.bgElevated, border: `1px solid ${C.border}`, color: C.textSec }}
                  >
                    {revealLoading ? "Decrypting..." : "Reveal Key"}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-lg p-3" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "rgba(242,54,69,0.70)" }}>Private Key</span>
                      <button onClick={() => setKeyMasked(!keyMasked)} className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide" style={{ color: C.textSec }}>
                        {keyMasked ? <><IconEye size={12} /> SHOW</> : <><IconEyeOff size={12} /> HIDE</>}
                      </button>
                    </div>
                    <p
                      className="font-mono text-xs break-all leading-relaxed"
                      style={{ color: keyMasked ? C.textMuted : C.text, userSelect: keyMasked ? "none" : "text" }}
                    >
                      {keyMasked ? "\u2022".repeat(44) : revealedKey}
                    </p>
                  </div>
                  <button
                    onClick={copyKey}
                    className="w-full py-1.5 text-xs font-medium rounded-lg transition-colors"
                    style={{
                      backgroundColor: copied ? "rgba(0,214,114,0.10)" : C.bgElevated,
                      border: copied ? "1px solid rgba(0,214,114,0.30)" : `1px solid ${C.border}`,
                      color: copied ? C.green : C.textSec,
                    }}
                  >
                    {copied ? "COPIED!" : "COPY TO CLIPBOARD"}
                  </button>
                </div>
              )}
            </Panel>
          )}

          {/* Trade Summary Stats */}
          <Panel>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Trade Summary</SectionLabel>
              {tradeHistory.length > 0 && (
                <button
                  onClick={() => exportTradesToCsv(tradeHistory)}
                  className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide"
                  style={{ color: C.textMuted }}
                >
                  <IconDownload size={10} /> CSV
                </button>
              )}
            </div>
            {analyticsLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : analytics ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <StatCell
                    label="Win Rate"
                    value={`${analytics.winRate.toFixed(1)}%`}
                    sub={`${analytics.closedTrades} closed`}
                    color={analytics.winRate >= 50 ? C.green : C.red}
                  />
                  <StatCell
                    label="Total Trades"
                    value={String(analytics.totalTrades)}
                    sub={`${analytics.openTrades} open`}
                  />
                  <StatCell
                    label="Realized P&L"
                    value={`${formatPnl(analytics.totalRealizedPnl)} SOL`}
                    color={analytics.totalRealizedPnl >= 0 ? C.green : C.red}
                  />
                  <StatCell
                    label="Avg Hold"
                    value={formatHoldTime(analytics.avgHoldTimeMs)}
                  />
                </div>

                {/* Best / Worst */}
                {(analytics.bestTrade || analytics.worstTrade) && (
                  <div className="grid grid-cols-2 gap-2">
                    {analytics.bestTrade && (
                      <div className="p-3 rounded-lg" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                        <p className="text-[10px] uppercase tracking-wider font-medium mb-1" style={{ color: C.textMuted }}>Best Trade</p>
                        <p className="text-xs font-bold font-mono" style={{ color: C.green }}>{formatPnlPercent(analytics.bestTrade.pnlPercent)}</p>
                        <p className="text-[10px] font-mono" style={{ color: C.textSec }}>${analytics.bestTrade.tokenTicker}</p>
                      </div>
                    )}
                    {analytics.worstTrade && (
                      <div className="p-3 rounded-lg" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                        <p className="text-[10px] uppercase tracking-wider font-medium mb-1" style={{ color: C.textMuted }}>Worst Trade</p>
                        <p className="text-xs font-bold font-mono" style={{ color: C.red }}>{formatPnlPercent(analytics.worstTrade.pnlPercent)}</p>
                        <p className="text-[10px] font-mono" style={{ color: C.textSec }}>${analytics.worstTrade.tokenTicker}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-center py-4" style={{ color: C.textMuted }}>No trade data yet</p>
            )}
          </Panel>

          {/* Daily P&L Calendar */}
          <Panel>
            <div className="mb-3">
              <SectionLabel>Daily P&L</SectionLabel>
            </div>
            {dailyPnlLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 rounded" />
                ))}
              </div>
            ) : (
              <PnLCalendar dailyPnl={dailyPnlData} />
            )}
          </Panel>
        </div>

        {/* ─── RIGHT COLUMN ─── */}
        <div className="space-y-4">

          {/* Portfolio Value Chart */}
          <Panel>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Portfolio Value</SectionLabel>
              <div className="flex gap-1">
                {TIME_RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setChartRange(r)}
                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide transition-colors"
                    style={{
                      backgroundColor: chartRange === r ? C.bgElevated : "transparent",
                      color: chartRange === r ? C.text : C.textMuted,
                      border: chartRange === r ? `1px solid ${C.border}` : "1px solid transparent",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {snapshotsLoading ? (
              <Skeleton className="h-[200px] w-full rounded-lg" />
            ) : (
              <PortfolioChart data={filteredSnapshots} />
            )}
          </Panel>

          {/* Recent Activity */}
          <Panel>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Recent Activity</SectionLabel>
              {tradeHistory.length > 5 && (
                <span className="text-[10px] font-mono" style={{ color: C.textMuted }}>
                  {tradeHistory.length} total
                </span>
              )}
            </div>

            {historyLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : recentTrades.length > 0 ? (
              <div className="space-y-1">
                {recentTrades.map((trade) => {
                  const pnl = trade.pnlSol ?? 0;
                  const pnlPct = trade.pnlPercent ?? 0;
                  const isProfit = pnl >= 0;
                  const isClosed = trade.exitSol !== null;
                  const dateStr = trade.exitTimestamp ?? trade.entryTimestamp;

                  return (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg"
                      style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {trade.token.imageUri ? (
                          <img src={trade.token.imageUri} alt="" className="w-5 h-5 rounded-full flex-shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: C.bgPanel }} />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold font-mono truncate" style={{ color: C.text }}>
                            ${trade.token.ticker}
                          </p>
                          <p className="text-[10px] font-mono" style={{ color: C.textMuted }}>
                            {isClosed ? "CLOSED" : "OPEN"} {"\u00B7"} {timeAgo(dateStr)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        {isClosed ? (
                          <>
                            <p className="text-xs font-bold font-mono" style={{ color: isProfit ? C.green : C.red }}>
                              {formatPnlPercent(pnlPct)}
                            </p>
                            <p className="text-[10px] font-mono" style={{ color: isProfit ? C.green : C.red }}>
                              {formatPnl(pnl)} SOL
                            </p>
                          </>
                        ) : (
                          <p className="text-xs font-mono" style={{ color: C.textSec }}>
                            {trade.entrySol.toFixed(4)} SOL
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 gap-1">
                <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke={C.textMuted} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="20" x2="12" y2="10" />
                  <line x1="18" y1="20" x2="18" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="16" />
                </svg>
                <p className="text-xs font-medium" style={{ color: C.textMuted }}>No trades yet</p>
              </div>
            )}
          </Panel>

          {/* Full Trade History (collapsible) */}
          {tradeHistory.length > 5 && (
            <TradeHistoryPanel trades={tradeHistory} />
          )}
        </div>
      </div>

      {/* ═══ MODALS ═══ */}
      {showDeposit && walletAddress && (
        <DepositModal publicKey={walletAddress} onClose={() => setShowDeposit(false)} />
      )}
      {showImport && (
        <ImportKeyModal onClose={() => setShowImport(false)} onSuccess={() => setShowImport(false)} />
      )}
      {showWithdraw && (
        <WithdrawModal
          onClose={() => { setShowWithdraw(false); fetchBalance(); }}
          balanceSol={balanceSol}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}

/* ───────────────────────── Trade History (expandable) ───────────────────────── */

function TradeHistoryPanel({ trades }: { trades: TradeHistoryItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const displayed = expanded ? trades : trades.slice(0, 10);

  return (
    <Panel>
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Trade History</SectionLabel>
        <button
          onClick={() => exportTradesToCsv(trades)}
          className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide"
          style={{ color: C.textMuted }}
        >
          <IconDownload size={10} /> Export
        </button>
      </div>

      <div className="space-y-1">
        {displayed.map((trade) => {
          const holdTimeMs = trade.exitTimestamp && trade.entryTimestamp
            ? new Date(trade.exitTimestamp).getTime() - new Date(trade.entryTimestamp).getTime()
            : 0;
          const pnl = trade.pnlSol ?? 0;
          const pnlPct = trade.pnlPercent ?? 0;
          const isProfit = pnl >= 0;

          return (
            <div
              key={trade.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg"
              style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
            >
              <div className="flex items-center gap-2 min-w-0">
                {trade.token.imageUri ? (
                  <img src={trade.token.imageUri} alt="" className="w-5 h-5 rounded-full flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: C.bgPanel }} />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold font-mono truncate" style={{ color: C.text }}>
                    ${trade.token.ticker}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] font-mono" style={{ color: C.textMuted }}>
                    <span>In: {trade.entrySol.toFixed(4)}</span>
                    <span>Out: {trade.exitSol?.toFixed(4) ?? "--"}</span>
                    <span>{formatHoldTime(holdTimeMs)}</span>
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <p className="text-xs font-bold font-mono" style={{ color: isProfit ? C.green : C.red }}>
                  {formatPnlPercent(pnlPct)}
                </p>
                <p className="text-[10px] font-mono" style={{ color: isProfit ? C.green : C.red }}>
                  {formatPnl(pnl)} SOL
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {trades.length > 10 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-2 py-1.5 flex items-center justify-center gap-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
          style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.textMuted }}
        >
          {expanded ? "Show Less" : `Show All ${trades.length} Trades`}
          <span style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-flex" }}>
            <IconChevronDown size={10} />
          </span>
        </button>
      )}
    </Panel>
  );
}
