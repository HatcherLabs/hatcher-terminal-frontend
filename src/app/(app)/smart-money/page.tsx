"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { api } from "@/lib/api";

/* ──────────────────────── Palette ──────────────────────── */

const C = {
  bg0: "#04060b",
  bg1: "#0a0d14",
  bg2: "#10131c",
  bg3: "#181c28",
  bg4: "#1f2435",
  bd: "#1a1f2e",
  t0: "#eef0f6",
  t1: "#9ca3b8",
  t2: "#5c6380",
  t3: "#363d54",
  g: "#00d672",
  r: "#f23645",
  a: "#f0a000",
  b: "#3b82f6",
  ac: "#8b5cf6",
} as const;

/* ──────────────────────── Types ──────────────────────── */

type WalletLabel = "Sniper" | "Diamond Hands" | "Whale" | "Flipper";
type MainTab = "wallets" | "trades";
type WalletSortKey = "pnl30d" | "winRate" | "volume30d" | "lastActive";
type SortDir = "asc" | "desc";

interface SmartWallet {
  rank: number;
  address: string;
  label: WalletLabel;
  pnl30d: number;
  winRate: number;
  totalTrades: number;
  volume30d: number;
  avgHoldTime: string;
  lastActive: string;
  followed: boolean;
}

interface RecentTrade {
  id: string;
  walletAddress: string;
  walletLabel: WalletLabel;
  side: "BUY" | "SELL";
  tokenTicker: string;
  tokenAvatar: string;
  amountSol: number;
  timeAgo: string;
  tokenSlug: string;
}

/* ──────────────────────── Mock Data ──────────────────────── */

const MOCK_WALLETS: SmartWallet[] = [
  { rank: 1, address: "7xKpR4nQ8dWv2eJm5tYb3LcFh9sAoG6kP", label: "Sniper", pnl30d: 284.3, winRate: 82.1, totalTrades: 347, volume30d: 1820, avgHoldTime: "12m", lastActive: "2m ago", followed: false },
  { rank: 2, address: "9bRqU7vC1zXe6fNw4mTk8pDjHa5sLyW3n", label: "Whale", pnl30d: 197.6, winRate: 71.4, totalTrades: 128, volume30d: 4250, avgHoldTime: "6h 30m", lastActive: "8m ago", followed: false },
  { rank: 3, address: "4dLeM2yF8gBn3xVr9kQw7cZj1tPa6sHuE", label: "Diamond Hands", pnl30d: 156.2, winRate: 68.9, totalTrades: 89, volume30d: 920, avgHoldTime: "3d 4h", lastActive: "1h ago", followed: false },
  { rank: 4, address: "2fNsK6wT4hAp8rXm1jYe3bDv5gCq9zLuR", label: "Flipper", pnl30d: 134.8, winRate: 76.3, totalTrades: 512, volume30d: 2100, avgHoldTime: "8m", lastActive: "30s ago", followed: false },
  { rank: 5, address: "8cHmG3qJ9eWx1vBn5sYk7dRf2tAp4zLuN", label: "Sniper", pnl30d: 112.5, winRate: 79.8, totalTrades: 203, volume30d: 1340, avgHoldTime: "15m", lastActive: "5m ago", followed: false },
  { rank: 6, address: "3gVtL5nD7yCp2xWk8fBm1rZj4sEa6hQuT", label: "Whale", pnl30d: 98.1, winRate: 64.2, totalTrades: 76, volume30d: 5870, avgHoldTime: "12h 15m", lastActive: "22m ago", followed: false },
  { rank: 7, address: "6jZqX9mA1kRe4wNv7cTs3pYb8dFh2gLuC", label: "Diamond Hands", pnl30d: 87.4, winRate: 62.7, totalTrades: 54, volume30d: 680, avgHoldTime: "5d 8h", lastActive: "3h ago", followed: false },
  { rank: 8, address: "1mXwP8eC3sKn6vBf4tYr2gAj9dHq7zLuW", label: "Flipper", pnl30d: 73.9, winRate: 74.1, totalTrades: 891, volume30d: 3420, avgHoldTime: "5m", lastActive: "1m ago", followed: false },
  { rank: 9, address: "5aPyN2kG7hWm9xVt4cBe1rDj6sQf3zLuK", label: "Sniper", pnl30d: 61.2, winRate: 77.5, totalTrades: 167, volume30d: 890, avgHoldTime: "18m", lastActive: "14m ago", followed: false },
  { rank: 10, address: "0eUiH4wB6mRp3xNk8dYf1tCj9sAv5gLuZ", label: "Whale", pnl30d: 48.7, winRate: 59.8, totalTrades: 93, volume30d: 7120, avgHoldTime: "1d 2h", lastActive: "45m ago", followed: false },
  { rank: 11, address: "BpR7xKq3nW2eJm5vYb8LcFhAoG9sP6dTk", label: "Flipper", pnl30d: 34.1, winRate: 71.6, totalTrades: 623, volume30d: 1980, avgHoldTime: "6m", lastActive: "3m ago", followed: false },
  { rank: 12, address: "CvT1zXe6fN4mwk8pDjH5sLyW3bRqU9aQn", label: "Diamond Hands", pnl30d: 22.8, winRate: 58.3, totalTrades: 41, volume30d: 540, avgHoldTime: "8d 12h", lastActive: "6h ago", followed: false },
  { rank: 13, address: "DyF8gBn3x2r9kQw7Zj1tcPa6sHuELeM4V", label: "Sniper", pnl30d: 15.4, winRate: 73.2, totalTrades: 289, volume30d: 1120, avgHoldTime: "10m", lastActive: "9m ago", followed: false },
  { rank: 14, address: "EwT4hAp8r1m1jYe3bv5gDCq9zLuRfNsK6X", label: "Whale", pnl30d: -8.3, winRate: 52.1, totalTrades: 67, volume30d: 8940, avgHoldTime: "2d 6h", lastActive: "2h ago", followed: false },
  { rank: 15, address: "FqJ9eWx1v5n5sBYk7dRf2tAp4zLuNcHmG3", label: "Flipper", pnl30d: -21.7, winRate: 61.4, totalTrades: 445, volume30d: 2670, avgHoldTime: "4m", lastActive: "18m ago", followed: false },
  { rank: 16, address: "GnD7yCp2x5k8fWBm1rZj4sEa6hQuTgVtL3", label: "Sniper", pnl30d: -35.2, winRate: 56.8, totalTrades: 198, volume30d: 760, avgHoldTime: "22m", lastActive: "41m ago", followed: false },
  { rank: 17, address: "HmA1kRe4w9v7cNTs3pYb8dFh2gLuCjZqX6", label: "Diamond Hands", pnl30d: -48.9, winRate: 49.5, totalTrades: 33, volume30d: 420, avgHoldTime: "12d 3h", lastActive: "1d ago", followed: false },
  { rank: 18, address: "JeC3sKn6v8f4tBYr2gAj9dHq7zLuWmXwP1", label: "Flipper", pnl30d: -62.4, winRate: 54.7, totalTrades: 378, volume30d: 1540, avgHoldTime: "7m", lastActive: "27m ago", followed: false },
];

