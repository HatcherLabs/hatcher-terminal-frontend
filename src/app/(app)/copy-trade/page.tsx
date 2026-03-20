"use client";

import { useState, useMemo } from "react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

/* ──────────────────────── Types ──────────────────────── */

type LeaderboardSortKey =
  | "rank"
  | "winRate"
  | "pnl30d"
  | "avgHoldTime"
  | "activeTrades"
  | "followers";
type SortDir = "asc" | "desc";

interface TopTrader {
  rank: number;
  wallet: string;
  winRate: number;
  pnl30d: number;
  avgHoldTime: string;
  activeTrades: number;
  followers: number;
}

interface FollowedWallet {
  id: string;
  wallet: string;
  followDate: string;
  amountPerTrade: number;
  maxExposure: number;
  livePnl: number;
  paused: boolean;
}

interface CopyTrade {
  id: string;
  time: string;
  wallet: string;
  token: string;
  side: "BUY" | "SELL";
  amount: number;
  status: "Copied" | "Pending" | "Failed";
}

/* ──────────────────────── Mock Data ──────────────────────── */

const MOCK_TRADERS: TopTrader[] = [
  { rank: 1, wallet: "7xKp...3mFv", winRate: 78.4, pnl30d: 142.5, avgHoldTime: "2h 15m", activeTrades: 4, followers: 1243 },
  { rank: 2, wallet: "9bRq...8nWz", winRate: 73.1, pnl30d: 98.7, avgHoldTime: "45m", activeTrades: 6, followers: 987 },
  { rank: 3, wallet: "4dLe...1kYx", winRate: 71.9, pnl30d: 87.3, avgHoldTime: "1h 30m", activeTrades: 3, followers: 856 },
  { rank: 4, wallet: "2fNs...5jTr", winRate: 68.2, pnl30d: 64.1, avgHoldTime: "3h 45m", activeTrades: 2, followers: 721 },
  { rank: 5, wallet: "8cHm...9pAd", winRate: 66.8, pnl30d: 52.9, avgHoldTime: "1h 10m", activeTrades: 5, followers: 634 },
  { rank: 6, wallet: "3gVt...7wBn", winRate: 64.5, pnl30d: 41.2, avgHoldTime: "55m", activeTrades: 7, followers: 512 },
  { rank: 7, wallet: "6jZq...2eFk", winRate: 62.1, pnl30d: -12.4, avgHoldTime: "4h 20m", activeTrades: 1, followers: 398 },
  { rank: 8, wallet: "1mXw...4rCs", winRate: 59.7, pnl30d: -28.6, avgHoldTime: "30m", activeTrades: 8, followers: 287 },
  { rank: 9, wallet: "5aPy...6hGl", winRate: 57.3, pnl30d: 33.8, avgHoldTime: "2h 50m", activeTrades: 3, followers: 214 },
  { rank: 10, wallet: "0eUi...3dNv", winRate: 54.9, pnl30d: 19.4, avgHoldTime: "1h 5m", activeTrades: 4, followers: 156 },
];

const MOCK_FOLLOWED: FollowedWallet[] = [
  { id: "f1", wallet: "7xKp...3mFv", followDate: "2026-03-05", amountPerTrade: 0.5, maxExposure: 5.0, livePnl: 12.8, paused: false },
  { id: "f2", wallet: "9bRq...8nWz", followDate: "2026-03-12", amountPerTrade: 0.25, maxExposure: 2.5, livePnl: -3.2, paused: false },
  { id: "f3", wallet: "4dLe...1kYx", followDate: "2026-03-18", amountPerTrade: 1.0, maxExposure: 10.0, livePnl: 1.4, paused: true },
];

