"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { WatchlistButton } from "@/components/ui/WatchlistButton";
import { QuickTradeButton } from "@/components/trade/QuickTradeButton";
import { SnipeButton } from "@/components/trade/SnipeButton";
import { Sparkline } from "@/components/ui/Sparkline";
import { SecurityDots } from "@/components/ui/SecurityDots";
import { useToast } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { VirtualizedTable } from "@/components/ui/VirtualizedTable";
import { MarketOverview } from "@/components/explore/MarketOverview";
import { TokenScanner } from "@/components/explore/TokenScanner";
import { TrendingBar } from "@/components/explore/TrendingBar";
import { api } from "@/lib/api";

type ExploreCategory = "new" | "graduating" | "migrated";
type SortKey = "newest" | "marketCap" | "holders" | "volume" | "bonding" | "devHold" | "heat" | "buySellRatio" | "topHolders" | "risk";
type SortDirection = "desc" | "asc";
type AgeFilter = "all" | "5m" | "30m" | "1h" | "6h" | "24h";

const AGE_FILTERS: { key: AgeFilter; label: string; maxMs: number }[] = [
  { key: "all", label: "All", maxMs: 0 },
  { key: "5m", label: "< 5m", maxMs: 5 * 60 * 1000 },
  { key: "30m", label: "< 30m", maxMs: 30 * 60 * 1000 },
  { key: "1h", label: "< 1h", maxMs: 60 * 60 * 1000 },
  { key: "6h", label: "< 6h", maxMs: 6 * 60 * 60 * 1000 },
  { key: "24h", label: "< 24h", maxMs: 24 * 60 * 60 * 1000 },
];

const TABS: { key: ExploreCategory; label: string; desc: string; icon: string }[] = [
  { key: "new", label: "New Pairs", desc: "Just created", icon: "+" },
  { key: "graduating", label: "Close to Bond", desc: "60%+ bonding", icon: "\uD83D\uDD25" },
  { key: "migrated", label: "Graduated", desc: "On Raydium", icon: "\u2713" },
];

const SOL_PRICE_USD = Number(process.env.NEXT_PUBLIC_SOL_PRICE_USD || 150);
const PAGE_SIZE = 30;
const REFRESH_INTERVAL = 10_000;

// ---- helpers ----

function formatCompact(n: number | null | undefined): string {
  if (n === null || n === undefined) return "\u2014";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(n < 10 ? 1 : 0);
}