const MOCK_TRADES: RecentTrade[] = [
  { id: "t1", walletAddress: "7xKp...R4nQ", walletLabel: "Sniper", side: "BUY", tokenTicker: "$WIF", tokenAvatar: "W", amountSol: 12.5, timeAgo: "30s ago", tokenSlug: "wif" },
  { id: "t2", walletAddress: "2fNs...K6wT", walletLabel: "Flipper", side: "SELL", tokenTicker: "$BONK", tokenAvatar: "B", amountSol: 8.2, timeAgo: "1m ago", tokenSlug: "bonk" },
  { id: "t3", walletAddress: "9bRq...U7vC", walletLabel: "Whale", side: "BUY", tokenTicker: "$POPCAT", tokenAvatar: "P", amountSol: 45.0, timeAgo: "2m ago", tokenSlug: "popcat" },
  { id: "t4", walletAddress: "8cHm...G3qJ", walletLabel: "Sniper", side: "BUY", tokenTicker: "$MEW", tokenAvatar: "M", amountSol: 6.8, timeAgo: "3m ago", tokenSlug: "mew" },
  { id: "t5", walletAddress: "1mXw...P8eC", walletLabel: "Flipper", side: "SELL", tokenTicker: "$MYRO", tokenAvatar: "M", amountSol: 3.1, timeAgo: "4m ago", tokenSlug: "myro" },
  { id: "t6", walletAddress: "4dLe...M2yF", walletLabel: "Diamond Hands", side: "BUY", tokenTicker: "$SLERF", tokenAvatar: "S", amountSol: 22.0, timeAgo: "6m ago", tokenSlug: "slerf" },
  { id: "t7", walletAddress: "7xKp...R4nQ", walletLabel: "Sniper", side: "SELL", tokenTicker: "$BOME", tokenAvatar: "B", amountSol: 15.3, timeAgo: "8m ago", tokenSlug: "bome" },
  { id: "t8", walletAddress: "3gVt...L5nD", walletLabel: "Whale", side: "BUY", tokenTicker: "$TNSR", tokenAvatar: "T", amountSol: 78.4, timeAgo: "11m ago", tokenSlug: "tnsr" },
  { id: "t9", walletAddress: "BpR7...xKq3", walletLabel: "Flipper", side: "BUY", tokenTicker: "$DEGODS", tokenAvatar: "D", amountSol: 4.7, timeAgo: "14m ago", tokenSlug: "degods" },
  { id: "t10", walletAddress: "5aPy...N2kG", walletLabel: "Sniper", side: "BUY", tokenTicker: "$JUP", tokenAvatar: "J", amountSol: 9.9, timeAgo: "18m ago", tokenSlug: "jup" },
  { id: "t11", walletAddress: "0eUi...H4wB", walletLabel: "Whale", side: "SELL", tokenTicker: "$PYTH", tokenAvatar: "P", amountSol: 120.0, timeAgo: "22m ago", tokenSlug: "pyth" },
  { id: "t12", walletAddress: "6jZq...X9mA", walletLabel: "Diamond Hands", side: "BUY", tokenTicker: "$RENDER", tokenAvatar: "R", amountSol: 35.6, timeAgo: "31m ago", tokenSlug: "render" },
  { id: "t13", walletAddress: "2fNs...K6wT", walletLabel: "Flipper", side: "BUY", tokenTicker: "$SAMO", tokenAvatar: "S", amountSol: 2.4, timeAgo: "38m ago", tokenSlug: "samo" },
  { id: "t14", walletAddress: "DyF8...gBn3", walletLabel: "Sniper", side: "SELL", tokenTicker: "$WEN", tokenAvatar: "W", amountSol: 7.1, timeAgo: "45m ago", tokenSlug: "wen" },
  { id: "t15", walletAddress: "9bRq...U7vC", walletLabel: "Whale", side: "BUY", tokenTicker: "$DRIFT", tokenAvatar: "D", amountSol: 56.2, timeAgo: "52m ago", tokenSlug: "drift" },
];