const MOCK_COPY_TRADES: CopyTrade[] = [
  { id: "ct1", time: "2026-03-20 14:32", wallet: "7xKp...3mFv", token: "$WIF", side: "BUY", amount: 0.5, status: "Copied" },
  { id: "ct2", time: "2026-03-20 14:18", wallet: "9bRq...8nWz", token: "$BONK", side: "SELL", amount: 0.25, status: "Copied" },
  { id: "ct3", time: "2026-03-20 13:55", wallet: "7xKp...3mFv", token: "$POPCAT", side: "BUY", amount: 0.5, status: "Pending" },
  { id: "ct4", time: "2026-03-20 13:41", wallet: "4dLe...1kYx", token: "$JTO", side: "SELL", amount: 1.0, status: "Failed" },
  { id: "ct5", time: "2026-03-20 12:58", wallet: "9bRq...8nWz", token: "$PYTH", side: "BUY", amount: 0.25, status: "Copied" },
  { id: "ct6", time: "2026-03-20 12:22", wallet: "7xKp...3mFv", token: "$TNSR", side: "BUY", amount: 0.5, status: "Copied" },
];

/* ──────────────────────── Helpers ──────────────────────── */

function pnlColor(value: number): string {
  return value >= 0 ? "#00d672" : "#f23645";
}

function statusColor(status: CopyTrade["status"]): { bg: string; text: string } {
  switch (status) {
    case "Copied":
      return { bg: "rgba(0,214,114,0.12)", text: "#00d672" };
    case "Pending":
      return { bg: "rgba(240,160,0,0.12)", text: "#f0a000" };
    case "Failed":
      return { bg: "rgba(242,54,69,0.12)", text: "#f23645" };
  }
}

function sideStyle(side: "BUY" | "SELL"): { bg: string; text: string } {
  return side === "BUY"
    ? { bg: "rgba(0,214,114,0.12)", text: "#00d672" }
    : { bg: "rgba(242,54,69,0.12)", text: "#f23645" };
}

/* ──────────────────────── Leaderboard ──────────────────────── */

