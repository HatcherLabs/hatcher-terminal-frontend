"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { WatchlistButton } from "@/components/ui/WatchlistButton";
import { CompareButton } from "@/components/ui/CompareButton";
import { AnimatedPrice } from "@/components/ui/AnimatedPrice";
import { QuickTradeButton } from "@/components/trade/QuickTradeButton";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

type ExploreCategory = "new" | "graduating" | "migrated";

const TABS: { key: ExploreCategory; label: string }[] = [
  { key: "new", label: "New Pairs" },
  { key: "graduating", label: "Close to Bond" },
  { key: "migrated", label: "Migrated" },
];

const SOL_PRICE_USD = Number(process.env.NEXT_PUBLIC_SOL_PRICE_USD || 150);
const PAGE_SIZE = 30;
const REFRESH_INTERVAL = 10_000;

// ---- helpers ----

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "\u2014";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(n < 10 ? 1 : 0);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---- types ----

interface ExploreToken {
  id: string;
  mintAddress: string;
  name: string;
  ticker: string;
  imageUri: string | null;
  detectedAt: string;
  marketCapSol: number | null;
  marketCapUsd: number | null;
  holders: number | null;
  bondingProgress: number | null;
  buyCount: number | null;
  sellCount: number | null;
  devHoldPct: number | null;
  isGraduated: boolean;
  riskLevel: string | null;
  twitter?: string | null;
  telegram?: string | null;
  website?: string | null;
  description?: string | null;
  creatorAddress?: string;
}

