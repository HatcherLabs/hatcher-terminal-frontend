"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { WatchlistButton } from "@/components/ui/WatchlistButton";
import { QuickTradeButton } from "@/components/trade/QuickTradeButton";
import { AnimatedPrice } from "@/components/ui/AnimatedPrice";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

type ExploreCategory = "new" | "graduating" | "migrated";
type SortKey = "newest" | "marketCap" | "holders" | "volume" | "bonding" | "devHold";
type SortDirection = "desc" | "asc";

const TABS: { key: ExploreCategory; label: string; desc: string }[] = [
  { key: "new", label: "New Pairs", desc: "Just created" },
  { key: "graduating", label: "Close to Bond", desc: "Near graduation" },
  { key: "migrated", label: "Graduated", desc: "On Raydium" },
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

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
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

// ---- sort header ----

function SortHeader({
  label,
  sortKey: key,
  currentSort,
  currentDirection,
  onSort,
  align = "right",
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDirection: SortDirection;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = currentSort === key;
  return (
    <button
      onClick={() => onSort(key)}
      className={`flex items-center gap-0.5 text-[10px] uppercase tracking-wider font-semibold transition-colors whitespace-nowrap ${
        align === "right" ? "ml-auto" : ""
      } ${isActive ? "text-[#7c4dff]" : "text-[#666680] hover:text-[#9999aa]"}`}
    >
      {label}
      {isActive && (
        <span className="text-[9px]">
          {currentDirection === "desc" ? "\u25BE" : "\u25B4"}
        </span>
      )}
    </button>
  );
}

// ---- component ----

export default function TrenchesPage() {
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

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ExploreToken[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

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

  const handleLoadMore = useCallback(() => {
    if (loadingMore) return;
    fetchTokens(tokens.length, true);
  }, [fetchTokens, tokens.length, loadingMore]);

  // Infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMore || loadingMore || loading) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, handleLoadMore]);

  const handleSortToggle = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
      } else {
        setSortKey(key);
        setSortDirection("desc");
      }
    },
    [sortKey]
  );

  const sortedTokens = useMemo(() => {
    const sorted = [...tokens].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortKey) {
        case "newest":
          aVal = new Date(a.detectedAt).getTime();
          bVal = new Date(b.detectedAt).getTime();
          break;
        case "marketCap":
          aVal = a.marketCapSol ?? 0;
          bVal = b.marketCapSol ?? 0;
          break;
        case "holders":
          aVal = a.holders ?? 0;
          bVal = b.holders ?? 0;
          break;
        case "volume":
          aVal = (a.buyCount ?? 0) + (a.sellCount ?? 0);
          bVal = (b.buyCount ?? 0) + (b.sellCount ?? 0);
          break;
        case "bonding":
          aVal = a.bondingProgress ?? 0;
          bVal = b.bondingProgress ?? 0;
          break;
        case "devHold":
          aVal = a.devHoldPct ?? 0;
          bVal = b.devHoldPct ?? 0;
          break;
        default:
          return 0;
      }

      return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
    });
    return sorted;
  }, [tokens, sortKey, sortDirection]);

  const displayTokens = searchQuery.length >= 2 ? searchResults : sortedTokens;

  return (
    <div className="flex flex-col pt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight" style={{ color: "#ffffff" }}>
            THE{" "}
            <span style={{ color: "#00ff88" }}>TRENCHES</span>
          </h1>
          <span
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
            style={{ background: "rgba(0,255,136,0.08)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.15)" }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#00ff88" }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "#00ff88" }} />
            </span>
            Live
          </span>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: "#0a0a14", border: "1px solid #1a1a2e" }}>
          <button
            onClick={() => setViewMode("table")}
            className="p-1.5 rounded transition-colors"
            style={viewMode === "table" ? { background: "#141428", color: "#ffffff" } : { color: "#666680" }}
            aria-label="Table view"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className="p-1.5 rounded transition-colors"
            style={viewMode === "cards" ? { background: "#141428", color: "#ffffff" } : { color: "#666680" }}
            aria-label="Card view"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, ticker, or address..."
          className="w-full px-4 py-2.5 pl-10 text-sm rounded-xl focus:outline-none transition-all"
          style={{
            background: "#06060b",
            border: "1px solid #1a1a2e",
            color: "#e0e0e8",
          }}
        />
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "#444460" }}
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
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: "#666680" }}
          >
            <span className="text-lg leading-none">&times;</span>
          </button>
        )}
      </div>

      {/* Tab bar */}
      <nav
        className="flex items-center gap-1 p-1 mb-4 rounded-full self-start"
        style={{ background: "#0a0a14", border: "1px solid #1a1a2e" }}
        role="tablist"
        aria-label="Token categories"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className="relative px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap"
              style={
                isActive
                  ? { background: "#00ff88", color: "#050507", boxShadow: "0 0 8px rgba(0,255,136,0.2)" }
                  : { color: "#666680" }
              }
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col gap-[1px]">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : searching ? (
        <div className="flex flex-col gap-[1px]">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : displayTokens.length === 0 ? (
        <div className="text-center py-16" style={{ color: "#666680" }}>
          <svg className="mx-auto mb-3 w-12 h-12 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 15h8" />
            <circle cx="9" cy="9" r="1" fill="currentColor" />
            <circle cx="15" cy="9" r="1" fill="currentColor" />
          </svg>
          <p className="text-sm">
            {searchQuery.length >= 2
              ? `No tokens found for "${searchQuery}"`
              : "No tokens in this category yet."}
          </p>
        </div>
      ) : viewMode === "table" ? (
        <div className="overflow-x-auto -mx-2 px-2">
          {/* Table header */}
          <div
            className="grid items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-wider font-semibold rounded-t-lg min-w-[680px]"
            style={{
              gridTemplateColumns: "minmax(160px, 2fr) 80px 60px 70px 80px 60px 70px 40px",
              background: "#08080f",
              borderBottom: "1px solid #1a1a2e",
              color: "#555570",
            }}
          >
            <SortHeader label="Token" sortKey="newest" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSortToggle} align="left" />
            <SortHeader label="MC" sortKey="marketCap" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSortToggle} />
            <SortHeader label="Holders" sortKey="holders" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSortToggle} />
            <SortHeader label="Txns" sortKey="volume" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSortToggle} />
            <SortHeader label="Bonding" sortKey="bonding" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSortToggle} />
            <SortHeader label="Dev %" sortKey="devHold" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSortToggle} />
            <span className="text-right">Age</span>
            <span />
          </div>

          {/* Table rows */}
          <div className="flex flex-col min-w-[680px]">
            {displayTokens.map((token) => (
              <TableRow
                key={token.id}
                token={token}
                isNew={newIds.has(token.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Card view */
        <div className="flex flex-col gap-[1px]">
          {displayTokens.map((token) => (
            <CardRow
              key={token.id}
              token={token}
              isNew={newIds.has(token.id)}
            />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasMore && !searchQuery && (
        <>
          <div ref={sentinelRef} className="h-1" aria-hidden="true" />
          {loadingMore && (
            <div className="mt-3 flex items-center justify-center py-3">
              <span
                className="w-5 h-5 rounded-full animate-spin"
                style={{ border: "2px solid rgba(102,102,128,0.3)", borderTopColor: "#666680" }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---- Table Row (Terminal style) ----

function TableRow({
  token,
  isNew,
}: {
  token: ExploreToken;
  isNew: boolean;
}) {
  const mcapUsd = token.marketCapSol != null ? token.marketCapSol * SOL_PRICE_USD : null;
  const totalTxns = (token.buyCount ?? 0) + (token.sellCount ?? 0);

  return (
    <Link
      href={`/token/${token.mintAddress}`}
      className="grid items-center gap-2 px-3 py-2.5 transition-all duration-150 cursor-pointer group"
      style={{
        gridTemplateColumns: "minmax(160px, 2fr) 80px 60px 70px 80px 60px 70px 40px",
        background: isNew ? "rgba(0,255,136,0.02)" : "transparent",
        borderBottom: "1px solid rgba(26,26,46,0.5)",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(20,20,40,0.5)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isNew ? "rgba(0,255,136,0.02)" : "transparent"; }}
    >
      {/* Token name + avatar */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden"
          style={{ background: "#0d0d1a" }}
        >
          {token.imageUri ? (
            <img
              src={token.imageUri}
              alt={token.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ color: "#555570" }}>
              {token.ticker.charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold truncate" style={{ color: "#e0e0e8" }}>
              ${token.ticker}
            </span>
            {token.riskLevel && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: token.riskLevel === "LOW" ? "rgba(0,230,118,0.1)" :
                    token.riskLevel === "MED" ? "rgba(255,171,0,0.1)" :
                    token.riskLevel === "HIGH" ? "rgba(255,59,92,0.1)" :
                    "rgba(255,23,68,0.15)",
                  color: token.riskLevel === "LOW" ? "#00e676" :
                    token.riskLevel === "MED" ? "#ffab00" :
                    token.riskLevel === "HIGH" ? "#ff3b5c" :
                    "#ff1744",
                }}
              >
                {token.riskLevel}
              </span>
            )}
            {isNew && (
              <span
                className="text-[8px] font-bold px-1 py-0.5 rounded animate-pulse"
                style={{ background: "rgba(0,255,136,0.12)", color: "#00ff88" }}
              >
                NEW
              </span>
            )}
          </div>
          <p className="text-[11px] truncate" style={{ color: "#555570" }}>
            {token.name}
          </p>
        </div>
      </div>

      {/* Market Cap */}
      <div className="text-right">
        {mcapUsd != null ? (
          <AnimatedPrice
            value={mcapUsd}
            format="usd"
            showArrow
            className="text-xs font-mono"
          />
        ) : (
          <span className="text-xs font-mono" style={{ color: "#555570" }}>\u2014</span>
        )}
        {token.marketCapSol != null && (
          <p className="text-[10px] font-mono" style={{ color: "#444460" }}>
            {token.marketCapSol.toFixed(1)} SOL
          </p>
        )}
      </div>

      {/* Holders */}
      <div className="text-right">
        <span className="text-xs font-mono" style={{ color: "#b0b0c0" }}>
          {token.holders != null ? formatNumber(token.holders) : "\u2014"}
        </span>
      </div>

      {/* Txns (Buy/Sell) */}
      <div className="text-right">
        <span className="text-xs font-mono" style={{ color: "#b0b0c0" }}>
          {formatNumber(totalTxns)}
        </span>
        <div className="flex items-center justify-end gap-0.5 text-[10px] font-mono">
          <span style={{ color: "#00e676" }}>
            {token.buyCount != null ? formatNumber(token.buyCount) : "0"}
          </span>
          <span style={{ color: "#444460" }}>/</span>
          <span style={{ color: "#ff3b5c" }}>
            {token.sellCount != null ? formatNumber(token.sellCount) : "0"}
          </span>
        </div>
      </div>

      {/* Bonding progress */}
      <div className="text-right">
        {token.isGraduated ? (
          <span
            className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded"
            style={{ background: "rgba(0,230,118,0.1)", color: "#00e676" }}
          >
            GRAD
          </span>
        ) : token.bondingProgress != null ? (
          <div className="flex items-center gap-1.5">
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: "#0d0d1a" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(token.bondingProgress, 100)}%`,
                  background: token.bondingProgress > 80
                    ? "linear-gradient(90deg, #00e676, #00ff88)"
                    : token.bondingProgress > 50
                    ? "#ffab00"
                    : "#555570",
                }}
              />
            </div>
            <span className="text-[10px] font-mono shrink-0" style={{ color: "#b0b0c0" }}>
              {token.bondingProgress.toFixed(0)}%
            </span>
          </div>
        ) : (
          <span className="text-xs font-mono" style={{ color: "#555570" }}>\u2014</span>
        )}
      </div>

      {/* Dev Hold % */}
      <div className="text-right">
        <span
          className="text-xs font-mono"
          style={{
            color: token.devHoldPct != null && token.devHoldPct > 15
              ? "#ff3b5c"
              : token.devHoldPct != null && token.devHoldPct > 8
              ? "#ffab00"
              : "#b0b0c0",
          }}
        >
          {token.devHoldPct != null ? `${token.devHoldPct.toFixed(1)}%` : "\u2014"}
        </span>
      </div>

      {/* Age */}
      <div className="text-right">
        <span className="text-[11px] font-mono" style={{ color: "#666680" }}>
          {relativeTime(token.detectedAt)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <QuickTradeButton
          token={{
            mintAddress: token.mintAddress,
            name: token.name,
            ticker: token.ticker,
            imageUri: token.imageUri,
          }}
          size={16}
        />
        <WatchlistButton
          token={{
            mintAddress: token.mintAddress,
            name: token.name,
            ticker: token.ticker,
            imageUri: token.imageUri,
          }}
          size={16}
        />
      </div>
    </Link>
  );
}

// ---- Card Row (compact, mobile-friendly) ----

function CardRow({
  token,
  isNew,
}: {
  token: ExploreToken;
  isNew: boolean;
}) {
  const mcapUsd =
    token.marketCapSol != null ? token.marketCapSol * SOL_PRICE_USD : null;

  return (
    <Link
      href={`/token/${token.mintAddress}`}
      className="w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer"
      style={{
        background: isNew ? "rgba(0,255,136,0.02)" : "#0a0a14",
        border: "1px solid #1a1a2e",
      }}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden" style={{ background: "#0d0d1a" }}>
        {token.imageUri ? (
          <img
            src={token.imageUri}
            alt={token.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ color: "#555570" }}>
            {token.ticker.charAt(0)}
          </div>
        )}
      </div>

      {/* Name + ticker + metrics */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold truncate" style={{ color: "#e0e0e8" }}>
            {token.name}
          </span>
          <span className="text-xs flex-shrink-0" style={{ color: "#666680" }}>
            ${token.ticker}
          </span>
          {isNew && (
            <span
              className="text-[8px] font-bold px-1 py-0.5 rounded animate-pulse"
              style={{ background: "rgba(0,255,136,0.12)", color: "#00ff88" }}
            >
              NEW
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1 text-[11px]">
          <span style={{ color: "#666680" }}>
            {relativeTime(token.detectedAt)}
          </span>
          <span style={{ color: "#333348" }}>|</span>
          <AnimatedPrice
            value={mcapUsd}
            format="usd"
            showArrow
            className="text-[11px]"
          />
          <span style={{ color: "#333348" }}>|</span>
          <span className="font-mono" style={{ color: "#b0b0c0" }}>
            {token.holders != null ? `${formatNumber(token.holders)} H` : "\u2014"}
          </span>
        </div>

        {token.bondingProgress != null && !token.isGraduated && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "#0d0d1a" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(token.bondingProgress, 100)}%`,
                  background: "#00e676",
                }}
              />
            </div>
            <span className="text-[10px] font-mono flex-shrink-0" style={{ color: "#666680" }}>
              {token.bondingProgress.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1 text-[11px] font-mono">
            <span style={{ color: "#00e676" }}>
              {token.buyCount != null ? formatNumber(token.buyCount) : "\u2014"}
            </span>
            <span style={{ color: "#333348" }}>/</span>
            <span style={{ color: "#ff3b5c" }}>
              {token.sellCount != null ? formatNumber(token.sellCount) : "\u2014"}
            </span>
          </div>
          {token.devHoldPct != null && (
            <span
              className="text-[10px] font-mono"
              style={{
                color: token.devHoldPct > 15 ? "#ff3b5c" : "#666680",
              }}
            >
              Dev {token.devHoldPct.toFixed(1)}%
            </span>
          )}
        </div>
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
    </Link>
  );
}

// ---- Skeleton ----

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-3 animate-pulse rounded-xl" style={{ background: "#0a0a14", border: "1px solid #1a1a2e" }}>
      <div className="w-8 h-8 rounded-full" style={{ background: "#141428" }} />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 rounded" style={{ background: "#141428" }} />
        <div className="h-2 w-36 rounded" style={{ background: "#141428" }} />
      </div>
      <div className="h-4 w-12 rounded" style={{ background: "#141428" }} />
    </div>
  );
}