function Leaderboard({
  onFollow,
  followedWallets,
}: {
  onFollow: (wallet: string) => void;
  followedWallets: Set<string>;
}) {
  const [sortKey, setSortKey] = useState<LeaderboardSortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (key: LeaderboardSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "rank" ? "asc" : "desc");
    }
  };

  const sorted = useMemo(() => {
    const copy = [...MOCK_TRADERS];
    const mul = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      const va = a[sortKey as keyof TopTrader];
      const vb = b[sortKey as keyof TopTrader];
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * mul;
      return String(va).localeCompare(String(vb)) * mul;
    });
    return copy;
  }, [sortKey, sortDir]);

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

  const arrow = (key: LeaderboardSortKey) =>
    sortKey === key ? (sortDir === "asc" ? " \u25B2" : " \u25BC") : "";

  return (
    <div style={{ backgroundColor: "#0a0d14", border: "1px solid #1a1f2e", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1f2e" }}>
        <h2 style={{ fontFamily: "Lexend, sans-serif", fontSize: 14, fontWeight: 600, color: "#eef0f6", margin: 0 }}>
          TOP TRADERS LEADERBOARD
        </h2>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1a1f2e" }}>
              <th style={headerStyle} onClick={() => toggleSort("rank")}>#Rank{arrow("rank")}</th>
              <th style={{ ...headerStyle, cursor: "default" }}>Wallet</th>
              <th style={headerStyle} onClick={() => toggleSort("winRate")}>Win Rate{arrow("winRate")}</th>
              <th style={headerStyle} onClick={() => toggleSort("pnl30d")}>PnL (30d){arrow("pnl30d")}</th>
              <th style={headerStyle} onClick={() => toggleSort("avgHoldTime")}>Avg Hold{arrow("avgHoldTime")}</th>
              <th style={headerStyle} onClick={() => toggleSort("activeTrades")}>Active{arrow("activeTrades")}</th>
              <th style={headerStyle} onClick={() => toggleSort("followers")}>Followers{arrow("followers")}</th>
              <th style={{ ...headerStyle, cursor: "default", textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const isFollowed = followedWallets.has(t.wallet);
              return (
                <tr
                  key={t.wallet}
                  style={{ borderBottom: "1px solid #10131c", cursor: "pointer" }}
                  onMouseEnter={(e) => { (e.currentTarget.style.backgroundColor) = "#10131c"; }}
                  onMouseLeave={(e) => { (e.currentTarget.style.backgroundColor) = "transparent"; }}
                >
                  <td style={{ ...cellStyle, color: "#5c6380", fontWeight: 600 }}>{t.rank}</td>
                  <td style={{ ...cellStyle, color: "#9ca3b8" }}>{t.wallet}</td>
                  <td style={{ ...cellStyle, color: t.winRate >= 60 ? "#00d672" : t.winRate >= 50 ? "#f0a000" : "#f23645" }}>
                    {t.winRate.toFixed(1)}%
                  </td>
                  <td style={{ ...cellStyle, color: pnlColor(t.pnl30d) }}>
                    {t.pnl30d >= 0 ? "+" : ""}{t.pnl30d.toFixed(1)} SOL
                  </td>
                  <td style={{ ...cellStyle, color: "#9ca3b8" }}>{t.avgHoldTime}</td>
                  <td style={cellStyle}>{t.activeTrades}</td>
                  <td style={{ ...cellStyle, color: "#9ca3b8" }}>{t.followers.toLocaleString()}</td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isFollowed) onFollow(t.wallet);
                      }}
                      style={{
                        fontFamily: "Lexend, sans-serif",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "4px 12px",
                        borderRadius: 4,
                        border: isFollowed ? "1px solid #1a1f2e" : "none",
                        backgroundColor: isFollowed ? "transparent" : "#8b5cf6",
                        color: isFollowed ? "#5c6380" : "#eef0f6",
                        cursor: isFollowed ? "default" : "pointer",
                      }}
                    >
                      {isFollowed ? "Following" : "Follow"}
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

/* ──────────────────────── Followed Wallet Card ──────────────────────── */

function FollowedWalletCard({
  w,
  onTogglePause,
}: {
  w: FollowedWallet;
  onTogglePause: (id: string) => void;
}) {
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
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, color: "#eef0f6", fontWeight: 600 }}>
          {w.wallet}
        </span>
        <span
          style={{
            fontFamily: "Lexend, sans-serif",
            fontSize: 10,
            color: w.paused ? "#f0a000" : "#00d672",
            backgroundColor: w.paused ? "rgba(240,160,0,0.12)" : "rgba(0,214,114,0.12)",
            padding: "2px 8px",
            borderRadius: 4,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          {w.paused ? "Paused" : "Active"}
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <div style={{ fontFamily: "Lexend, sans-serif", fontSize: 10, color: "#5c6380", textTransform: "uppercase", marginBottom: 2 }}>
            Followed since
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#9ca3b8" }}>
            {w.followDate}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: "Lexend, sans-serif", fontSize: 10, color: "#5c6380", textTransform: "uppercase", marginBottom: 2 }}>
            Live P&amp;L
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: pnlColor(w.livePnl), fontWeight: 600 }}>
            {w.livePnl >= 0 ? "+" : ""}{w.livePnl.toFixed(1)} SOL
          </div>
        </div>
        <div>
          <div style={{ fontFamily: "Lexend, sans-serif", fontSize: 10, color: "#5c6380", textTransform: "uppercase", marginBottom: 2 }}>
            Per trade
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#9ca3b8" }}>
            {w.amountPerTrade} SOL
          </div>
        </div>
        <div>
          <div style={{ fontFamily: "Lexend, sans-serif", fontSize: 10, color: "#5c6380", textTransform: "uppercase", marginBottom: 2 }}>
            Max exposure
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#9ca3b8" }}>
            {w.maxExposure} SOL
          </div>
        </div>
      </div>

      {/* Toggle */}
      <button
        onClick={() => onTogglePause(w.id)}
        style={{
          fontFamily: "Lexend, sans-serif",
          fontSize: 11,
          fontWeight: 600,
          padding: "6px 0",
          borderRadius: 4,
          border: "1px solid #1a1f2e",
          backgroundColor: w.paused ? "rgba(0,214,114,0.08)" : "rgba(242,54,69,0.08)",
          color: w.paused ? "#00d672" : "#f23645",
          cursor: "pointer",
          width: "100%",
        }}
      >
        {w.paused ? "Resume Copying" : "Pause Copying"}
      </button>
    </div>
  );
}