/* ──────────────────────── Helpers ──────────────────────── */

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function pnlColor(v: number): string {
  return v >= 0 ? C.g : C.r;
}

function pnlText(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)} SOL`;
}

function labelStyle(label: WalletLabel): { bg: string; text: string } {
  switch (label) {
    case "Sniper":
      return { bg: "rgba(139,92,246,0.14)", text: C.ac };
    case "Diamond Hands":
      return { bg: "rgba(59,130,246,0.14)", text: C.b };
    case "Whale":
      return { bg: "rgba(240,160,0,0.14)", text: C.a };
    case "Flipper":
      return { bg: "rgba(0,214,114,0.14)", text: C.g };
  }
}

function sideStyle(side: "BUY" | "SELL"): { bg: string; text: string } {
  return side === "BUY"
    ? { bg: "rgba(0,214,114,0.12)", text: C.g }
    : { bg: "rgba(242,54,69,0.12)", text: C.r };
}

function parseTimeAgo(t: string): number {
  const m = t.match(/(\d+)\s*(s|m|h|d)/);
  if (!m) return Infinity;
  const v = parseInt(m[1], 10);
  const unit = m[2];
  if (unit === "s") return v;
  if (unit === "m") return v * 60;
  if (unit === "h") return v * 3600;
  return v * 86400;
}

/* ──────────────────────── Shared Styles ──────────────────────── */

const FONT_LABEL: React.CSSProperties = {
  fontFamily: "Lexend, sans-serif",
  fontSize: 10,
  fontWeight: 500,
  color: C.t2,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const FONT_DATA: React.CSSProperties = {
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 13,
  color: C.t0,
};

const TH: React.CSSProperties = {
  padding: "8px 12px",
  textAlign: "left",
  fontFamily: "Lexend, sans-serif",
  fontSize: 11,
  fontWeight: 500,
  color: C.t2,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  whiteSpace: "nowrap",
  userSelect: "none",
};

const TD: React.CSSProperties = {
  padding: "10px 12px",
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 13,
  color: C.t0,
  whiteSpace: "nowrap",
};

/* ──────────────────────── Badge Component ──────────────────────── */

function Badge({ text, bg, color }: { text: string; bg: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: "Lexend, sans-serif",
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 4,
        backgroundColor: bg,
        color,
        textTransform: "uppercase",
        lineHeight: "16px",
      }}
    >
      {text}
    </span>
  );
}

/* ──────────────────────── Live Indicator ──────────────────────── */

function LiveIndicator() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: C.g,
          boxShadow: `0 0 6px ${C.g}`,
          animation: "smartMoneyPulse 2s ease-in-out infinite",
        }}
      />
      <span style={{ fontFamily: "Lexend, sans-serif", fontSize: 11, fontWeight: 500, color: C.g }}>
        LIVE
      </span>
      <style>{`@keyframes smartMoneyPulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }`}</style>
    </span>
  );
}

/* ──────────────────────── Stats Bar ──────────────────────── */

function StatsBar({ walletCount }: { walletCount: number }) {
  const stats = [
    { label: "Wallets Tracked", value: walletCount.toLocaleString() },
    { label: "Total Volume (30d)", value: "42,580 SOL" },
    { label: "Avg PnL (30d)", value: "+58.4 SOL", color: C.g },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12,
      }}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            backgroundColor: C.bg1,
            border: `1px solid ${C.bd}`,
            borderRadius: 8,
            padding: "12px 16px",
          }}
        >
          <div style={FONT_LABEL}>{s.label}</div>
          <div
            style={{
              ...FONT_DATA,
              fontSize: 18,
              fontWeight: 700,
              marginTop: 4,
              color: s.color ?? C.t0,
            }}
          >
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────── Search Bar ──────────────────────── */

function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ position: "relative" }}>
      {/* Search icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={C.t2}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        placeholder="Search wallet address..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 16px 10px 38px",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 13,
          color: C.t0,
          backgroundColor: C.bg1,
          border: `1px solid ${C.bd}`,
          borderRadius: 8,
          outline: "none",
          boxSizing: "border-box",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = C.ac;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = C.bd;
        }}
      />
    </div>
  );
}

/* ──────────────────────── Top Wallets Tab ──────────────────────── */

function TopWalletsTab({
  wallets,
  search,
  onToggleFollow,
}: {
  wallets: SmartWallet[];
  search: string;
  onToggleFollow: (address: string) => void;
}) {
  const [sortKey, setSortKey] = useState<WalletSortKey>("pnl30d");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = useCallback(
    (key: WalletSortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
    },
    [sortKey],
  );

  const filtered = useMemo(() => {
    let list = wallets;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((w) => w.address.toLowerCase().includes(q));
    }
    const mul = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === "lastActive") {
        return (parseTimeAgo(a.lastActive) - parseTimeAgo(b.lastActive)) * mul;
      }
      return ((a[sortKey] as number) - (b[sortKey] as number)) * mul;
    });
  }, [wallets, search, sortKey, sortDir]);

  const arrow = (key: WalletSortKey) =>
    sortKey === key ? (sortDir === "asc" ? " \u25B2" : " \u25BC") : "";

  const sortableTh = (key: WalletSortKey, label: string): React.CSSProperties => ({
    ...TH,
    cursor: "pointer",
  });

  return (
    <div
      style={{
        backgroundColor: C.bg1,
        border: `1px solid ${C.bd}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.bd}` }}>
              <th style={{ ...TH, width: 48 }}>#</th>
              <th style={TH}>Wallet</th>
              <th style={TH}>Label</th>
              <th style={sortableTh("pnl30d", "PnL")} onClick={() => toggleSort("pnl30d")}>
                PnL (30d){arrow("pnl30d")}
              </th>
              <th style={sortableTh("winRate", "Win Rate")} onClick={() => toggleSort("winRate")}>
                Win Rate{arrow("winRate")}
              </th>
              <th style={{ ...TH }}>Trades</th>
              <th style={sortableTh("volume30d", "Volume")} onClick={() => toggleSort("volume30d")}>
                Volume (30d){arrow("volume30d")}
              </th>
              <th style={{ ...TH }}>Avg Hold</th>
              <th style={sortableTh("lastActive", "Active")} onClick={() => toggleSort("lastActive")}>
                Last Active{arrow("lastActive")}
              </th>
              <th style={{ ...TH, textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  style={{
                    ...TD,
                    textAlign: "center",
                    color: C.t2,
                    padding: "32px 12px",
                    fontFamily: "Lexend, sans-serif",
                  }}
                >
                  No wallets found
                </td>
              </tr>
            )}
            {filtered.map((w) => {
              const ls = labelStyle(w.label);
              return (
                <tr
                  key={w.address}
                  style={{ borderBottom: `1px solid ${C.bg2}`, cursor: "pointer" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = C.bg2;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <td style={{ ...TD, color: C.t2, fontWeight: 600, width: 48 }}>{w.rank}</td>
                  <td style={{ ...TD, color: C.t1 }}>{truncateAddress(w.address)}</td>
                  <td style={TD}>
                    <Badge text={w.label} bg={ls.bg} color={ls.text} />
                  </td>
                  <td style={{ ...TD, color: pnlColor(w.pnl30d), fontWeight: 600 }}>
                    {pnlText(w.pnl30d)}
                  </td>
                  <td
                    style={{
                      ...TD,
                      color:
                        w.winRate >= 70 ? C.g : w.winRate >= 55 ? C.a : C.r,
                    }}
                  >
                    {w.winRate.toFixed(1)}%
                  </td>
                  <td style={{ ...TD, color: C.t1 }}>{w.totalTrades.toLocaleString()}</td>
                  <td style={{ ...TD, color: C.t1 }}>
                    {w.volume30d.toLocaleString()} SOL
                  </td>
                  <td style={{ ...TD, color: C.t1 }}>{w.avgHoldTime}</td>
                  <td style={{ ...TD, color: C.t1, fontSize: 12 }}>{w.lastActive}</td>
                  <td style={{ ...TD, textAlign: "right" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFollow(w.address);
                      }}
                      style={{
                        fontFamily: "Lexend, sans-serif",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "4px 14px",
                        borderRadius: 4,
                        border: w.followed ? `1px solid ${C.bd}` : "none",
                        backgroundColor: w.followed ? "transparent" : C.ac,
                        color: w.followed ? C.t2 : C.t0,
                        cursor: "pointer",
                        transition: "opacity 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = "0.85";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "1";
                      }}
                    >
                      {w.followed ? "Following" : "Follow"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ──────────────────────── Recent Trades Tab ──────────────────────── */

function RecentTradesTab({ trades }: { trades: RecentTrade[] }) {
  return (
    <div
      style={{
        backgroundColor: C.bg1,
        border: `1px solid ${C.bd}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.bd}` }}>
              <th style={TH}>Wallet</th>
              <th style={TH}>Side</th>
              <th style={TH}>Token</th>
              <th style={TH}>Amount</th>
              <th style={{ ...TH, textAlign: "right" }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => {
              const ss = sideStyle(t.side);
              const ls = labelStyle(t.walletLabel);
              return (
                <tr
                  key={t.id}
                  style={{ borderBottom: `1px solid ${C.bg2}`, cursor: "pointer" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = C.bg2;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                  onClick={() => {
                    /* TODO: navigate to /token/${t.tokenSlug} */
                  }}
                >
                  <td style={TD}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: C.t1, fontSize: 13 }}>{t.walletAddress}</span>
                      <Badge text={t.walletLabel} bg={ls.bg} color={ls.text} />
                    </div>
                  </td>
                  <td style={TD}>
                    <Badge text={t.side} bg={ss.bg} color={ss.text} />
                  </td>
                  <td style={TD}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {/* Token avatar placeholder */}
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          backgroundColor: C.bg3,
                          fontFamily: "Lexend, sans-serif",
                          fontSize: 11,
                          fontWeight: 700,
                          color: C.t1,
                          flexShrink: 0,
                        }}
                      >
                        {t.tokenAvatar}
                      </span>
                      <span style={{ fontWeight: 600, color: C.t0 }}>{t.tokenTicker}</span>
                    </div>
                  </td>
                  <td style={{ ...TD, color: C.t0 }}>{t.amountSol.toFixed(1)} SOL</td>
                  <td style={{ ...TD, textAlign: "right", color: C.t2, fontSize: 12 }}>
                    {t.timeAgo}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ──────────────────────── Page ──────────────────────── */

export default function SmartMoneyPage() {
  const [activeTab, setActiveTab] = useState<MainTab>("wallets");
  const [search, setSearch] = useState("");
  const [wallets, setWallets] = useState<SmartWallet[]>([]);
  const [trades, setTrades] = useState<RecentTrade[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(true);
  const [tradesLoading, setTradesLoading] = useState(false);

  // Fetch wallets from API on mount
  useEffect(() => {
    const controller = new AbortController();
    api
      .raw("/api/smart-money/wallets", { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setWallets(
            json.data.map((w: Record<string, unknown>, i: number) => ({
              rank: Number(w.rank ?? i + 1),
              address: String(w.address ?? w.wallet ?? ""),
              label: (w.label as WalletLabel) ?? "Sniper",
              pnl30d: Number(w.pnl30d ?? w.pnl ?? 0),
              winRate: Number(w.winRate ?? 0),
              totalTrades: Number(w.totalTrades ?? w.trades ?? 0),
              volume30d: Number(w.volume30d ?? w.volume ?? 0),
              avgHoldTime: String(w.avgHoldTime ?? "—"),
              lastActive: String(w.lastActive ?? "—"),
              followed: Boolean(w.followed ?? false),
            }))
          );
        } else {
          setWallets(MOCK_WALLETS);
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setWallets(MOCK_WALLETS);
      })
      .finally(() => setWalletsLoading(false));
    return () => controller.abort();
  }, []);

  // Fetch trades when trades tab is activated
  useEffect(() => {
    if (activeTab !== "trades" || trades.length > 0) return;
    setTradesLoading(true);
    const controller = new AbortController();
    api
      .raw("/api/smart-money/trades?limit=20", { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setTrades(
            json.data.map((t: Record<string, unknown>, i: number) => ({
              id: String(t.id ?? `t${i}`),
              walletAddress: String(t.walletAddress ?? t.wallet ?? ""),
              walletLabel: (t.walletLabel as WalletLabel) ?? "Sniper",
              side: (t.side as string)?.toUpperCase() === "SELL" ? "SELL" : "BUY",
              tokenTicker: String(t.tokenTicker ?? t.ticker ?? ""),
              tokenAvatar: String(t.tokenAvatar ?? (t.ticker as string)?.[0] ?? "?"),
              amountSol: Number(t.amountSol ?? t.amount ?? 0),
              timeAgo: String(t.timeAgo ?? "—"),
              tokenSlug: String(t.tokenSlug ?? t.mintAddress ?? ""),
            }))
          );
        } else {
          setTrades(MOCK_TRADES);
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setTrades(MOCK_TRADES);
      })
      .finally(() => setTradesLoading(false));
    return () => controller.abort();
  }, [activeTab, trades.length]);

  const handleToggleFollow = useCallback((address: string) => {
    setWallets((prev) =>
      prev.map((w) =>
        w.address === address ? { ...w, followed: !w.followed } : w,
      ),
    );
    // Persist follow state to backend
    api.post("/api/smart-money/follow", { address }).catch(() => {});
  }, []);

  const tabs: { key: MainTab; label: string }[] = [
    { key: "wallets", label: "Top Wallets" },
    { key: "trades", label: "Recent Trades" },
  ];

  return (
    <ErrorBoundary fallbackTitle="Smart Money failed to load">
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: C.bg0,
          padding: "24px 16px",
          maxWidth: 1200,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h1
                style={{
                  fontFamily: "Lexend, sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: C.t0,
                  margin: 0,
                  letterSpacing: "0.04em",
                }}
              >
                SMART MONEY
              </h1>
              <LiveIndicator />
            </div>
            <p
              style={{
                fontFamily: "Lexend, sans-serif",
                fontSize: 13,
                color: C.t2,
                margin: "4px 0 0 0",
              }}
            >
              Track top-performing wallets and their recent trades
            </p>
          </div>
        </div>

        {/* Stats Bar */}
        <div style={{ marginBottom: 20 }}>
          <StatsBar walletCount={wallets.length} />
        </div>

        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <SearchBar value={search} onChange={setSearch} />
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 0,
            marginBottom: 16,
            borderBottom: `1px solid ${C.bd}`,
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  fontFamily: "Lexend, sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "10px 20px",
                  color: isActive ? C.t0 : C.t2,
                  backgroundColor: "transparent",
                  border: "none",
                  borderBottom: isActive ? `2px solid ${C.ac}` : "2px solid transparent",
                  cursor: "pointer",
                  transition: "color 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = C.t1;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = C.t2;
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "wallets" && (
          walletsLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: C.t2, fontFamily: "Lexend, sans-serif", fontSize: 13 }}>
              Loading wallets...
            </div>
          ) : (
            <TopWalletsTab
              wallets={wallets}
              search={search}
              onToggleFollow={handleToggleFollow}
            />
          )
        )}
        {activeTab === "trades" && (
          tradesLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: C.t2, fontFamily: "Lexend, sans-serif", fontSize: 13 }}>
              Loading trades...
            </div>
          ) : (
            <RecentTradesTab trades={trades} />
          )
        )}
      </div>
    </ErrorBoundary>
  );
}
