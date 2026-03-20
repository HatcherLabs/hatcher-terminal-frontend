"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

/* ──────────────────────── Types ──────────────────────── */

type Tab = "leaderboard" | "configs" | "history";

type LeaderboardSortKey = "pnl" | "winRate" | "trades" | "followers";

interface LeaderboardTrader {
  address: string;
  label: string;
  style: string;
  pnl30d: number;
  winRate: number;
  totalTrades: number;
  avgHoldTime: string;
  lastActive: string;
  isFollowed: boolean;
  followers: number;
}

interface CopyConfig {
  walletAddress: string;
  amountSol: number;
  slippageBps: number;
  maxPerTrade: number;
  enabled: boolean;
  copyBuys: boolean;
  copySells: boolean;
  createdAt: string;
}

interface CopyHistoryEntry {
  id: string;
  walletAddress: string;
  walletLabel: string;
  mintAddress: string;
  tokenTicker: string;
  side: "BUY" | "SELL";
  amountSol: number;
  status: string;
  reason?: string;
  timestamp: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/* ──────────────────────── Helpers ──────────────────────── */

function pnlColor(value: number): string {
  return value >= 0 ? "#00d672" : "#f23645";
}

function statusColor(status: string): { bg: string; text: string } {
  switch (status.toLowerCase()) {
    case "copied":
    case "success":
      return { bg: "rgba(0,214,114,0.12)", text: "#00d672" };
    case "pending":
      return { bg: "rgba(240,160,0,0.12)", text: "#f0a000" };
    case "failed":
    case "error":
      return { bg: "rgba(242,54,69,0.12)", text: "#f23645" };
    case "skipped":
      return { bg: "rgba(92,99,128,0.12)", text: "#5c6380" };
    default:
      return { bg: "rgba(92,99,128,0.12)", text: "#5c6380" };
  }
}

function sideStyle(side: "BUY" | "SELL"): { bg: string; text: string } {
  return side === "BUY"
    ? { bg: "rgba(0,214,114,0.12)", text: "#00d672" }
    : { bg: "rgba(242,54,69,0.12)", text: "#f23645" };
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

/* ──────────────────────── Skeleton Loaders ──────────────────────── */

function TableSkeletonRows({ rows = 6, cols = 7 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri} style={{ borderBottom: "1px solid #10131c" }}>
          {Array.from({ length: cols }).map((_, ci) => (
            <td key={ci} style={{ padding: "8px 12px" }}>
              <Skeleton className="h-4 rounded" style={{ width: ci === 0 ? 40 : 60 + Math.random() * 40 }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function ConfigSkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            backgroundColor: "#0a0d14",
            border: "1px solid #1a1f2e",
            borderRadius: 8,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Skeleton className="h-4 w-[120px] rounded" />
            <Skeleton className="h-4 w-[60px] rounded" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j}>
                <Skeleton className="h-3 w-[60px] rounded" style={{ marginBottom: 4 }} />
                <Skeleton className="h-4 w-[80px] rounded" />
              </div>
            ))}
          </div>
          <Skeleton className="h-8 w-full rounded" />
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────── Configure Modal ──────────────────────── */

function ConfigureModal({
  walletAddress,
  existingConfig,
  onClose,
  onSave,
  saving,
}: {
  walletAddress: string;
  existingConfig?: CopyConfig | null;
  onClose: () => void;
  onSave: (config: { walletAddress: string; amountSol: number; slippageBps: number; maxPerTrade: number; copyBuys: boolean; copySells: boolean }) => void;
  saving: boolean;
}) {
  const [amountSol, setAmountSol] = useState(existingConfig?.amountSol ?? 0.5);
  const [slippageBps, setSlippageBps] = useState(existingConfig?.slippageBps ?? 300);
  const [maxPerTrade, setMaxPerTrade] = useState(existingConfig?.maxPerTrade ?? 5);
  const [copyBuys, setCopyBuys] = useState(existingConfig?.copyBuys ?? true);
  const [copySells, setCopySells] = useState(existingConfig?.copySells ?? true);

  const labelStyle: React.CSSProperties = {
    fontFamily: "Lexend, sans-serif",
    fontSize: 11,
    color: "#5c6380",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 4,
    display: "block",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 13,
    color: "#eef0f6",
    backgroundColor: "#10131c",
    border: "1px solid #1a1f2e",
    borderRadius: 6,
    outline: "none",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(4,6,11,0.8)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: "#0a0d14",
          border: "1px solid #1a1f2e",
          borderRadius: 12,
          padding: 24,
          width: "100%",
          maxWidth: 420,
          margin: "0 16px",
        }}
      >
        <h3
          style={{
            fontFamily: "Lexend, sans-serif",
            fontSize: 16,
            fontWeight: 700,
            color: "#eef0f6",
            margin: "0 0 4px 0",
          }}
        >
          {existingConfig ? "Edit Copy Config" : "Configure Copy Trading"}
        </h3>
        <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#5c6380", margin: "0 0 20px 0" }}>
          {truncateAddress(walletAddress)}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Amount per trade */}
          <div>
            <label style={labelStyle}>Amount per trade (SOL)</label>
            <input
              type="number"
              step="0.1"
              min="0.01"
              value={amountSol}
              onChange={(e) => setAmountSol(parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>

          {/* Slippage */}
          <div>
            <label style={labelStyle}>Slippage (bps)</label>
            <input
              type="number"
              step="50"
              min="0"
              value={slippageBps}
              onChange={(e) => setSlippageBps(parseInt(e.target.value) || 0)}
              style={inputStyle}
            />
            <span style={{ fontFamily: "Lexend, sans-serif", fontSize: 10, color: "#363d54", marginTop: 2, display: "block" }}>
              {(slippageBps / 100).toFixed(1)}%
            </span>
          </div>

          {/* Max per trade */}
          <div>
            <label style={labelStyle}>Max per trade (SOL)</label>
            <input
              type="number"
              step="0.5"
              min="0.01"
              value={maxPerTrade}
              onChange={(e) => setMaxPerTrade(parseFloat(e.target.value) || 0)}
              style={inputStyle}
            />
          </div>

          {/* Copy buys / sells toggles */}
          <div style={{ display: "flex", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={copyBuys}
                onChange={(e) => setCopyBuys(e.target.checked)}
                style={{ accentColor: "#8b5cf6" }}
              />
              <span style={{ fontFamily: "Lexend, sans-serif", fontSize: 12, color: "#9ca3b8" }}>Copy Buys</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={copySells}
                onChange={(e) => setCopySells(e.target.checked)}
                style={{ accentColor: "#8b5cf6" }}
              />
              <span style={{ fontFamily: "Lexend, sans-serif", fontSize: 12, color: "#9ca3b8" }}>Copy Sells</span>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              fontFamily: "Lexend, sans-serif",
              fontSize: 12,
              fontWeight: 600,
              padding: "8px 0",
              borderRadius: 6,
              border: "1px solid #1a1f2e",
              backgroundColor: "transparent",
              color: "#9ca3b8",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ walletAddress, amountSol, slippageBps, maxPerTrade, copyBuys, copySells })}
            disabled={saving}
            style={{
              flex: 1,
              fontFamily: "Lexend, sans-serif",
              fontSize: 12,
              fontWeight: 600,
              padding: "8px 0",
              borderRadius: 6,
              border: "none",
              backgroundColor: saving ? "#363d54" : "#8b5cf6",
              color: "#eef0f6",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : existingConfig ? "Update" : "Follow & Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────── Leaderboard ──────────────────────── */

function Leaderboard({
  traders,
  loading,
  error,
  sortKey,
  onSortChange,
  onFollow,
  onUnfollow,
  configAddresses,
}: {
  traders: LeaderboardTrader[];
  loading: boolean;
  error: string | null;
  sortKey: LeaderboardSortKey;
  onSortChange: (key: LeaderboardSortKey) => void;
  onFollow: (address: string) => void;
  onUnfollow: (address: string) => void;
  configAddresses: Set<string>;
}) {
  const headerStyle: React.CSSProperties = {
    padding: "8px 12px",
    textAlign: "left",
    fontFamily: "Lexend, sans-serif",
    fontSize: 11,
    fontWeight: 500,
    color: "#5c6380",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  };

  const cellStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 13,
    color: "#eef0f6",
    whiteSpace: "nowrap",
  };

  const sortLabel = (key: LeaderboardSortKey, label: string) => {
    const active = sortKey === key;
    return (
      <span>
        {label}{active ? " \u25BC" : ""}
      </span>
    );
  };

  return (
    <div style={{ backgroundColor: "#0a0d14", border: "1px solid #1a1f2e", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1f2e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontFamily: "Lexend, sans-serif", fontSize: 14, fontWeight: 600, color: "#eef0f6", margin: 0 }}>
          TOP TRADERS LEADERBOARD
        </h2>
        {/* Sort pills */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["pnl", "winRate", "trades", "followers"] as LeaderboardSortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => onSortChange(key)}
              style={{
                fontFamily: "Lexend, sans-serif",
                fontSize: 10,
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: 4,
                border: sortKey === key ? "1px solid #8b5cf6" : "1px solid #1a1f2e",
                backgroundColor: sortKey === key ? "rgba(139,92,246,0.12)" : "transparent",
                color: sortKey === key ? "#8b5cf6" : "#5c6380",
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              {key === "pnl" ? "PnL" : key === "winRate" ? "Win%" : key === "trades" ? "Trades" : "Followers"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: 16, textAlign: "center" }}>
          <p style={{ fontFamily: "Lexend, sans-serif", fontSize: 13, color: "#f23645", margin: 0 }}>
            {error}
          </p>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1a1f2e" }}>
              <th style={{ ...headerStyle, cursor: "default" }}>Trader</th>
              <th style={headerStyle} onClick={() => onSortChange("winRate")}>{sortLabel("winRate", "Win Rate")}</th>
              <th style={headerStyle} onClick={() => onSortChange("pnl")}>{sortLabel("pnl", "PnL (30d)")}</th>
              <th style={{ ...headerStyle, cursor: "default" }}>Avg Hold</th>
              <th style={headerStyle} onClick={() => onSortChange("trades")}>{sortLabel("trades", "Trades")}</th>
              <th style={headerStyle} onClick={() => onSortChange("followers")}>{sortLabel("followers", "Followers")}</th>
              <th style={{ ...headerStyle, cursor: "default" }}>Last Active</th>
              <th style={{ ...headerStyle, cursor: "default", textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeletonRows rows={8} cols={8} />
            ) : traders.length === 0 && !error ? (
              <tr>
                <td colSpan={8} style={{ padding: 32, textAlign: "center" }}>
                  <span style={{ fontFamily: "Lexend, sans-serif", fontSize: 13, color: "#5c6380" }}>
                    No traders found.
                  </span>
                </td>
              </tr>
            ) : (
              traders.map((t, idx) => {
                const isFollowed = configAddresses.has(t.address);
                return (
                  <tr
                    key={t.address}
                    style={{ borderBottom: "1px solid #10131c", cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#10131c"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <td style={cellStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#5c6380", fontWeight: 600, fontSize: 11, minWidth: 20 }}>{idx + 1}</span>
                        <div>
                          <div style={{ color: "#eef0f6", fontWeight: 600, fontSize: 13 }}>
                            {t.label || truncateAddress(t.address)}
                          </div>
                          {t.label && (
                            <div style={{ color: "#363d54", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}>
                              {truncateAddress(t.address)}
                            </div>
                          )}
                        </div>
                        {t.style && (
                          <span
                            style={{
                              fontFamily: "Lexend, sans-serif",
                              fontSize: 9,
                              padding: "1px 6px",
                              borderRadius: 3,
                              backgroundColor: "rgba(139,92,246,0.12)",
                              color: "#8b5cf6",
                              fontWeight: 600,
                              textTransform: "uppercase",
                            }}
                          >
                            {t.style}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ ...cellStyle, color: t.winRate >= 60 ? "#00d672" : t.winRate >= 50 ? "#f0a000" : "#f23645" }}>
                      {t.winRate.toFixed(1)}%
                    </td>
                    <td style={{ ...cellStyle, color: pnlColor(t.pnl30d) }}>
                      {t.pnl30d >= 0 ? "+" : ""}{t.pnl30d.toFixed(1)} SOL
                    </td>
                    <td style={{ ...cellStyle, color: "#9ca3b8" }}>{t.avgHoldTime}</td>
                    <td style={cellStyle}>{t.totalTrades.toLocaleString()}</td>
                    <td style={{ ...cellStyle, color: "#9ca3b8" }}>{t.followers.toLocaleString()}</td>
                    <td style={{ ...cellStyle, color: "#363d54", fontSize: 11 }}>{formatTimeAgo(t.lastActive)}</td>
                    <td style={{ ...cellStyle, textAlign: "right" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isFollowed) {
                            onUnfollow(t.address);
                          } else {
                            onFollow(t.address);
                          }
                        }}
                        style={{
                          fontFamily: "Lexend, sans-serif",
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "4px 12px",
                          borderRadius: 4,
                          border: isFollowed ? "1px solid #1a1f2e" : "none",
                          backgroundColor: isFollowed ? "transparent" : "#8b5cf6",
                          color: isFollowed ? "#f23645" : "#eef0f6",
                          cursor: "pointer",
                        }}
                      >
                        {isFollowed ? "Unfollow" : "Follow"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ──────────────────────── Config Card ──────────────────────── */

function ConfigCard({
  config,
  onEdit,
  onToggle,
  onRemove,
  busy,
}: {
  config: CopyConfig;
  onEdit: () => void;
  onToggle: () => void;
  onRemove: () => void;
  busy: boolean;
}) {
  const labelStyle: React.CSSProperties = {
    fontFamily: "Lexend, sans-serif",
    fontSize: 10,
    color: "#5c6380",
    textTransform: "uppercase",
    marginBottom: 2,
  };
  const valueStyle: React.CSSProperties = {
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 12,
    color: "#9ca3b8",
  };

  return (
    <div
      style={{
        backgroundColor: "#0a0d14",
        border: "1px solid #1a1f2e",
        borderRadius: 8,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        opacity: busy ? 0.6 : 1,
        pointerEvents: busy ? "none" : "auto",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, color: "#eef0f6", fontWeight: 600 }}>
          {truncateAddress(config.walletAddress)}
        </span>
        <span
          style={{
            fontFamily: "Lexend, sans-serif",
            fontSize: 10,
            color: config.enabled ? "#00d672" : "#f0a000",
            backgroundColor: config.enabled ? "rgba(0,214,114,0.12)" : "rgba(240,160,0,0.12)",
            padding: "2px 8px",
            borderRadius: 4,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          {config.enabled ? "Active" : "Paused"}
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <div style={labelStyle}>Per trade</div>
          <div style={valueStyle}>{config.amountSol} SOL</div>
        </div>
        <div>
          <div style={labelStyle}>Max per trade</div>
          <div style={valueStyle}>{config.maxPerTrade} SOL</div>
        </div>
        <div>
          <div style={labelStyle}>Slippage</div>
          <div style={valueStyle}>{(config.slippageBps / 100).toFixed(1)}%</div>
        </div>
        <div>
          <div style={labelStyle}>Following since</div>
          <div style={valueStyle}>{new Date(config.createdAt).toLocaleDateString()}</div>
        </div>
        <div>
          <div style={labelStyle}>Copy buys</div>
          <div style={{ ...valueStyle, color: config.copyBuys ? "#00d672" : "#f23645" }}>
            {config.copyBuys ? "Yes" : "No"}
          </div>
        </div>
        <div>
          <div style={labelStyle}>Copy sells</div>
          <div style={{ ...valueStyle, color: config.copySells ? "#00d672" : "#f23645" }}>
            {config.copySells ? "Yes" : "No"}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onEdit}
          style={{
            flex: 1,
            fontFamily: "Lexend, sans-serif",
            fontSize: 11,
            fontWeight: 600,
            padding: "6px 0",
            borderRadius: 4,
            border: "1px solid #1a1f2e",
            backgroundColor: "rgba(139,92,246,0.08)",
            color: "#8b5cf6",
            cursor: "pointer",
          }}
        >
          Edit
        </button>
        <button
          onClick={onToggle}
          style={{
            flex: 1,
            fontFamily: "Lexend, sans-serif",
            fontSize: 11,
            fontWeight: 600,
            padding: "6px 0",
            borderRadius: 4,
            border: "1px solid #1a1f2e",
            backgroundColor: config.enabled ? "rgba(242,54,69,0.08)" : "rgba(0,214,114,0.08)",
            color: config.enabled ? "#f23645" : "#00d672",
            cursor: "pointer",
          }}
        >
          {config.enabled ? "Pause" : "Resume"}
        </button>
        <button
          onClick={onRemove}
          style={{
            fontFamily: "Lexend, sans-serif",
            fontSize: 11,
            fontWeight: 600,
            padding: "6px 12px",
            borderRadius: 4,
            border: "1px solid #1a1f2e",
            backgroundColor: "rgba(242,54,69,0.08)",
            color: "#f23645",
            cursor: "pointer",
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────── My Configs Tab ──────────────────────── */

function MyConfigsTab({
  configs,
  loading,
  error,
  onEdit,
  onToggle,
  onRemove,
  busyAddress,
}: {
  configs: CopyConfig[];
  loading: boolean;
  error: string | null;
  onEdit: (address: string) => void;
  onToggle: (config: CopyConfig) => void;
  onRemove: (address: string) => void;
  busyAddress: string | null;
}) {
  if (loading) return <ConfigSkeletonCards />;

  if (error) {
    return (
      <div style={{ backgroundColor: "#0a0d14", border: "1px solid #1a1f2e", borderRadius: 8, padding: 32, textAlign: "center" }}>
        <p style={{ fontFamily: "Lexend, sans-serif", fontSize: 13, color: "#f23645", margin: 0 }}>{error}</p>
      </div>
    );
  }

  if (configs.length === 0) {
    return (
      <div style={{ backgroundColor: "#0a0d14", border: "1px solid #1a1f2e", borderRadius: 8, padding: 32, textAlign: "center" }}>
        <p style={{ fontFamily: "Lexend, sans-serif", fontSize: 13, color: "#5c6380", margin: 0 }}>
          No copy configs yet. Follow a trader from the Leaderboard to get started.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
      {configs.map((c) => (
        <ConfigCard
          key={c.walletAddress}
          config={c}
          onEdit={() => onEdit(c.walletAddress)}
          onToggle={() => onToggle(c)}
          onRemove={() => onRemove(c.walletAddress)}
          busy={busyAddress === c.walletAddress}
        />
      ))}
    </div>
  );
}

/* ──────────────────────── History Tab ──────────────────────── */

function HistoryTab({
  history,
  loading,
  error,
}: {
  history: CopyHistoryEntry[];
  loading: boolean;
  error: string | null;
}) {
  const headerStyle: React.CSSProperties = {
    padding: "8px 12px",
    textAlign: "left",
    fontFamily: "Lexend, sans-serif",
    fontSize: 11,
    fontWeight: 500,
    color: "#5c6380",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
  };

  const cellStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 13,
    color: "#eef0f6",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ backgroundColor: "#0a0d14", border: "1px solid #1a1f2e", borderRadius: 8, overflow: "hidden" }}>
      {error && (
        <div style={{ padding: 16, textAlign: "center" }}>
          <p style={{ fontFamily: "Lexend, sans-serif", fontSize: 13, color: "#f23645", margin: 0 }}>{error}</p>
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1a1f2e" }}>
              <th style={headerStyle}>Time</th>
              <th style={headerStyle}>Wallet</th>
              <th style={headerStyle}>Token</th>
              <th style={headerStyle}>Side</th>
              <th style={headerStyle}>Amount</th>
              <th style={headerStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeletonRows rows={6} cols={6} />
            ) : history.length === 0 && !error ? (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: "center" }}>
                  <span style={{ fontFamily: "Lexend, sans-serif", fontSize: 13, color: "#5c6380" }}>
                    No copy trade history yet.
                  </span>
                </td>
              </tr>
            ) : (
              history.map((t) => {
                const side = sideStyle(t.side);
                const st = statusColor(t.status);
                return (
                  <tr key={t.id} style={{ borderBottom: "1px solid #10131c" }}>
                    <td style={{ ...cellStyle, color: "#5c6380", fontSize: 12 }}>{formatTimeAgo(t.timestamp)}</td>
                    <td style={{ ...cellStyle, color: "#9ca3b8" }}>
                      {t.walletLabel || truncateAddress(t.walletAddress)}
                    </td>
                    <td style={{ ...cellStyle, color: "#eef0f6", fontWeight: 600 }}>
                      ${t.tokenTicker}
                    </td>
                    <td style={cellStyle}>
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: 10,
                          fontFamily: "Lexend, sans-serif",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 4,
                          backgroundColor: side.bg,
                          color: side.text,
                          textTransform: "uppercase",
                        }}
                      >
                        {t.side}
                      </span>
                    </td>
                    <td style={cellStyle}>{t.amountSol} SOL</td>
                    <td style={cellStyle}>
                      <span
                        title={t.reason || undefined}
                        style={{
                          display: "inline-block",
                          fontSize: 10,
                          fontFamily: "Lexend, sans-serif",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 4,
                          backgroundColor: st.bg,
                          color: st.text,
                          cursor: t.reason ? "help" : "default",
                        }}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ──────────────────────── Page ──────────────────────── */

export default function CopyTradePage() {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("leaderboard");

  // Leaderboard state
  const [traders, setTraders] = useState<LeaderboardTrader[]>([]);
  const [tradersLoading, setTradersLoading] = useState(true);
  const [tradersError, setTradersError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<LeaderboardSortKey>("pnl");

  // Configs state
  const [configs, setConfigs] = useState<CopyConfig[]>([]);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [configsError, setConfigsError] = useState<string | null>(null);
  const [busyConfigAddress, setBusyConfigAddress] = useState<string | null>(null);

  // History state
  const [history, setHistory] = useState<CopyHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Modal state
  const [modalAddress, setModalAddress] = useState<string | null>(null);
  const [modalSaving, setModalSaving] = useState(false);

  const configAddresses = useMemo(
    () => new Set(configs.map((c) => c.walletAddress)),
    [configs],
  );

  const modalExistingConfig = useMemo(
    () => (modalAddress ? configs.find((c) => c.walletAddress === modalAddress) ?? null : null),
    [modalAddress, configs],
  );

  /* ── Fetch leaderboard ── */
  const fetchLeaderboard = useCallback(async (sort: LeaderboardSortKey) => {
    setTradersLoading(true);
    setTradersError(null);
    try {
      const res = await api.get<ApiResponse<LeaderboardTrader[]>>(
        `/api/copy-trade/leaderboard?sort=${sort}&limit=20`,
      );
      setTraders(res.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load leaderboard";
      setTradersError(msg);
    } finally {
      setTradersLoading(false);
    }
  }, []);

  /* ── Fetch configs ── */
  const fetchConfigs = useCallback(async () => {
    setConfigsLoading(true);
    setConfigsError(null);
    try {
      const res = await api.get<ApiResponse<CopyConfig[]>>("/api/copy-trade/configs");
      setConfigs(res.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load configs";
      setConfigsError(msg);
    } finally {
      setConfigsLoading(false);
    }
  }, []);

  /* ── Fetch history ── */
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await api.get<ApiResponse<CopyHistoryEntry[]>>("/api/copy-trade/history?limit=30");
      setHistory(res.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load history";
      setHistoryError(msg);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  /* ── Initial load ── */
  useEffect(() => {
    fetchLeaderboard(sortKey);
    fetchConfigs();
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Refetch leaderboard on sort change ── */
  useEffect(() => {
    fetchLeaderboard(sortKey);
  }, [sortKey, fetchLeaderboard]);

  /* ── Sort change handler ── */
  const handleSortChange = useCallback((key: LeaderboardSortKey) => {
    setSortKey(key);
  }, []);

  /* ── Follow: opens config modal ── */
  const handleFollow = useCallback((address: string) => {
    setModalAddress(address);
  }, []);

  /* ── Unfollow ── */
  const handleUnfollow = useCallback(async (address: string) => {
    try {
      await api.delete(`/api/copy-trade/configs/${address}`);
      setConfigs((prev) => prev.filter((c) => c.walletAddress !== address));
      toast.add("Unfollowed trader", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to unfollow";
      toast.add(msg, "error");
    }
  }, [toast]);

  /* ── Save config (create/update) ── */
  const handleSaveConfig = useCallback(async (config: {
    walletAddress: string;
    amountSol: number;
    slippageBps: number;
    maxPerTrade: number;
    copyBuys: boolean;
    copySells: boolean;
  }) => {
    setModalSaving(true);
    try {
      await api.post<ApiResponse<CopyConfig>>("/api/copy-trade/configs", config);
      await fetchConfigs();
      setModalAddress(null);
      toast.add(
        configAddresses.has(config.walletAddress) ? "Config updated" : "Now following trader",
        "success",
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save config";
      toast.add(msg, "error");
    } finally {
      setModalSaving(false);
    }
  }, [fetchConfigs, toast, configAddresses]);

  /* ── Toggle enabled ── */
  const handleToggleConfig = useCallback(async (config: CopyConfig) => {
    setBusyConfigAddress(config.walletAddress);
    try {
      await api.post<ApiResponse<CopyConfig>>("/api/copy-trade/configs", {
        walletAddress: config.walletAddress,
        amountSol: config.amountSol,
        slippageBps: config.slippageBps,
        maxPerTrade: config.maxPerTrade,
        copyBuys: config.copyBuys,
        copySells: config.copySells,
        enabled: !config.enabled,
      });
      setConfigs((prev) =>
        prev.map((c) =>
          c.walletAddress === config.walletAddress ? { ...c, enabled: !c.enabled } : c,
        ),
      );
      toast.add(config.enabled ? "Paused copying" : "Resumed copying", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update config";
      toast.add(msg, "error");
    } finally {
      setBusyConfigAddress(null);
    }
  }, [toast]);

  /* ── Remove config ── */
  const handleRemoveConfig = useCallback(async (address: string) => {
    setBusyConfigAddress(address);
    try {
      await api.delete(`/api/copy-trade/configs/${address}`);
      setConfigs((prev) => prev.filter((c) => c.walletAddress !== address));
      toast.add("Removed copy config", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove config";
      toast.add(msg, "error");
    } finally {
      setBusyConfigAddress(null);
    }
  }, [toast]);

  /* ── Edit config: open modal ── */
  const handleEditConfig = useCallback((address: string) => {
    setModalAddress(address);
  }, []);

  /* ── Tab styles ── */
  const tabs: { label: string; value: Tab }[] = [
    { label: "Leaderboard", value: "leaderboard" },
    { label: "My Copy Configs", value: "configs" },
    { label: "Trade History", value: "history" },
  ];

  return (
    <ErrorBoundary fallbackTitle="Copy Trading failed to load">
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#04060b",
          padding: "24px 16px",
          maxWidth: 1200,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {/* Page Header */}
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontFamily: "Lexend, sans-serif",
              fontSize: 20,
              fontWeight: 700,
              color: "#eef0f6",
              margin: 0,
              letterSpacing: "0.04em",
            }}
          >
            COPY TRADING
          </h1>
          <p
            style={{
              fontFamily: "Lexend, sans-serif",
              fontSize: 13,
              color: "#5c6380",
              margin: "4px 0 0 0",
            }}
          >
            Follow top wallets and mirror their trades
          </p>
        </div>

        {/* Tab Bar */}
        <div
          style={{
            display: "flex",
            gap: 0,
            marginBottom: 24,
            borderBottom: "1px solid #1a1f2e",
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                style={{
                  fontFamily: "Lexend, sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "10px 20px",
                  color: isActive ? "#eef0f6" : "#5c6380",
                  backgroundColor: "transparent",
                  border: "none",
                  borderBottom: isActive ? "2px solid #8b5cf6" : "2px solid transparent",
                  cursor: "pointer",
                  transition: "color 0.15s, border-color 0.15s",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "leaderboard" && (
          <Leaderboard
            traders={traders}
            loading={tradersLoading}
            error={tradersError}
            sortKey={sortKey}
            onSortChange={handleSortChange}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
            configAddresses={configAddresses}
          />
        )}

        {activeTab === "configs" && (
          <MyConfigsTab
            configs={configs}
            loading={configsLoading}
            error={configsError}
            onEdit={handleEditConfig}
            onToggle={handleToggleConfig}
            onRemove={handleRemoveConfig}
            busyAddress={busyConfigAddress}
          />
        )}

        {activeTab === "history" && (
          <HistoryTab
            history={history}
            loading={historyLoading}
            error={historyError}
          />
        )}

        {/* Configure Modal */}
        {modalAddress && (
          <ConfigureModal
            walletAddress={modalAddress}
            existingConfig={modalExistingConfig}
            onClose={() => setModalAddress(null)}
            onSave={handleSaveConfig}
            saving={modalSaving}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