/* ──────────────────────── My Followed Wallets ──────────────────────── */

function MyFollowedWallets({
  wallets,
  onTogglePause,
}: {
  wallets: FollowedWallet[];
  onTogglePause: (id: string) => void;
}) {
  return (
    <div>
      <h2
        style={{
          fontFamily: "Lexend, sans-serif",
          fontSize: 14,
          fontWeight: 600,
          color: "#eef0f6",
          margin: "0 0 12px 0",
          textTransform: "uppercase",
        }}
      >
        My Followed Wallets
      </h2>
      {wallets.length === 0 ? (
        <div
          style={{
            backgroundColor: "#0a0d14",
            border: "1px solid #1a1f2e",
            borderRadius: 8,
            padding: 32,
            textAlign: "center",
          }}
        >
          <p style={{ fontFamily: "Lexend, sans-serif", fontSize: 13, color: "#5c6380", margin: 0 }}>
            Not following any wallets yet. Browse the leaderboard above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 terminal:grid-cols-2 gap-3">
          {wallets.map((w) => (
            <FollowedWalletCard key={w.id} w={w} onTogglePause={onTogglePause} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── Recent Copy Trades ──────────────────────── */

function RecentCopyTrades({ trades }: { trades: CopyTrade[] }) {
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
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1f2e" }}>
        <h2 style={{ fontFamily: "Lexend, sans-serif", fontSize: 14, fontWeight: 600, color: "#eef0f6", margin: 0 }}>
          RECENT COPY TRADES
        </h2>
      </div>
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
            {trades.map((t) => {
              const side = sideStyle(t.side);
              const st = statusColor(t.status);
              return (
                <tr key={t.id} style={{ borderBottom: "1px solid #10131c" }}>
                  <td style={{ ...cellStyle, color: "#5c6380", fontSize: 12 }}>{t.time}</td>
                  <td style={{ ...cellStyle, color: "#9ca3b8" }}>{t.wallet}</td>
                  <td style={{ ...cellStyle, color: "#eef0f6", fontWeight: 600 }}>{t.token}</td>
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
                  <td style={cellStyle}>{t.amount} SOL</td>
                  <td style={cellStyle}>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: 10,
                        fontFamily: "Lexend, sans-serif",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 4,
                        backgroundColor: st.bg,
                        color: st.text,
                      }}
                    >
                      {t.status}
                    </span>
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

export default function CopyTradePage() {
  const [followedWallets, setFollowedWallets] = useState<FollowedWallet[]>(MOCK_FOLLOWED);

  const followedSet = useMemo(
    () => new Set(followedWallets.map((w) => w.wallet)),
    [followedWallets],
  );

  const handleFollow = (wallet: string) => {
    const newWallet: FollowedWallet = {
      id: `f-${Date.now()}`,
      wallet,
      followDate: new Date().toISOString().slice(0, 10),
      amountPerTrade: 0.5,
      maxExposure: 5.0,
      livePnl: 0,
      paused: false,
    };
    setFollowedWallets((prev) => [...prev, newWallet]);
  };

  const handleTogglePause = (id: string) => {
    setFollowedWallets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, paused: !w.paused } : w)),
    );
  };

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

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Leaderboard */}
          <Leaderboard onFollow={handleFollow} followedWallets={followedSet} />

          {/* Followed Wallets */}
          <MyFollowedWallets wallets={followedWallets} onTogglePause={handleTogglePause} />

          {/* Recent Copy Trades */}
          <RecentCopyTrades trades={MOCK_COPY_TRADES} />
        </div>
      </div>
    </ErrorBoundary>
  );
}
