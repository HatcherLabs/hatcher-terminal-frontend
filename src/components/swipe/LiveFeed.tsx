"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { useSolPriceContext } from "@/components/providers/SolPriceProvider";
import type { TokenData } from "@/types/token";

/* ── Helpers ──────────────────────────────────── */

function formatMcap(mcapSol: number | null, solPrice: number): string {
  if (mcapSol === null) return "--";
  const usd = mcapSol * solPrice;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function riskDot(level: TokenData["riskLevel"]): string {
  if (!level) return "#5c6380";
  if (level === "LOW") return "#00d672";
  if (level === "MED") return "#f0a000";
  return "#f23645";
}

/* ── Types ────────────────────────────────────── */

type FeedTab = "new" | "graduating" | "movers";

interface LiveFeedProps {
  tokens: TokenData[];
  graduatingTokens?: TokenData[];
}

const TABS: { key: FeedTab; label: string }[] = [
  { key: "new", label: "New" },
  { key: "graduating", label: "Graduating" },
  { key: "movers", label: "Top Movers" },
];

/* ── Token Row ────────────────────────────────── */

function TokenRow({
  token,
  solPrice,
  showBonding,
  onClick,
}: {
  token: TokenData;
  solPrice: number;
  showBonding?: boolean;
  onClick: () => void;
}) {
  const pct = token.priceChange5m ?? token.priceChange1h ?? 0;
  const isPositive = pct >= 0;
  const buys = token.buyCount ?? 0;
  const sells = token.sellCount ?? 0;
  const totalTxs = buys + sells;
  const buyRatio = totalTxs > 0 ? buys / totalTxs : 0.5;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-1.5 cursor-pointer transition-colors duration-75"
      style={{
        padding: "5px 10px",
        borderBottom: "1px solid rgba(26, 31, 46, 0.3)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#10131c")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <TokenAvatar
          mintAddress={token.mintAddress}
          imageUri={token.imageUri}
          size={24}
          ticker={token.ticker}
        />
        {/* Risk dot */}
        <span
          style={{
            position: "absolute",
            bottom: -1,
            right: -1,
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: riskDot(token.riskLevel),
            border: "1px solid #0a0d14",
          }}
        />
      </div>

      {/* Name + Age */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span
            className="font-mono font-bold text-[10px] truncate"
            style={{ color: "#eef0f6" }}
          >
            ${token.ticker}
          </span>
          <span
            className="text-[8px] font-mono shrink-0"
            style={{ color: "#363d54" }}
          >
            {timeAgo(token.detectedAt)}
          </span>
        </div>

        {/* Buy/Sell ratio bar */}
        <div
          style={{
            width: "100%",
            height: 2,
            borderRadius: 1,
            marginTop: 2,
            background: "#1a1f2e",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${buyRatio * 100}%`,
              height: "100%",
              background: buyRatio > 0.5 ? "#00d672" : "#f23645",
              borderRadius: 1,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* MCap */}
      <span
        className="text-[9px] font-mono shrink-0"
        style={{ color: "#5c6380" }}
      >
        {formatMcap(token.marketCapSol, solPrice)}
      </span>

      {/* Bonding progress or price change */}
      {showBonding && token.bondingProgress != null ? (
        <div className="shrink-0 flex items-center gap-1">
          <div
            style={{
              width: 32,
              height: 4,
              borderRadius: 2,
              background: "#1a1f2e",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(token.bondingProgress, 100)}%`,
                height: "100%",
                background:
                  token.bondingProgress > 80
                    ? "#f0a000"
                    : token.bondingProgress > 50
                      ? "#00d672"
                      : "#5c6380",
                borderRadius: 2,
              }}
            />
          </div>
          <span
            className="text-[8px] font-mono font-bold"
            style={{
              color:
                token.bondingProgress > 80 ? "#f0a000" : "#5c6380",
            }}
          >
            {token.bondingProgress.toFixed(0)}%
          </span>
        </div>
      ) : (
        <span
          className="text-[9px] font-mono font-bold shrink-0"
          style={{ color: isPositive ? "#00d672" : "#f23645" }}
        >
          {isPositive ? "+" : ""}
          {pct.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

/* ── Main Component ───────────────────────────── */

export function LiveFeed({ tokens, graduatingTokens }: LiveFeedProps) {
  const router = useRouter();
  const { solPrice } = useSolPriceContext();
  const [activeTab, setActiveTab] = useState<FeedTab>("new");

  // Graduating: tokens close to bonding curve completion (>60% progress, not graduated)
  const graduating = useMemo(() => {
    const source = graduatingTokens ?? tokens;
    return source
      .filter(
        (t) =>
          !t.isGraduated &&
          t.bondingProgress != null &&
          t.bondingProgress > 60,
      )
      .sort((a, b) => (b.bondingProgress ?? 0) - (a.bondingProgress ?? 0))
      .slice(0, 30);
  }, [tokens, graduatingTokens]);

  // Top movers: sort by absolute 5m price change
  const movers = useMemo(() => {
    return [...tokens]
      .filter((t) => t.priceChange5m != null)
      .sort(
        (a, b) =>
          Math.abs(b.priceChange5m ?? 0) - Math.abs(a.priceChange5m ?? 0),
      )
      .slice(0, 30);
  }, [tokens]);

  const displayTokens =
    activeTab === "new"
      ? tokens.slice(0, 30)
      : activeTab === "graduating"
        ? graduating
        : movers;

  const tabCounts: Record<FeedTab, number> = {
    new: Math.min(tokens.length, 30),
    graduating: graduating.length,
    movers: movers.length,
  };

  return (
    <div
      className="hidden terminal:flex flex-col overflow-hidden"
      style={{
        width: 320,
        borderLeft: "1px solid #1a1f2e",
        background: "#0a0d14",
      }}
    >
      {/* Header with tabs */}
      <div
        className="shrink-0"
        style={{
          borderBottom: "1px solid #1a1f2e",
        }}
      >
        <div
          style={{
            padding: "5px 10px 0",
            fontSize: 10,
            fontWeight: 700,
            color: "#5c6380",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Live Feed
        </div>
        <div
          className="flex items-center gap-0"
          style={{ padding: "4px 6px 0" }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "4px 8px 6px",
                  fontSize: 9,
                  fontWeight: 700,
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: isActive ? "#eef0f6" : "#5c6380",
                  borderBottom: isActive
                    ? "2px solid #00d672"
                    : "2px solid transparent",
                  background: "transparent",
                  cursor: "pointer",
                  transition: "color 0.15s, border-color 0.15s",
                }}
              >
                {tab.label}
                <span
                  style={{
                    marginLeft: 4,
                    fontSize: 8,
                    color: isActive ? "#00d672" : "#363d54",
                  }}
                >
                  {tabCounts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Column headers */}
      <div
        className="flex items-center gap-1.5 shrink-0"
        style={{
          padding: "3px 10px",
          borderBottom: "1px solid #1a1f2e",
          fontSize: 8,
          fontWeight: 700,
          color: "#363d54",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        <span style={{ width: 24 }} />
        <span className="flex-1">Token</span>
        <span className="shrink-0" style={{ width: 48, textAlign: "right" }}>
          MCap
        </span>
        <span className="shrink-0" style={{ width: 48, textAlign: "right" }}>
          {activeTab === "graduating" ? "Bond%" : "Chg%"}
        </span>
      </div>

      {/* Token list */}
      <div className="flex-1 overflow-y-auto terminal-scrollbar">
        {displayTokens.map((token) => (
          <TokenRow
            key={token.id}
            token={token}
            solPrice={solPrice}
            showBonding={activeTab === "graduating"}
            onClick={() => router.push(`/token/${token.mintAddress}`)}
          />
        ))}
        {displayTokens.length === 0 && (
          <div
            className="flex flex-col items-center justify-center gap-1 py-12"
            style={{ color: "#363d54", fontSize: 11 }}
          >
            <span style={{ fontSize: 20 }}>
              {activeTab === "graduating" ? "⏳" : activeTab === "movers" ? "📊" : "🔄"}
            </span>
            <span>
              {activeTab === "new"
                ? "Waiting for tokens..."
                : activeTab === "graduating"
                  ? "No graduating tokens"
                  : "No movers yet"}
            </span>
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div
        className="shrink-0 flex items-center justify-between"
        style={{
          padding: "4px 10px",
          borderTop: "1px solid #1a1f2e",
          fontSize: 9,
          fontFamily: "var(--font-jetbrains-mono), monospace",
          color: "#363d54",
        }}
      >
        <span>
          {tokens.length} tokens tracked
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#00d672",
              display: "inline-block",
              boxShadow: "0 0 4px #00d672",
            }}
          />
          LIVE
        </span>
      </div>
    </div>
  );
}
