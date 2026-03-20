"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCompare } from "@/components/providers/CompareProvider";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { MiniChart } from "@/components/token/MiniChart";
import { TokenLinks } from "@/components/token/TokenLinks";
import { api } from "@/lib/api";
import type { TokenData } from "@/types/token";

const SOL_PRICE_USD = Number(process.env.NEXT_PUBLIC_SOL_PRICE_USD || 150);

// ---- helpers ----

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "\u2014";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(n < 10 ? 1 : 0);
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function formatPriceSol(n: number | null | undefined): string {
  if (n === null || n === undefined) return "\u2014";
  if (n < 0.0001) return n.toExponential(2);
  if (n < 0.01) return n.toFixed(6);
  return n.toFixed(4);
}

function tokenAge(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

// ---- TokenColumn with live data ----

interface TokenColumnProps {
  token: TokenData;
  onRemove: (mint: string) => void;
  allTokens: TokenData[];
}

function TokenColumn({ token, onRemove, allTokens }: TokenColumnProps) {
  const router = useRouter();
  const liveData = useTokenPrice(token.mintAddress);

  const priceSol = liveData?.priceSol ?? null;
  const marketCapSol = liveData?.marketCapSol ?? token.marketCapSol;
  const marketCapUsd = liveData?.marketCapUsd ?? (marketCapSol != null ? marketCapSol * SOL_PRICE_USD : null);
  const bondingProgress = liveData?.bondingProgress ?? token.bondingProgress;
  const volume1h = liveData?.volume1h ?? token.volume1h;
  const buyCount = liveData?.buyCount1h ?? token.buyCount;
  const sellCount = liveData?.sellCount1h ?? token.sellCount;
  const totalTrades = (buyCount ?? 0) + (sellCount ?? 0);
  const buyRatio = totalTrades > 0 ? ((buyCount ?? 0) / totalTrades * 100) : null;

  // Determine if a stat differs significantly from others for highlighting
  function shouldHighlight(getter: (t: TokenData) => number | null | undefined, threshold: number): boolean {
    if (allTokens.length < 2) return false;
    const values = allTokens.map(getter).filter((v): v is number => v != null);
    if (values.length < 2) return false;
    const max = Math.max(...values);
    const min = Math.min(...values);
    if (min === 0 && max === 0) return false;
    const current = getter(token);
    if (current == null) return false;
    // Highlight if the range is significant relative to the mean
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return mean > 0 && (max - min) / mean > threshold;
  }

  const highlightRisk = allTokens.length >= 2 && (() => {
    const levels = allTokens.map((t) => t.riskLevel).filter(Boolean);
    return levels.length >= 2 && new Set(levels).size > 1;
  })();

  const stats: { label: string; value: string; highlight: boolean; color?: string }[] = [
    {
      label: "Price (SOL)",
      value: formatPriceSol(priceSol),
      highlight: false,
    },
    {
      label: "MCap (SOL)",
      value: formatNumber(marketCapSol),
      highlight: shouldHighlight((t) => t.marketCapSol, 0.5),
    },
    {
      label: "MCap (USD)",
      value: marketCapUsd != null ? formatUsd(marketCapUsd) : "\u2014",
      highlight: false,
    },
    {
      label: "Bonding",
      value: bondingProgress != null ? `${bondingProgress.toFixed(1)}%` : "\u2014",
      highlight: shouldHighlight((t) => t.bondingProgress, 0.3),
    },
    {
      label: "Holders",
      value: formatNumber(token.holders),
      highlight: shouldHighlight((t) => t.holders, 0.5),
    },
    {
      label: "Dev Hold %",
      value: token.devHoldPct != null ? `${token.devHoldPct.toFixed(1)}%` : "\u2014",
      highlight: shouldHighlight((t) => t.devHoldPct, 0.3),
      color: token.devHoldPct != null && token.devHoldPct > 15 ? "text-red" : undefined,
    },
    {
      label: "Top Holders %",
      value: token.topHoldersPct != null ? `${token.topHoldersPct.toFixed(1)}%` : "\u2014",
      highlight: shouldHighlight((t) => t.topHoldersPct, 0.3),
    },
    {
      label: "Vol 1h",
      value: volume1h != null ? `$${formatNumber(volume1h)}` : "\u2014",
      highlight: shouldHighlight((t) => t.volume1h, 0.5),
    },
    {
      label: "Buy/Sell",
      value: buyRatio != null ? `${buyRatio.toFixed(0)}% / ${(100 - buyRatio).toFixed(0)}%` : "\u2014",
      highlight: false,
    },
    {
      label: "Age",
      value: tokenAge(token.createdAt),
      highlight: false,
    },
  ];

  return (
    <div className="bg-bg-card rounded-lg border border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <TokenAvatar
            mintAddress={token.mintAddress}
            imageUri={token.imageUri}
            size={40}
            ticker={token.ticker}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-text-primary truncate">
                {token.name}
              </h3>
              <span className="text-xs font-mono text-text-muted shrink-0">
                ${token.ticker}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <RiskBadge level={token.riskLevel} />
              {liveData && (
                <div className="flex items-center gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green" />
                  </span>
                  <span className="text-[8px] font-bold text-green uppercase tracking-wider">
                    Live
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mini Chart */}
      <div className="px-4 py-2 border-b border-border">
        <MiniChart mintAddress={token.mintAddress} />
      </div>

      {/* Stats Table */}
      <div className="flex-1">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`flex items-center justify-between px-4 py-2 text-[11px] ${
              i % 2 === 0 ? "bg-bg-card" : "bg-bg-elevated/50"
            } ${stat.highlight ? "bg-accent/5 ring-1 ring-inset ring-accent/10" : ""}`}
          >
            <span className="text-text-muted">{stat.label}</span>
            <span className={`font-mono font-medium ${stat.color || "text-text-primary"}`}>
              {stat.value}
            </span>
          </div>
        ))}

        {/* Risk Level row */}
        <div
          className={`flex items-center justify-between px-4 py-2 text-[11px] bg-bg-elevated/50 ${
            highlightRisk ? "bg-accent/5 ring-1 ring-inset ring-accent/10" : ""
          }`}
        >
          <span className="text-text-muted">Risk Level</span>
          <RiskBadge level={token.riskLevel} />
        </div>
      </div>

      {/* Social Links */}
      {(token.twitter || token.telegram || token.website) && (
        <div className="px-4 py-3 border-t border-border">
          <TokenLinks
            mintAddress={token.mintAddress}
            twitter={token.twitter}
            telegram={token.telegram}
            website={token.website}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 p-4 border-t border-border">
        <button
          onClick={() => router.push(`/token/${token.mintAddress}`)}
          className="flex-1 py-2.5 rounded-lg bg-green/10 border border-green/30 text-green font-bold text-xs transition-colors hover:bg-green/20"
        >
          View
        </button>
        <button
          onClick={() => onRemove(token.mintAddress)}
          className="py-2.5 px-4 rounded-lg bg-red/10 border border-red/30 text-red font-bold text-xs transition-colors hover:bg-red/20"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// ---- Main Compare Page ----

export default function ComparePage() {
  const { compareTokens, removeFromCompare, clearCompare } = useCompare();
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Fetch token data for each mint in compareTokens
  useEffect(() => {
    if (compareTokens.length === 0) {
      setTokens([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controllers: AbortController[] = [];

    Promise.all(
      compareTokens.map((mint) => {
        const controller = new AbortController();
        controllers.push(controller);
        return api
          .raw(`/api/tokens/${mint}`, { signal: controller.signal })
          .then((r) => r.json())
          .then((json) => {
            if (json.success && json.data) return json.data as TokenData;
            return null;
          })
          .catch(() => null);
      })
    ).then((results) => {
      setTokens(results.filter((t): t is TokenData => t !== null));
      setLoading(false);
    });

    return () => controllers.forEach((c) => c.abort());
  }, [compareTokens]);

  const handleRemove = (mint: string) => {
    removeFromCompare(mint);
  };

  // Empty state
  if (!loading && compareTokens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 pt-16 pb-24">
        <div className="w-16 h-16 rounded-full bg-bg-elevated border border-border flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            width={28}
            height={28}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-text-faint"
          >
            <rect x="3" y="3" width="7" height="18" rx="1" />
            <rect x="14" y="3" width="7" height="18" rx="1" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-text-secondary text-sm font-medium">No tokens to compare</p>
          <p className="text-text-muted text-xs mt-1">
            Use the compare button on any token card to add tokens here.
          </p>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="flex flex-col pt-2">
        <h1 className="text-lg font-bold text-text-primary tracking-tight mb-4">Compare</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {compareTokens.map((mint) => (
            <div key={mint} className="bg-bg-card rounded-lg border border-border animate-pulse">
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-bg-elevated" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-24 bg-bg-elevated rounded" />
                    <div className="h-2 w-16 bg-bg-elevated rounded" />
                  </div>
                </div>
                <div className="h-12 bg-bg-elevated rounded" />
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-6 bg-bg-elevated rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col pt-2 pb-24 md:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-text-primary tracking-tight">
          Compare
          <span className="ml-2 text-xs font-normal text-text-muted">
            ({tokens.length} token{tokens.length !== 1 ? "s" : ""})
          </span>
        </h1>
        {tokens.length > 0 && (
          <button
            onClick={clearCompare}
            className="text-xs text-text-muted hover:text-red transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Single token hint */}
      {tokens.length === 1 && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-accent/5 border border-accent/10 text-center">
          <p className="text-xs text-text-secondary">
            Add more tokens to compare. Use the compare button on any token card.
          </p>
        </div>
      )}

      {/* Mobile: Tab switcher */}
      {tokens.length > 1 && (
        <nav
          className="flex items-center gap-1 p-1 mb-4 rounded-full bg-bg-card border border-border self-start md:hidden"
          role="tablist"
        >
          {tokens.map((t, i) => (
            <button
              key={t.mintAddress}
              role="tab"
              aria-selected={activeTab === i}
              onClick={() => setActiveTab(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === i
                  ? "bg-green text-bg-primary shadow-sm"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              ${t.ticker}
            </button>
          ))}
        </nav>
      )}

      {/* Mobile: stacked with tab switching */}
      <div className="md:hidden">
        {tokens.length > 0 && (
          <TokenColumn
            key={tokens[activeTab]?.mintAddress ?? "empty"}
            token={tokens[activeTab] ?? tokens[0]}
            onRemove={handleRemove}
            allTokens={tokens}
          />
        )}
      </div>

      {/* Desktop: side-by-side columns */}
      <div
        className={`hidden md:grid gap-4 ${
          tokens.length === 1
            ? "grid-cols-1 max-w-md mx-auto"
            : tokens.length === 2
              ? "grid-cols-2"
              : "grid-cols-3"
        }`}
      >
        {tokens.map((token) => (
          <TokenColumn
            key={token.mintAddress}
            token={token}
            onRemove={handleRemove}
            allTokens={tokens}
          />
        ))}
      </div>
    </div>
  );
}