// ---- component ----

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<ExploreCategory>("new");
  const [tokens, setTokens] = useState<ExploreToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const prevIdsRef = useRef<Set<string>>(new Set());
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchFailCountRef = useRef(0);
  const toast = useToast();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ExploreToken[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTokens = useCallback(
    async (offset: number, append: boolean) => {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = await api.raw(
          `/api/tokens/explore?category=${activeTab}&limit=${PAGE_SIZE}&offset=${offset}`
        );
        const json = await res.json();

        if (json.success) {
          const incoming: ExploreToken[] = json.data;

          if (append) {
            setTokens((prev) => {
              const existingIds = new Set(prev.map((t) => t.id));
              const unique = incoming.filter((t) => !existingIds.has(t.id));
              return [...prev, ...unique];
            });
          } else {
            // Detect genuinely new tokens for highlight
            const currentIds = new Set(incoming.map((t) => t.id));
            const freshIds = new Set<string>();
            if (prevIdsRef.current.size > 0) {
              for (const id of currentIds) {
                if (!prevIdsRef.current.has(id)) {
                  freshIds.add(id);
                }
              }
            }
            prevIdsRef.current = currentIds;
            setNewIds(freshIds);
            setTokens(incoming);

            // Clear highlight after animation
            if (freshIds.size > 0) {
              setTimeout(() => setNewIds(new Set()), 2000);
            }
          }

          setHasMore(json.hasMore);
          fetchFailCountRef.current = 0;
        } else {
          fetchFailCountRef.current++;
          if (fetchFailCountRef.current >= 3) {
            toast.add("Unable to load tokens", "error");
            fetchFailCountRef.current = 0;
          }
        }
      } catch {
        fetchFailCountRef.current++;
        if (fetchFailCountRef.current >= 3) {
          toast.add("Unable to load tokens", "error");
          fetchFailCountRef.current = 0;
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeTab, toast]
  );

  // Initial fetch and auto-refresh
  useEffect(() => {
    prevIdsRef.current = new Set();
    fetchTokens(0, false);

    refreshTimerRef.current = setInterval(() => {
      fetchTokens(0, false);
    }, REFRESH_INTERVAL);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [fetchTokens]);

  // Search debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.raw(
          `/api/tokens/search?q=${encodeURIComponent(searchQuery)}`
        );
        const json = await res.json();
        if (json.success) setSearchResults(json.data);
      } catch {
        toast.add("Search failed, try again", "error");
      }
      setSearching(false);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Navigation
  const router = useRouter();

  const handleSelectToken = useCallback((token: ExploreToken) => {
    router.push(`/token/${token.mintAddress}`);
  }, [router]);

  const handleLoadMore = () => {
    fetchTokens(tokens.length, true);
  };

  return (
    <div className="flex flex-col pt-2">
      {/* Header */}
      <h1 className="text-lg font-bold text-text-primary tracking-tight mb-3">Explore</h1>

      {/* Search bar */}
      <div className="relative mb-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, ticker, or address..."
          className="form-input w-full bg-bg-card border border-border rounded-xl px-4 py-2.5 pl-10 text-sm text-text-primary placeholder:text-text-faint focus:border-green/50 focus:outline-none transition-all"
        />
        {/* Search icon */}
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        {/* Clear button */}
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
          >
            <span className="text-lg leading-none">&times;</span>
          </button>
        )}
      </div>

      {/* Tab bar */}
      <nav
        className="flex items-center gap-1 p-1 mb-4 rounded-full bg-bg-card border border-border self-start"
        role="tablist"
        aria-label="Explorer categories"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={`
                relative px-3 py-1.5 rounded-full text-xs font-medium
                transition-all duration-200 whitespace-nowrap
                ${
                  isActive
                    ? "bg-green text-bg-primary shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }
              `}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Token list / Search results */}
      {searchQuery.length >= 2 ? (
        <div className="flex flex-col gap-[1px]">
          {searching ? (
            <div className="flex flex-col gap-[1px]">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12 text-text-muted text-sm">
              No tokens found for &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            searchResults.map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                isNew={false}
                onSelect={handleSelectToken}
              />
            ))
          )}
        </div>
      ) : (
        <div
          role="tabpanel"
          aria-label={`${TABS.find((t) => t.key === activeTab)?.label} tokens`}
          className="flex flex-col gap-[1px]"
        >
          {loading ? (
            <div className="flex flex-col gap-[1px]">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-12 text-text-muted text-sm">
              No tokens found in this category.
            </div>
          ) : (
            <>
              {tokens.map((token) => (
                <TokenRow
                  key={token.id}
                  token={token}
                  isNew={newIds.has(token.id)}
                  onSelect={handleSelectToken}
                />
              ))}

              {hasMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="mt-3 w-full py-3 rounded-xl bg-bg-card border border-border
                             text-text-secondary text-sm font-medium
                             hover:bg-bg-elevated transition-colors disabled:opacity-50"
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
}

// ---- Token Row ----

function TokenRow({
  token,
  isNew,
  onSelect,
}: {
  token: ExploreToken;
  isNew: boolean;
  onSelect?: (token: ExploreToken) => void;
}) {
  const mcapUsd =
    token.marketCapSol != null ? token.marketCapSol * SOL_PRICE_USD : null;

  return (
    <button
      onClick={() => onSelect?.(token)}
      className={`
        w-full text-left flex items-center gap-3 px-3 py-3 bg-bg-card border border-border rounded-xl
        hover:bg-bg-elevated hover:border-border-hover transition-all duration-200 cursor-pointer
        ${isNew ? "animate-pulse-new ring-1 ring-green/20" : ""}
      `}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-bg-elevated overflow-hidden">
        {token.imageUri ? (
          <img
            src={token.imageUri}
            alt={token.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted text-sm font-bold">
            {token.ticker.charAt(0)}
          </div>
        )}
      </div>

      {/* Name + ticker + age */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-text-primary truncate">
            {token.name}
          </span>
          <span className="text-xs text-text-muted flex-shrink-0">
            ${token.ticker}
          </span>
        </div>

        {/* Metrics row */}
        <div className="flex items-center gap-2 mt-1 text-[11px]">
          <span className="text-text-muted">
            {relativeTime(token.detectedAt)}
          </span>
          <span className="text-text-faint">|</span>
          <AnimatedPrice
            value={mcapUsd}
            format="usd"
            showArrow
            className="text-[11px] text-green"
          />
          <span className="text-text-faint">|</span>
          <span className="text-text-secondary font-mono">
            {token.holders != null ? `${formatNumber(token.holders)} H` : "\u2014"}
          </span>
        </div>

        {/* Bonding progress bar */}
        {token.bondingProgress != null && !token.isGraduated && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-bg-elevated overflow-hidden">
              <div
                className="h-full rounded-full bg-green transition-all duration-500"
                style={{ width: `${Math.min(token.bondingProgress, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-text-muted font-mono flex-shrink-0">
              {token.bondingProgress.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Right side: Buy/Sell counts + watchlist */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1 text-[11px] font-mono">
            <span className="text-green">
              {token.buyCount != null ? formatNumber(token.buyCount) : "\u2014"}
            </span>
            <span className="text-text-faint">/</span>
            <span className="text-red">
              {token.sellCount != null ? formatNumber(token.sellCount) : "\u2014"}
            </span>
          </div>
          {token.devHoldPct != null && (
            <span
              className={`text-[10px] font-mono ${
                token.devHoldPct > 15 ? "text-red" : "text-text-muted"
              }`}
            >
              Dev {token.devHoldPct.toFixed(1)}%
            </span>
          )}
        </div>
        <CompareButton
          mintAddress={token.mintAddress}
          size={18}
        />
        <QuickTradeButton
          token={{
            mintAddress: token.mintAddress,
            name: token.name,
            ticker: token.ticker,
            imageUri: token.imageUri,
          }}
          size={18}
        />
        <WatchlistButton
          token={{
            mintAddress: token.mintAddress,
            name: token.name,
            ticker: token.ticker,
            imageUri: token.imageUri,
          }}
          size={18}
        />
      </div>
    </button>
  );
}

// ---- Skeleton ----

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-3 bg-bg-card border border-border rounded-xl animate-pulse">
      <div className="w-10 h-10 rounded-full bg-bg-elevated" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 bg-bg-elevated rounded" />
        <div className="h-2 w-36 bg-bg-elevated rounded" />
      </div>
      <div className="h-4 w-12 bg-bg-elevated rounded" />
    </div>
  );
}