function formatUsdCompact(n: number | null | undefined): string {
  if (n === null || n === undefined) return "\u2014";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
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

function computeHeat(t: { holders?: number | null; buyCount?: number | null; sellCount?: number | null; volume1h?: number | null; bondingProgress?: number | null; marketCapSol?: number | null }): number {
  let score = 30;
  const buys = t.buyCount ?? 0;
  const sells = t.sellCount ?? 0;
  const totalTx = buys + sells;
  if (totalTx > 100) score += 15;
  else if (totalTx > 30) score += 8;
  if (buys > sells * 2) score += 10;
  if ((t.holders ?? 0) > 100) score += 10;
  else if ((t.holders ?? 0) > 30) score += 5;
  if ((t.volume1h ?? 0) > 10000) score += 10;
  if ((t.bondingProgress ?? 0) > 60) score += 10;
  else if ((t.bondingProgress ?? 0) > 30) score += 5;
  if ((t.marketCapSol ?? 0) > 100) score += 5;
  return Math.min(99, Math.max(10, score));
}

function getRiskColor(riskLevel: string | null | undefined): string {
  if (riskLevel === "LOW" || riskLevel === undefined || riskLevel === null) return "#00d672";
  if (riskLevel === "MED") return "#f0a000";
  if (riskLevel === "HIGH") return "#ff6d00";
  return "#f23645";
}

function getRiskLabel(riskLevel: string | null | undefined): string {
  if (!riskLevel) return "\u2014";
  return riskLevel;
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
  topHoldersPct: number | null;
  isGraduated: boolean;
  riskLevel: string | null;
  twitter?: string | null;
  telegram?: string | null;
  website?: string | null;
  description?: string | null;
  creatorAddress?: string;
  volume1h?: number | null;
  priceChange5m?: number | null;
  priceChange1h?: number | null;
  heatScore?: number | null;
  sparkline?: number[] | null;
  lpBurned?: boolean;
  mintRevoked?: boolean;
  freezeRevoked?: boolean;
}

// ---- Buy/Sell ratio bar ----

function BuySellBar({ buys, sells }: { buys: number; sells: number }) {
  const total = buys + sells;
  if (total === 0) {
    return (
      <div className="flex items-center gap-1" style={{ width: "100%" }}>
        <span className="font-mono text-[9px]" style={{ color: "#363d54" }}>{"\u2014"}</span>
      </div>
    );
  }
  const buyPct = (buys / total) * 100;

  return (
    <div className="flex flex-col gap-[2px]" style={{ width: "100%" }}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] font-bold" style={{ color: "#00d672" }}>
          {formatCompact(buys)}
        </span>
        <span className="font-mono text-[9px] font-bold" style={{ color: "#f23645" }}>
          {formatCompact(sells)}
        </span>
      </div>
      <div className="flex h-[3px] rounded-full overflow-hidden" style={{ background: "#f2364530" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${buyPct}%`,
            background: buyPct > 65 ? "#00d672" : buyPct > 45 ? "#f0a000" : "#f23645",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

// ---- Heat score display (prominent) ----

function HeatDisplay({ heat }: { heat: number }) {
  const isHot = heat > 70;
  const isWarm = heat > 40;
  const color = isHot ? "#00d672" : isWarm ? "#f0a000" : "#5c6380";
  const bgOpacity = isHot ? "20" : isWarm ? "15" : "10";

  return (
    <div className="flex items-center gap-1">
      <div
        className="relative flex items-center justify-center font-mono text-[11px] font-black rounded-[4px]"
        style={{
          background: `${color}${bgOpacity}`,
          color: color,
          border: `1px solid ${color}30`,
          padding: "1px 6px",
          minWidth: 32,
          textAlign: "center",
        }}
      >
        {heat}
        {isHot && (
          <span
            className="absolute -top-[2px] -right-[2px] w-[5px] h-[5px] rounded-full animate-pulse"
            style={{ background: color }}
          />
        )}
      </div>
    </div>
  );
}

// ---- Bonding progress bar (with urgency for graduating tab) ----

function BondingBar({ progress, isGraduated, urgent }: { progress: number | null; isGraduated: boolean; urgent?: boolean }) {
  if (isGraduated) {
    return (
      <span
        className="font-mono text-[8px] font-bold px-1.5 py-[2px] rounded-[3px] uppercase tracking-wider"
        style={{ background: "#00d67218", color: "#00d672", border: "1px solid #00d67225" }}
      >
        Graduated
      </span>
    );
  }

  if (progress === null || progress === undefined) {
    return <span className="font-mono text-[9px]" style={{ color: "#363d54" }}>{"\u2014"}</span>;
  }

  const isNearGrad = progress >= 80;
  const isClose = progress >= 60;
  const barColor = isNearGrad ? "#00d672" : isClose ? "#f0a000" : "#3b82f6";

  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className="flex-1 h-[4px] rounded-full overflow-hidden" style={{ background: "#04060b" }}>
        <div
          className={`h-full rounded-full ${isNearGrad && urgent ? "animate-pulse" : ""}`}
          style={{
            width: `${Math.min(progress, 100)}%`,
            background: barColor,
            boxShadow: isNearGrad ? `0 0 6px ${barColor}60` : "none",
            transition: "width 0.5s ease",
          }}
        />
      </div>
      <span
        className="font-mono text-[9px] font-bold shrink-0"
        style={{
          color: barColor,
          textShadow: isNearGrad && urgent ? `0 0 4px ${barColor}40` : "none",
        }}
      >
        {progress.toFixed(0)}%
      </span>
    </div>
  );
}

// ---- sort header with arrow indicators ----

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
      }`}
      style={{
        color: isActive ? "#8b5cf6" : "#5c6380",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
      }}
    >
      {label}
      <span
        className="inline-flex flex-col leading-none text-[7px] ml-[1px]"
        style={{ gap: 0, lineHeight: 1 }}
      >
        <span style={{ color: isActive && currentDirection === "asc" ? "#8b5cf6" : "#363d54" }}>
          {"\u25B2"}
        </span>
        <span style={{ color: isActive && currentDirection === "desc" ? "#8b5cf6" : "#363d54" }}>
          {"\u25BC"}
        </span>
      </span>
    </button>
  );
}

// ---- column configs per tab ----

interface ColumnDef {
  key: string;
  label: string;
  sortKey?: SortKey;
  width: number;
  align?: "left" | "right";
}

const BASE_COLUMNS: ColumnDef[] = [
  { key: "token", label: "Token", sortKey: "newest", width: 170, align: "left" },
  { key: "heat", label: "Heat", sortKey: "heat", width: 48, align: "left" },
  { key: "age", label: "Age", width: 42, align: "left" },
  { key: "mcap", label: "MCap", sortKey: "marketCap", width: 68, align: "left" },
  { key: "volume", label: "Vol 1H", sortKey: "volume", width: 62, align: "left" },
  { key: "buySell", label: "B/S", sortKey: "buySellRatio", width: 72, align: "left" },
  { key: "holders", label: "Holders", sortKey: "holders", width: 52, align: "left" },
  { key: "devPct", label: "Dev%", sortKey: "devHold", width: 46, align: "left" },
  { key: "topHolders", label: "Top10%", sortKey: "topHolders", width: 50, align: "left" },
  { key: "bonding", label: "Bonding", sortKey: "bonding", width: 80, align: "left" },
  { key: "chart", label: "5m", width: 70, align: "left" },
  { key: "risk", label: "Risk", sortKey: "risk", width: 50, align: "left" },
  { key: "sec", label: "Sec", width: 32, align: "left" },
  { key: "action", label: "", width: 36, align: "right" },
];

const GRADUATING_COLUMNS: ColumnDef[] = [
  { key: "token", label: "Token", sortKey: "newest", width: 170, align: "left" },
  { key: "heat", label: "Heat", sortKey: "heat", width: 48, align: "left" },
  { key: "age", label: "Age", width: 42, align: "left" },
  { key: "mcap", label: "MCap", sortKey: "marketCap", width: 68, align: "left" },
  { key: "bonding", label: "Bonding", sortKey: "bonding", width: 100, align: "left" },
  { key: "volume", label: "Vol 1H", sortKey: "volume", width: 62, align: "left" },
  { key: "buySell", label: "B/S", sortKey: "buySellRatio", width: 72, align: "left" },
  { key: "holders", label: "Holders", sortKey: "holders", width: 52, align: "left" },
  { key: "devPct", label: "Dev%", sortKey: "devHold", width: 46, align: "left" },
  { key: "topHolders", label: "Top10%", sortKey: "topHolders", width: 50, align: "left" },
  { key: "chart", label: "5m", width: 70, align: "left" },
  { key: "risk", label: "Risk", sortKey: "risk", width: 50, align: "left" },
  { key: "sec", label: "Sec", width: 32, align: "left" },
  { key: "action", label: "", width: 36, align: "right" },
];

const MIGRATED_COLUMNS: ColumnDef[] = [
  { key: "token", label: "Token", sortKey: "newest", width: 170, align: "left" },
  { key: "heat", label: "Heat", sortKey: "heat", width: 48, align: "left" },
  { key: "age", label: "Age", width: 42, align: "left" },
  { key: "mcap", label: "MCap", sortKey: "marketCap", width: 72, align: "left" },
  { key: "volume", label: "Vol 1H", sortKey: "volume", width: 62, align: "left" },
  { key: "buySell", label: "B/S", sortKey: "buySellRatio", width: 72, align: "left" },
  { key: "holders", label: "Holders", sortKey: "holders", width: 52, align: "left" },
  { key: "devPct", label: "Dev%", sortKey: "devHold", width: 46, align: "left" },
  { key: "topHolders", label: "Top10%", sortKey: "topHolders", width: 50, align: "left" },
  { key: "priceChange", label: "5m / 1h", width: 80, align: "left" },
  { key: "chart", label: "Chart", width: 70, align: "left" },
  { key: "risk", label: "Risk", sortKey: "risk", width: 50, align: "left" },
  { key: "sec", label: "Sec", width: 32, align: "left" },
  { key: "action", label: "", width: 36, align: "right" },
];

function getColumns(tab: ExploreCategory): ColumnDef[] {
  if (tab === "graduating") return GRADUATING_COLUMNS;
  if (tab === "migrated") return MIGRATED_COLUMNS;
  return BASE_COLUMNS;
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

  // Quick filters
  const [ageFilter, setAgeFilter] = useState<AgeFilter>("all");
  const [minMcap, setMinMcap] = useState("");
  const [minHolders, setMinHolders] = useState("");
  const [hasSocials, setHasSocials] = useState(false);

  // Token count for header
  const tokenCount = tokens.length;

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
          aVal = a.volume1h ?? 0;
          bVal = b.volume1h ?? 0;
          break;
        case "bonding":
          aVal = a.bondingProgress ?? 0;
          bVal = b.bondingProgress ?? 0;
          break;
        case "devHold":
          aVal = a.devHoldPct ?? 0;
          bVal = b.devHoldPct ?? 0;
          break;
        case "heat":
          aVal = a.heatScore ?? computeHeat(a);
          bVal = b.heatScore ?? computeHeat(b);
          break;
        case "buySellRatio": {
          const aTot = (a.buyCount ?? 0) + (a.sellCount ?? 0);
          const bTot = (b.buyCount ?? 0) + (b.sellCount ?? 0);
          aVal = aTot > 0 ? (a.buyCount ?? 0) / aTot : 0;
          bVal = bTot > 0 ? (b.buyCount ?? 0) / bTot : 0;
          break;
        }
        case "topHolders":
          aVal = a.topHoldersPct ?? 0;
          bVal = b.topHoldersPct ?? 0;
          break;
        case "risk": {
          const riskOrder: Record<string, number> = { LOW: 1, MED: 2, HIGH: 3, EXTREME: 4 };
          aVal = riskOrder[a.riskLevel ?? "LOW"] ?? 0;
          bVal = riskOrder[b.riskLevel ?? "LOW"] ?? 0;
          break;
        }
        default:
          return 0;
      }

      return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
    });
    return sorted;
  }, [tokens, sortKey, sortDirection]);

  const filteredTokens = useMemo(() => {
    let list = searchQuery.length >= 2 ? searchResults : sortedTokens;

    // Age filter
    if (ageFilter !== "all") {
      const maxMs = AGE_FILTERS.find((f) => f.key === ageFilter)?.maxMs ?? 0;
      if (maxMs > 0) {
        const now = Date.now();
        list = list.filter((t) => {
          const ts = new Date(t.detectedAt).getTime();
          return now - ts <= maxMs;
        });
      }
    }

    // Min MCap filter (parse as USD)
    const mcapNum = parseFloat(minMcap);
    if (!isNaN(mcapNum) && mcapNum > 0) {
      list = list.filter((t) => (t.marketCapUsd ?? (t.marketCapSol ?? 0) * SOL_PRICE_USD) >= mcapNum);
    }

    // Min Holders filter
    const holdersNum = parseInt(minHolders, 10);
    if (!isNaN(holdersNum) && holdersNum > 0) {
      list = list.filter((t) => (t.holders ?? 0) >= holdersNum);
    }

    // Has Socials filter
    if (hasSocials) {
      list = list.filter((t) => !!(t.twitter || t.telegram || t.website));
    }

    return list;
  }, [searchQuery, searchResults, sortedTokens, ageFilter, minMcap, minHolders, hasSocials]);

  const displayTokens = filteredTokens;
  const columns = getColumns(activeTab);
  const tableMinWidth = columns.reduce((acc, col) => acc + col.width, 0);

  return (
    <ErrorBoundary fallbackTitle="Explore error">
    {/* Desktop Market Overview bar */}
    <MarketOverview tokens={tokens as unknown as import("@/types/token").TokenData[]} />
    <div className="terminal:flex terminal:gap-0" style={{ height: "100%", minHeight: 0 }}>
    <div className="flex flex-col pt-2 flex-1" style={{ minHeight: 0, minWidth: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight" style={{ color: "#eef0f6" }}>
            THE{" "}
            <span style={{ color: "#00d672" }}>TRENCHES</span>
          </h1>
          <span
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
            style={{ background: "#00d67218", color: "#00d672", border: "1px solid #00d67225" }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#00d672" }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "#00d672" }} />
            </span>
            Live
          </span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ color: "#5c6380", background: "#0a0d14" }}>
            {tokenCount} tokens
          </span>
        </div>

        {/* View toggle + refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTokens(0, false)}
            className="p-1.5 rounded transition-colors"
            style={{ color: "#5c6380", border: "1px solid #1a1f2e" }}
            title="Refresh"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
          </button>
          <div className="flex items-center gap-0 p-0.5 rounded-lg" style={{ background: "#04060b", border: "1px solid #1a1f2e" }}>
            <button
              onClick={() => setViewMode("table")}
              className="p-1.5 rounded transition-colors"
              style={viewMode === "table" ? { background: "#181c28", color: "#eef0f6" } : { color: "#5c6380" }}
              aria-label="Table view"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className="p-1.5 rounded transition-colors"
              style={viewMode === "cards" ? { background: "#181c28", color: "#eef0f6" } : { color: "#5c6380" }}
              aria-label="Card view"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, ticker, or address..."
          className="w-full px-4 py-2 pl-9 text-[12px] rounded-lg focus:outline-none transition-all font-mono"
          style={{
            background: "#04060b",
            border: "1px solid #1a1f2e",
            color: "#eef0f6",
          }}
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
          style={{ color: "#363d54" }}
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
            style={{ color: "#5c6380" }}
          >
            <span className="text-lg leading-none">&times;</span>
          </button>
        )}
      </div>

      {/* Trending bar */}
      <TrendingBar tokens={tokens} />

      {/* Tab bar */}
      <nav
        className="flex items-center gap-1 p-[3px] mb-3 rounded-lg self-start"
        style={{ background: "#04060b", border: "1px solid #1a1f2e" }}
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
              onClick={() => {
                setActiveTab(tab.key);
                setSortKey(tab.key === "graduating" ? "bonding" : "newest");
                setSortDirection("desc");
              }}
              className="relative px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 whitespace-nowrap flex items-center gap-1.5"
              style={
                isActive
                  ? tab.key === "graduating"
                    ? { background: "#f0a00025", color: "#f0a000", boxShadow: "0 0 8px rgba(240,160,0,0.15)" }
                    : tab.key === "migrated"
                      ? { background: "#00d67220", color: "#00d672", boxShadow: "0 0 8px rgba(0,214,114,0.15)" }
                      : { background: "#8b5cf620", color: "#8b5cf6", boxShadow: "0 0 8px rgba(139,92,246,0.15)" }
                  : { color: "#5c6380" }
              }
            >
              <span className="text-[10px]">{tab.icon}</span>
              {tab.label}
              {isActive && (
                <span
                  className="font-mono text-[9px] ml-0.5 px-1 py-[0px] rounded"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  {tokenCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Age filter pills + quick filters */}
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-2.5 py-1.5 mb-2 rounded-lg"
        style={{ background: "#04060b", border: "1px solid #1a1f2e" }}
      >
        {/* Age pills */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] uppercase tracking-wider font-semibold mr-1" style={{ color: "#363d54" }}>
            Age
          </span>
          {AGE_FILTERS.map((f) => {
            const isActive = ageFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setAgeFilter(f.key)}
                className="px-2 py-[2px] rounded text-[10px] font-semibold transition-all duration-150"
                style={
                  isActive
                    ? { background: "#00d67218", color: "#00d672", border: "1px solid #00d67230" }
                    : { background: "transparent", color: "#5c6380", border: "1px solid transparent" }
                }
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Separator */}
        <div className="w-px h-4 self-center" style={{ background: "#1a1f2e" }} />

        {/* Min MCap */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: "#363d54" }}>
            MCap
          </span>
          <input
            type="text"
            value={minMcap}
            onChange={(e) => setMinMcap(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="Min $"
            className="w-[60px] px-1.5 py-[2px] rounded text-[10px] font-mono focus:outline-none"
            style={{
              background: "#0a0d14",
              border: "1px solid #1a1f2e",
              color: "#eef0f6",
            }}
          />
        </div>

        {/* Min Holders */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: "#363d54" }}>
            Holders
          </span>
          <input
            type="text"
            value={minHolders}
            onChange={(e) => setMinHolders(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="Min"
            className="w-[48px] px-1.5 py-[2px] rounded text-[10px] font-mono focus:outline-none"
            style={{
              background: "#0a0d14",
              border: "1px solid #1a1f2e",
              color: "#eef0f6",
            }}
          />
        </div>

        {/* Separator */}
        <div className="w-px h-4 self-center" style={{ background: "#1a1f2e" }} />

        {/* Has Socials toggle */}
        <button
          onClick={() => setHasSocials((v) => !v)}
          className="flex items-center gap-1 px-2 py-[2px] rounded text-[10px] font-semibold transition-all duration-150"
          style={
            hasSocials
              ? { background: "#00d67218", color: "#00d672", border: "1px solid #00d67230" }
              : { background: "transparent", color: "#5c6380", border: "1px solid transparent" }
          }
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Socials
        </button>

        {/* Clear all filters */}
        {(ageFilter !== "all" || minMcap || minHolders || hasSocials) && (
          <>
            <div className="w-px h-4 self-center" style={{ background: "#1a1f2e" }} />
            <button
              onClick={() => {
                setAgeFilter("all");
                setMinMcap("");
                setMinHolders("");
                setHasSocials(false);
              }}
              className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-[2px] rounded transition-colors"
              style={{ color: "#f23645", background: "#f2364510" }}
            >
              Clear
            </button>
          </>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : searching ? (
        <div className="flex flex-col">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : displayTokens.length === 0 ? (
        <div className="text-center py-16" style={{ color: "#5c6380" }}>
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
        <div className="overflow-x-auto -mx-2 px-2 terminal-scrollbar-x" style={{ display: "flex", flexDirection: "column", flex: "1 1 0%", minHeight: 0 }}>
          <VirtualizedTable<ExploreToken>
            items={displayTokens}
            rowHeight={40}
            overscan={5}
            emptyMessage="No tokens found."
            renderHeader={() => (
              <div
                className="flex items-center gap-0 px-2 py-1.5 text-[9px] uppercase tracking-[.06em] font-bold rounded-t-md"
                style={{
                  borderBottom: "1px solid #1a1f2e",
                  background: "#0a0d14",
                  color: "#363d54",
                  minWidth: tableMinWidth,
                  flexShrink: 0,
                }}
              >
                {columns.map((col) => (
                  <div key={col.key} style={{ width: col.width, flexShrink: 0 }}>
                    {col.sortKey ? (
                      <SortHeader
                        label={col.label}
                        sortKey={col.sortKey}
                        currentSort={sortKey}
                        currentDirection={sortDirection}
                        onSort={handleSortToggle}
                        align={col.align ?? "left"}
                      />
                    ) : col.label ? (
                      <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#5c6380" }}>
                        {col.label}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            renderRow={(token, idx) => (
              <TableRow
                token={token}
                isNew={newIds.has(token.id)}
                columns={columns}
                activeTab={activeTab}
                rowIndex={idx}
              />
            )}
          />
        </div>
      ) : (
        /* Card view */
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 px-1">
          {displayTokens.map((token) => (
            <CardRow
              key={token.id}
              token={token}
              isNew={newIds.has(token.id)}
              activeTab={activeTab}
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
                style={{ border: "2px solid rgba(92,99,128,0.3)", borderTopColor: "#5c6380" }}
              />
            </div>
          )}
        </>
      )}
    </div>

    {/* Desktop Token Scanner sidebar */}
    <div
      className="hidden terminal:block shrink-0"
      style={{ width: 320, minHeight: 0, overflowY: "auto" }}
    >
      <TokenScanner tokens={tokens as unknown as import("@/types/token").TokenData[]} />
    </div>
    </div>
    </ErrorBoundary>
  );
}

// ---- Table Row ----

function TableRow({
  token,
  isNew,
  columns,
  activeTab,
  rowIndex,
}: {
  token: ExploreToken;
  isNew: boolean;
  columns: ColumnDef[];
  activeTab: ExploreCategory;
  rowIndex: number;
}) {
  const mcapUsd = token.marketCapSol != null ? token.marketCapSol * SOL_PRICE_USD : null;
  const heat = token.heatScore ?? computeHeat(token);
  const riskColor = getRiskColor(token.riskLevel);
  const riskLabel = getRiskLabel(token.riskLevel);
  const isUrgentBonding = activeTab === "graduating" && (token.bondingProgress ?? 0) >= 80;

  // Alternating row bg
  const rowBg = isNew ? "#00d67208" : rowIndex % 2 === 0 ? "transparent" : "#0a0d1440";

  const renderCell = (col: ColumnDef) => {
    switch (col.key) {
      case "token":
        return (
          <div className="flex items-center gap-2">
            <div
              className="flex-shrink-0 w-[24px] h-[24px] rounded-full overflow-hidden"
              style={{ background: "#0a0d14" }}
            >
              {token.imageUri ? (
                <img src={token.imageUri} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[8px] font-bold font-mono" style={{ color: "#5c6380" }}>
                  {token.ticker.slice(0, 3)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold font-mono text-[11px] truncate" style={{ color: "#eef0f6" }}>
                  ${token.ticker}
                </span>
                {isNew && (
                  <span className="text-[7px] font-bold px-[3px] py-[1px] rounded animate-pulse" style={{ background: "#00d67220", color: "#00d672" }}>
                    NEW
                  </span>
                )}
                {isUrgentBonding && (
                  <span className="text-[7px] font-bold px-[3px] py-[1px] rounded animate-pulse" style={{ background: "#f0a00025", color: "#f0a000" }}>
                    GRADUATING
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[8px] font-mono truncate" style={{ color: "#363d54" }}>
                  {token.mintAddress.slice(0, 4)}...{token.mintAddress.slice(-3)}
                </span>
                {token.twitter && (
                  <span className="text-[8px]" style={{ color: "#3b82f6" }} title="Has Twitter">{"\uD835\uDD4F"}</span>
                )}
                {token.website && (
                  <span className="text-[8px]" style={{ color: "#5c6380" }} title="Has Website">{"\uD83C\uDF10"}</span>
                )}
              </div>
            </div>
          </div>
        );

      case "heat":
        return <HeatDisplay heat={heat} />;

      case "age":
        return (
          <span className="font-mono text-[11px]" style={{ color: "#9ca3b8" }}>
            {relativeTime(token.detectedAt)}
          </span>
        );

      case "mcap":
        return (
          <span className="font-mono text-[11px] font-semibold" style={{ color: "#eef0f6" }}>
            {formatUsdCompact(mcapUsd)}
          </span>
        );

      case "volume":
        return (
          <span className="font-mono text-[11px]" style={{ color: "#eef0f6" }}>
            {token.volume1h != null ? formatUsdCompact(token.volume1h) : mcapUsd != null ? formatUsdCompact(mcapUsd * 0.3) : "\u2014"}
          </span>
        );

      case "buySell":
        return <BuySellBar buys={token.buyCount ?? 0} sells={token.sellCount ?? 0} />;

      case "holders":
        return (
          <span className="font-mono text-[11px]" style={{ color: "#eef0f6" }}>
            {token.holders != null ? formatCompact(token.holders) : "\u2014"}
          </span>
        );

      case "devPct":
        return (
          <span
            className="font-mono text-[11px]"
            style={{
              color: (token.devHoldPct ?? 0) > 15 ? "#f23645"
                : (token.devHoldPct ?? 0) > 8 ? "#f0a000"
                : "#9ca3b8",
            }}
          >
            {token.devHoldPct != null ? `${token.devHoldPct.toFixed(1)}%` : "\u2014"}
          </span>
        );

      case "topHolders":
        return (
          <span
            className="font-mono text-[11px]"
            style={{
              color: (token.topHoldersPct ?? 0) > 50 ? "#f23645"
                : (token.topHoldersPct ?? 0) > 30 ? "#f0a000"
                : "#9ca3b8",
            }}
          >
            {token.topHoldersPct != null ? `${token.topHoldersPct.toFixed(0)}%` : "\u2014"}
          </span>
        );

      case "bonding":
        return (
          <BondingBar
            progress={token.bondingProgress}
            isGraduated={token.isGraduated}
            urgent={activeTab === "graduating"}
          />
        );

      case "chart":
        return token.sparkline && token.sparkline.length > 2 ? (
          <Sparkline data={token.sparkline} width={60} height={20} />
        ) : (
          <div className="w-[60px] h-[20px] rounded" style={{ background: "#0a0d14" }} />
        );

      case "priceChange":
        return (
          <div className="flex items-center gap-1">
            <span
              className="font-mono text-[10px] font-semibold"
              style={{
                color: (token.priceChange5m ?? 0) >= 0 ? "#00d672" : "#f23645",
              }}
            >
              {token.priceChange5m != null ? `${token.priceChange5m > 0 ? "+" : ""}${token.priceChange5m.toFixed(1)}%` : "\u2014"}
            </span>
            <span style={{ color: "#363d54" }} className="text-[8px]">/</span>
            <span
              className="font-mono text-[10px]"
              style={{
                color: (token.priceChange1h ?? 0) >= 0 ? "#00d672" : "#f23645",
              }}
            >
              {token.priceChange1h != null ? `${token.priceChange1h > 0 ? "+" : ""}${token.priceChange1h.toFixed(1)}%` : "\u2014"}
            </span>
          </div>
        );

      case "risk":
        return token.riskLevel ? (
          <span
            className="font-mono text-[8px] font-bold px-[5px] py-[1px] rounded-[3px] uppercase"
            style={{
              background: `${riskColor}12`,
              color: riskColor,
              border: `1px solid ${riskColor}20`,
            }}
          >
            {riskLabel}
          </span>
        ) : (
          <span className="font-mono text-[9px]" style={{ color: "#363d54" }}>{"\u2014"}</span>
        );

      case "sec":
        return (
          <SecurityDots
            lpBurned={token.lpBurned}
            mintRevoked={token.mintRevoked}
            devHoldPct={token.devHoldPct ?? undefined}
          />
        );

      case "action":
        return (
          <div className="flex items-center gap-1.5">
            <QuickTradeButton
              token={{ mintAddress: token.mintAddress, name: token.name, ticker: token.ticker, imageUri: token.imageUri }}
              size={16}
            />
            <SnipeButton mintAddress={token.mintAddress} ticker={token.ticker} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Link
      href={`/token/${token.mintAddress}`}
      className="flex items-center px-2 py-[4px] transition-[background] duration-75 cursor-pointer group"
      style={{
        borderBottom: "1px solid #1a1f2e08",
        fontSize: 11,
        background: rowBg,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#10131c"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = rowBg; }}
    >
      {columns.map((col) => (
        <div
          key={col.key}
          style={{
            width: col.width,
            flexShrink: 0,
          }}
          className="flex items-center"
        >
          {renderCell(col)}
        </div>
      ))}
    </Link>
  );
}

// ---- Card Row (compact, mobile-friendly) ----

function CardRow({
  token,
  isNew,
  activeTab,
}: {
  token: ExploreToken;
  isNew: boolean;
  activeTab: ExploreCategory;
}) {
  const mcapUsd =
    token.marketCapSol != null ? token.marketCapSol * SOL_PRICE_USD : null;
  const volumeUsd =
    token.volume1h != null ? token.volume1h * SOL_PRICE_USD : null;
  const heat = token.heatScore ?? computeHeat(token);
  const isUrgentBonding = activeTab === "graduating" && (token.bondingProgress ?? 0) >= 80;
  const riskColor = getRiskColor(token.riskLevel);
  const riskLabel = getRiskLabel(token.riskLevel);

  const pct5m = token.priceChange5m;
  const pct1h = token.priceChange1h;

  return (
    <div
      className="relative flex flex-col overflow-hidden transition-all duration-200 hover:brightness-110"
      style={{
        background: "#0a0d14",
        border: isUrgentBonding ? "1px solid #f0a00050" : "1px solid #1a1f2e",
        borderRadius: 8,
        boxShadow: isUrgentBonding ? "0 0 12px #f0a00018" : "none",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = isUrgentBonding ? "#f0a00080" : "#2a3148";
        e.currentTarget.style.boxShadow = isUrgentBonding ? "0 0 14px #f0a00025" : "0 0 8px #1a1f2e40";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isUrgentBonding ? "#f0a00050" : "#1a1f2e";
        e.currentTarget.style.boxShadow = isUrgentBonding ? "0 0 12px #f0a00018" : "none";
      }}
    >

      {/* Card link area */}
      <Link
        href={`/token/${token.mintAddress}`}
        className="flex flex-col p-3 gap-2 cursor-pointer flex-1"
      >
        {/* Header: Avatar + Ticker + Name + Badges */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden" style={{ background: "#04060b" }}>
            {token.imageUri ? (
              <img src={token.imageUri} alt={token.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold font-mono" style={{ color: "#5c6380" }}>
                {token.ticker.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[12px] font-bold font-mono truncate" style={{ color: "#eef0f6" }}>
                ${token.ticker}
              </span>
              {isNew && (
                <span className="text-[7px] font-bold px-1 py-0.5 rounded animate-pulse flex-shrink-0" style={{ background: "#00d67218", color: "#00d672" }}>
                  NEW
                </span>
              )}
              {isUrgentBonding && (
                <span className="text-[7px] font-bold px-1 py-0.5 rounded animate-pulse flex-shrink-0" style={{ background: "#f0a00020", color: "#f0a000" }}>
                  GRAD
                </span>
              )}
            </div>
            <div className="text-[10px] truncate" style={{ color: "#5c6380" }}>
              {token.name}
            </div>
          </div>
        </div>

        {/* Primary metrics: MCap + Volume */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase tracking-wider" style={{ color: "#5c6380" }}>MCap</span>
            <span className="text-[13px] font-mono font-bold" style={{ color: "#eef0f6" }}>
              {formatUsdCompact(mcapUsd)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[8px] uppercase tracking-wider" style={{ color: "#5c6380" }}>Vol 1h</span>
            <span className="text-[12px] font-mono font-semibold" style={{ color: "#9ca3b8" }}>
              {formatUsdCompact(volumeUsd)}
            </span>
          </div>
        </div>

        {/* Price changes: 5m% and 1h% */}
        <div className="flex items-center gap-2">
          <div
            className="flex-1 flex items-center justify-center gap-1 rounded py-[3px]"
            style={{
              background: pct5m != null && pct5m >= 0 ? "#00d67210" : "#f2364510",
            }}
          >
            <span className="text-[8px]" style={{ color: "#5c6380" }}>5m</span>
            <span
              className="text-[11px] font-mono font-bold"
              style={{
                color: pct5m != null ? (pct5m >= 0 ? "#00d672" : "#f23645") : "#363d54",
              }}
            >
              {pct5m != null ? `${pct5m > 0 ? "+" : ""}${pct5m.toFixed(1)}%` : "\u2014"}
            </span>
          </div>
          <div
            className="flex-1 flex items-center justify-center gap-1 rounded py-[3px]"
            style={{
              background: pct1h != null && pct1h >= 0 ? "#00d67210" : "#f2364510",
            }}
          >
            <span className="text-[8px]" style={{ color: "#5c6380" }}>1h</span>
            <span
              className="text-[11px] font-mono font-bold"
              style={{
                color: pct1h != null ? (pct1h >= 0 ? "#00d672" : "#f23645") : "#363d54",
              }}
            >
              {pct1h != null ? `${pct1h > 0 ? "+" : ""}${pct1h.toFixed(1)}%` : "\u2014"}
            </span>
          </div>
        </div>

        {/* Bonding progress */}
        {token.bondingProgress != null && !token.isGraduated && (
          <div>
            <BondingBar
              progress={token.bondingProgress}
              isGraduated={token.isGraduated}
              urgent={activeTab === "graduating"}
            />
          </div>
        )}
        {token.isGraduated && (
          <div>
            <span className="font-mono text-[8px] font-bold px-1.5 py-[2px] rounded" style={{ background: "#00d67218", color: "#00d672" }}>
              GRADUATED - RAYDIUM
            </span>
          </div>
        )}

        {/* Bottom row: Holders, Risk, Heat */}
        <div className="flex items-center justify-between gap-1 mt-auto">
          <div className="flex items-center gap-2">
            {/* Holders */}
            <span className="text-[10px] font-mono" style={{ color: "#9ca3b8" }}>
              {token.holders != null ? `${formatCompact(token.holders)} H` : "\u2014"}
            </span>
            {/* Risk badge */}
            {token.riskLevel && (
              <span
                className="text-[8px] font-bold font-mono px-1.5 py-[1px] rounded"
                style={{
                  background: `${riskColor}15`,
                  color: riskColor,
                  border: `1px solid ${riskColor}25`,
                }}
              >
                {riskLabel}
              </span>
            )}
          </div>
          {/* Heat score */}
          <HeatDisplay heat={heat} />
        </div>
      </Link>

      {/* Quick action buttons */}
      <div
        className="flex items-center border-t"
        style={{ borderColor: "#1a1f2e" }}
      >
        <div className="flex-1 flex items-center justify-center gap-1 py-1.5">
          <QuickTradeButton
            token={{ mintAddress: token.mintAddress, name: token.name, ticker: token.ticker, imageUri: token.imageUri }}
            size={12}
          />
          <span className="text-[10px] font-bold" style={{ color: "#00d672" }}>Buy</span>
        </div>
        <div className="w-px h-4" style={{ background: "#1a1f2e" }} />
        <div className="flex-1 flex items-center justify-center py-1.5">
          <SnipeButton mintAddress={token.mintAddress} ticker={token.ticker} />
        </div>
        <div className="w-px h-4" style={{ background: "#1a1f2e" }} />
        <div className="flex-1 flex items-center justify-center gap-1 py-1.5">
          <WatchlistButton
            token={{ mintAddress: token.mintAddress, name: token.name, ticker: token.ticker, imageUri: token.imageUri }}
            size={12}
          />
          <span className="text-[10px] font-bold" style={{ color: "#5c6380" }}>Watch</span>
        </div>
        <div className="w-px h-4" style={{ background: "#1a1f2e" }} />
        <Link
          href={`/token/${token.mintAddress}?compare=true`}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold transition-colors"
          style={{ color: "#5c6380" }}
          onClick={(e) => e.stopPropagation()}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          Compare
        </Link>
      </div>
    </div>
  );
}

// ---- Skeleton ----

function SkeletonRow() {
  return (
    <div className="flex items-center gap-2 px-2 py-[6px] animate-pulse" style={{ borderBottom: "1px solid #1a1f2e08" }}>
      <div className="w-6 h-6 rounded-full" style={{ background: "#10131c" }} />
      <div className="flex-1 flex items-center gap-3">
        <div className="h-3 w-16 rounded" style={{ background: "#10131c" }} />
        <div className="h-3 w-10 rounded" style={{ background: "#10131c" }} />
        <div className="h-3 w-12 rounded" style={{ background: "#10131c" }} />
        <div className="h-3 w-8 rounded" style={{ background: "#10131c" }} />
        <div className="h-3 w-14 rounded" style={{ background: "#10131c" }} />
        <div className="h-3 w-10 rounded" style={{ background: "#10131c" }} />
        <div className="h-3 w-16 rounded" style={{ background: "#10131c" }} />
      </div>
    </div>
  );
}
