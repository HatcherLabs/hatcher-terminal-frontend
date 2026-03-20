"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useWatchlist,
  WatchlistItem,
} from "@/components/providers/WatchlistProvider";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { api } from "@/lib/api";

// ---- helpers ----

function formatUsd(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(0)}`;
}

function formatPrice(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toExponential(1)}`;
}

function formatPct(n: number | null | undefined): string {
  if (n == null) return "-";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function formatVolume(n: number | null | undefined): string {
  if (n == null) return "-";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function formatHolders(n: number | null | undefined): string {
  if (n == null) return "-";
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function formatBonding(n: number | null | undefined): string {
  if (n == null) return "-";
  return `${n.toFixed(0)}%`;
}

// ---- types ----

interface LivePrice {
  priceSol?: number;
  priceUsd?: number;
  marketCapUsd?: number;
  priceChange5m?: number;
  priceChange1h?: number;
  volume1h?: number;
  holders?: number;
  bondingProgress?: number;
  riskLevel?: "LOW" | "MED" | "HIGH" | "EXTREME" | null;
}

type SortKey =
  | "name"
  | "price"
  | "mcap"
  | "change5m"
  | "change1h"
  | "volume"
  | "holders"
  | "bonding"
  | "risk"
  | "added";
type SortDir = "asc" | "desc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "price", label: "Price" },
  { key: "mcap", label: "MCap" },
  { key: "change5m", label: "5m %" },
  { key: "change1h", label: "1h %" },
  { key: "volume", label: "Volume" },
  { key: "holders", label: "Holders" },
  { key: "bonding", label: "Bonding" },
  { key: "risk", label: "Risk" },
  { key: "added", label: "Added" },
];

const RISK_ORDER: Record<string, number> = {
  LOW: 0,
  MED: 1,
  HIGH: 2,
  EXTREME: 3,
};

const RISK_COLORS: Record<string, string> = {
  LOW: "#00d672",
  MED: "#f0a000",
  HIGH: "#f23645",
  EXTREME: "#f23645",
};

// ---- alert storage ----

const ALERTS_KEY = "hatcher_price_alerts";

function loadAlerts(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// ---- sort logic ----

function getSortValue(
  item: WatchlistItem,
  live: LivePrice | undefined,
  key: SortKey
): number | string {
  switch (key) {
    case "name":
      return item.ticker.toLowerCase();
    case "price":
      return live?.priceUsd ?? -Infinity;
    case "mcap":
      return live?.marketCapUsd ?? -Infinity;
    case "change5m":
      return live?.priceChange5m ?? -Infinity;
    case "change1h":
      return live?.priceChange1h ?? -Infinity;
    case "volume":
      return live?.volume1h ?? -Infinity;
    case "holders":
      return live?.holders ?? -Infinity;
    case "bonding":
      return live?.bondingProgress ?? -Infinity;
    case "risk":
      return RISK_ORDER[live?.riskLevel ?? ""] ?? 99;
    case "added":
      return new Date(item.addedAt).getTime();
    default:
      return 0;
  }
}

// ---- icons ----

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={12}
      height={12}
      fill="currentColor"
      className={className}
    >
      <path d="M8 5.5l4 5H4l4-5z" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={12}
      height={12}
      fill="currentColor"
      className={className}
    >
      <path d="M8 10.5l-4-5h8l-4 5z" />
    </svg>
  );
}

// ---- component ----

export default function WatchlistPage() {
  const router = useRouter();
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const [livePrices, setLivePrices] = useState<Record<string, LivePrice>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("added");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [alerts, setAlerts] = useState<Record<string, number>>({});
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load alerts
  useEffect(() => {
    setAlerts(loadAlerts());
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowSortDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchLivePrices = useCallback(async (items: WatchlistItem[]) => {
    if (items.length === 0) return;
    setLoadingPrices(true);
    const prices: Record<string, LivePrice> = {};

    await Promise.allSettled(
      items.map(async (item) => {
        try {
          const res = await api.raw(`/api/tokens/${item.mintAddress}/live`);
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.data) {
              prices[item.mintAddress] = json.data;
            }
          }
        } catch {
          // Silently ignore individual fetch failures
        }
      })
    );

    setLivePrices(prices);
    setLoadingPrices(false);
  }, []);

  // Fetch prices on mount and every 15s
  useEffect(() => {
    fetchLivePrices(watchlist);

    intervalRef.current = setInterval(() => {
      fetchLivePrices(watchlist);
    }, 15_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [watchlist, fetchLivePrices]);

  // Clear selection when items are removed
  useEffect(() => {
    setSelected((prev) => {
      const mints = new Set(watchlist.map((w) => w.mintAddress));
      const next = new Set([...prev].filter((m) => mints.has(m)));
      return next.size === prev.size ? prev : next;
    });
  }, [watchlist]);

  // Sorted watchlist
  const sortedWatchlist = useMemo(() => {
    const items = [...watchlist];
    items.sort((a, b) => {
      const aVal = getSortValue(a, livePrices[a.mintAddress], sortKey);
      const bVal = getSortValue(b, livePrices[b.mintAddress], sortKey);
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      const diff = (aVal as number) - (bVal as number);
      return sortDir === "asc" ? diff : -diff;
    });
    return items;
  }, [watchlist, livePrices, sortKey, sortDir]);

  // Selection handlers
  const toggleSelect = (mint: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(mint)) next.delete(mint);
      else next.add(mint);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === watchlist.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(watchlist.map((w) => w.mintAddress)));
    }
  };

  const removeSelected = () => {
    selected.forEach((mint) => removeFromWatchlist(mint));
    setSelected(new Set());
  };

  // Column sort handler
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  // Pct color helper
  const pctColor = (n: number | null | undefined): string => {
    if (n == null || n === 0) return "#5c6380";
    return n > 0 ? "#00d672" : "#f23645";
  };

  // Risk badge
  const RiskBadge = ({ level }: { level?: string | null }) => {
    if (!level) return <span style={{ color: "#5c6380" }}>-</span>;
    return (
      <span
        className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded"
        style={{
          color: RISK_COLORS[level] ?? "#5c6380",
          backgroundColor: `${RISK_COLORS[level] ?? "#5c6380"}18`,
        }}
      >
        {level}
      </span>
    );
  };

  // Sort indicator for table headers
  const SortIndicator = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return null;
    return sortDir === "asc" ? (
      <ChevronUpIcon className="inline ml-0.5" />
    ) : (
      <ChevronDownIcon className="inline ml-0.5" />
    );
  };

  // Table header cell
  const Th = ({
    columnKey,
    children,
    align = "right",
  }: {
    columnKey: SortKey;
    children: React.ReactNode;
    align?: "left" | "right";
  }) => (
    <th
      className={`px-2 py-2 text-[10px] font-medium uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors hover:text-[#9ca3b8] ${
        align === "left" ? "text-left" : "text-right"
      }`}
      style={{ color: sortKey === columnKey ? "#9ca3b8" : "#5c6380" }}
      onClick={() => handleSort(columnKey)}
    >
      {children}
      <SortIndicator columnKey={columnKey} />
    </th>
  );

  // ---- render ----

  if (watchlist.length === 0) {
    return (
      <ErrorBoundary fallbackTitle="Watchlist error">
      <div className="flex flex-col pt-2">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 px-1">
          <h1
            className="text-sm font-bold tracking-[0.15em] uppercase font-mono"
            style={{ color: "#eef0f6" }}
          >
            WATCHLIST
          </h1>
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ color: "#5c6380", backgroundColor: "#10131c" }}
          >
            0
          </span>
        </div>

        {/* Empty state */}
        <div
          className="flex flex-col items-center justify-center py-20 text-center rounded-lg"
          style={{
            backgroundColor: "#0a0d14",
            border: "1px solid #1a1f2e",
          }}
        >
          <div className="mb-4" style={{ color: "#363d54" }}>
            <svg
              viewBox="0 0 24 24"
              width={48}
              height={48}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <h3
            className="text-sm font-semibold mb-2"
            style={{ color: "#eef0f6" }}
          >
            Your watchlist is empty
          </h3>
          <p
            className="text-xs max-w-[300px] leading-relaxed mb-6"
            style={{ color: "#5c6380" }}
          >
            Track tokens you&apos;re interested in. Swipe up on tokens in
            Discover or tap the star icon on any token to add it here.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/swipe")}
              className="px-4 py-2 text-xs font-medium rounded-lg transition-all hover:brightness-110"
              style={{ backgroundColor: "#8b5cf6", color: "#eef0f6" }}
            >
              Discover Tokens
            </button>
            <button
              onClick={() => router.push("/explore")}
              className="px-4 py-2 text-xs font-medium rounded-lg transition-all hover:brightness-110"
              style={{
                backgroundColor: "#10131c",
                color: "#9ca3b8",
                border: "1px solid #1a1f2e",
              }}
            >
              Explore
            </button>
          </div>
        </div>
      </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fallbackTitle="Watchlist error">
    <div className="flex flex-col pt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-3">
          <h1
            className="text-sm font-bold tracking-[0.15em] uppercase font-mono"
            style={{ color: "#eef0f6" }}
          >
            WATCHLIST
          </h1>
          <span
            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
            style={{ color: "#00d672", backgroundColor: "#00d67218" }}
          >
            {watchlist.length}
          </span>
          {loadingPrices && (
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: "#00d672" }}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Batch remove */}
          {selected.size > 0 && (
            <button
              onClick={removeSelected}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all"
              style={{
                color: "#f23645",
                backgroundColor: "#f2364518",
                border: "1px solid #f2364530",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width={12}
                height={12}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Remove {selected.size}
            </button>
          )}

          {/* Sort dropdown (mobile) */}
          <div className="relative terminal:hidden" ref={dropdownRef}>
            <button
              onClick={() => setShowSortDropdown((s) => !s)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-md transition-all"
              style={{
                color: "#9ca3b8",
                backgroundColor: "#10131c",
                border: "1px solid #1a1f2e",
              }}
            >
              Sort:{" "}
              {SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? "Added"}
              <ChevronDownIcon />
            </button>
            {showSortDropdown && (
              <div
                className="absolute right-0 top-full mt-1 py-1 rounded-lg z-50 min-w-[140px]"
                style={{
                  backgroundColor: "#10131c",
                  border: "1px solid #1a1f2e",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      handleSort(opt.key);
                      setShowSortDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-[11px] transition-colors"
                    style={{
                      color:
                        sortKey === opt.key ? "#eef0f6" : "#9ca3b8",
                      backgroundColor:
                        sortKey === opt.key ? "#181c28" : "transparent",
                    }}
                  >
                    {opt.label}
                    {sortKey === opt.key && (
                      <span className="ml-1 text-[10px]" style={{ color: "#5c6380" }}>
                        {sortDir === "asc" ? "\u2191" : "\u2193"}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Desktop Table ===== */}
      <div
        className="hidden terminal:block rounded-lg overflow-hidden"
        style={{
          backgroundColor: "#0a0d14",
          border: "1px solid #1a1f2e",
        }}
      >
        <div className="overflow-x-auto terminal-scrollbar-x">
          <table className="w-full border-collapse" style={{ minWidth: 900 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1a1f2e" }}>
                {/* Checkbox */}
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={
                      selected.size === watchlist.length &&
                      watchlist.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="accent-[#8b5cf6] w-3 h-3 cursor-pointer"
                  />
                </th>
                <Th columnKey="name" align="left">
                  Token
                </Th>
                <Th columnKey="price">Price</Th>
                <Th columnKey="mcap">MCap</Th>
                <Th columnKey="change5m">5m %</Th>
                <Th columnKey="change1h">1h %</Th>
                <Th columnKey="volume">Volume</Th>
                <Th columnKey="holders">Holders</Th>
                <Th columnKey="bonding">Bonding</Th>
                <Th columnKey="risk">Risk</Th>
                <th className="w-12 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {sortedWatchlist.map((item, idx) => {
                const live = livePrices[item.mintAddress];
                const isSelected = selected.has(item.mintAddress);
                const hasAlert = alerts[item.mintAddress] != null;

                return (
                  <tr
                    key={item.mintAddress}
                    className="group cursor-pointer transition-colors"
                    style={{
                      backgroundColor: isSelected ? "#181c2840" : "transparent",
                      borderBottom:
                        idx < sortedWatchlist.length - 1
                          ? "1px solid #1a1f2e20"
                          : undefined,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = isSelected
                        ? "#181c2860"
                        : "#181c28")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = isSelected
                        ? "#181c2840"
                        : "transparent")
                    }
                    onClick={() => router.push(`/token/${item.mintAddress}`)}
                  >
                    {/* Checkbox */}
                    <td className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelect(item.mintAddress);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="accent-[#8b5cf6] w-3 h-3 cursor-pointer"
                      />
                    </td>

                    {/* Token */}
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden"
                          style={{ backgroundColor: "#10131c" }}
                        >
                          {item.imageUri ? (
                            <img
                              src={item.imageUri}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center text-[10px] font-bold"
                              style={{ color: "#5c6380" }}
                            >
                              {item.ticker.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-xs font-semibold truncate"
                              style={{ color: "#eef0f6" }}
                            >
                              ${item.ticker}
                            </span>
                            {hasAlert && (
                              <svg
                                viewBox="0 0 24 24"
                                width={10}
                                height={10}
                                fill="#f0a000"
                              >
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                              </svg>
                            )}
                          </div>
                          <span
                            className="text-[10px] truncate block max-w-[120px]"
                            style={{ color: "#5c6380" }}
                          >
                            {item.name}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td
                      className="px-2 py-2 text-right text-xs font-mono"
                      style={{ color: "#eef0f6" }}
                    >
                      {live?.priceUsd != null ? formatPrice(live.priceUsd) : "-"}
                    </td>

                    {/* MCap */}
                    <td
                      className="px-2 py-2 text-right text-xs font-mono"
                      style={{ color: "#9ca3b8" }}
                    >
                      {live?.marketCapUsd != null
                        ? formatUsd(live.marketCapUsd)
                        : "-"}
                    </td>

                    {/* 5m % */}
                    <td
                      className="px-2 py-2 text-right text-xs font-mono"
                      style={{ color: pctColor(live?.priceChange5m) }}
                    >
                      {formatPct(live?.priceChange5m)}
                    </td>

                    {/* 1h % */}
                    <td
                      className="px-2 py-2 text-right text-xs font-mono"
                      style={{ color: pctColor(live?.priceChange1h) }}
                    >
                      {formatPct(live?.priceChange1h)}
                    </td>

                    {/* Volume */}
                    <td
                      className="px-2 py-2 text-right text-xs font-mono"
                      style={{ color: "#9ca3b8" }}
                    >
                      {formatVolume(live?.volume1h)}
                    </td>

                    {/* Holders */}
                    <td
                      className="px-2 py-2 text-right text-xs font-mono"
                      style={{ color: "#9ca3b8" }}
                    >
                      {formatHolders(live?.holders)}
                    </td>

                    {/* Bonding */}
                    <td className="px-2 py-2 text-right">
                      {live?.bondingProgress != null ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <div
                            className="w-12 h-1 rounded-full overflow-hidden"
                            style={{ backgroundColor: "#1a1f2e" }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(live.bondingProgress, 100)}%`,
                                backgroundColor:
                                  live.bondingProgress >= 100
                                    ? "#00d672"
                                    : "#f0a000",
                              }}
                            />
                          </div>
                          <span
                            className="text-[10px] font-mono"
                            style={{
                              color:
                                live.bondingProgress >= 100
                                  ? "#00d672"
                                  : "#9ca3b8",
                            }}
                          >
                            {formatBonding(live.bondingProgress)}
                          </span>
                        </div>
                      ) : (
                        <span
                          className="text-xs font-mono"
                          style={{ color: "#5c6380" }}
                        >
                          -
                        </span>
                      )}
                    </td>

                    {/* Risk */}
                    <td className="px-2 py-2 text-right">
                      <RiskBadge level={live?.riskLevel} />
                    </td>

                    {/* Actions */}
                    <td className="w-12 px-2 py-2 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromWatchlist(item.mintAddress);
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-full transition-all opacity-0 group-hover:opacity-100"
                        style={{ color: "#5c6380" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "#f23645";
                          e.currentTarget.style.backgroundColor = "#f2364518";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "#5c6380";
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                        aria-label={`Remove ${item.name} from watchlist`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width={12}
                          height={12}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Mobile Card Layout ===== */}
      <div className="flex flex-col gap-[1px] terminal:hidden">
        {/* Select all bar */}
        <div
          className="flex items-center justify-between px-3 py-2 mb-1 rounded-lg"
          style={{
            backgroundColor: "#0a0d14",
            border: "1px solid #1a1f2e",
          }}
        >
          <label className="flex items-center gap-2 text-[11px]" style={{ color: "#5c6380" }}>
            <input
              type="checkbox"
              checked={
                selected.size === watchlist.length && watchlist.length > 0
              }
              onChange={toggleSelectAll}
              className="accent-[#8b5cf6] w-3 h-3 cursor-pointer"
            />
            Select all
          </label>
          {selected.size > 0 && (
            <button
              onClick={removeSelected}
              className="text-[11px] font-medium"
              style={{ color: "#f23645" }}
            >
              Remove {selected.size}
            </button>
          )}
        </div>

        {sortedWatchlist.map((item) => {
          const live = livePrices[item.mintAddress];
          const isSelected = selected.has(item.mintAddress);
          const hasAlert = alerts[item.mintAddress] != null;

          return (
            <div
              key={item.mintAddress}
              className="rounded-lg overflow-hidden transition-all"
              style={{
                backgroundColor: isSelected ? "#181c2840" : "#0a0d14",
                border: `1px solid ${isSelected ? "#2a3048" : "#1a1f2e"}`,
              }}
            >
              <div className="flex items-start gap-3 px-3 py-2.5">
                {/* Checkbox */}
                <div className="flex-shrink-0 pt-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(item.mintAddress)}
                    className="accent-[#8b5cf6] w-3 h-3 cursor-pointer"
                  />
                </div>

                {/* Main content - clickable */}
                <Link
                  href={`/token/${item.mintAddress}`}
                  className="flex-1 min-w-0"
                >
                  {/* Top row: avatar + ticker + price */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden"
                        style={{ backgroundColor: "#10131c" }}
                      >
                        {item.imageUri ? (
                          <img
                            src={item.imageUri}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-[10px] font-bold"
                            style={{ color: "#5c6380" }}
                          >
                            {item.ticker.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span
                            className="text-xs font-semibold"
                            style={{ color: "#eef0f6" }}
                          >
                            ${item.ticker}
                          </span>
                          {hasAlert && (
                            <svg
                              viewBox="0 0 24 24"
                              width={10}
                              height={10}
                              fill="#f0a000"
                            >
                              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                          )}
                        </div>
                        <span
                          className="text-[10px] truncate block max-w-[100px]"
                          style={{ color: "#5c6380" }}
                        >
                          {item.name}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className="text-xs font-mono font-semibold"
                        style={{ color: "#eef0f6" }}
                      >
                        {live?.priceUsd != null
                          ? formatPrice(live.priceUsd)
                          : "-"}
                      </div>
                      {live?.marketCapUsd != null && (
                        <div
                          className="text-[10px] font-mono"
                          style={{ color: "#5c6380" }}
                        >
                          {formatUsd(live.marketCapUsd)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom row: stats grid */}
                  <div
                    className="grid grid-cols-4 gap-2 pt-1.5"
                    style={{ borderTop: "1px solid #1a1f2e20" }}
                  >
                    <div>
                      <div
                        className="text-[9px] uppercase"
                        style={{ color: "#363d54" }}
                      >
                        5m
                      </div>
                      <div
                        className="text-[11px] font-mono"
                        style={{ color: pctColor(live?.priceChange5m) }}
                      >
                        {formatPct(live?.priceChange5m)}
                      </div>
                    </div>
                    <div>
                      <div
                        className="text-[9px] uppercase"
                        style={{ color: "#363d54" }}
                      >
                        1h
                      </div>
                      <div
                        className="text-[11px] font-mono"
                        style={{ color: pctColor(live?.priceChange1h) }}
                      >
                        {formatPct(live?.priceChange1h)}
                      </div>
                    </div>
                    <div>
                      <div
                        className="text-[9px] uppercase"
                        style={{ color: "#363d54" }}
                      >
                        Vol
                      </div>
                      <div
                        className="text-[11px] font-mono"
                        style={{ color: "#9ca3b8" }}
                      >
                        {formatVolume(live?.volume1h)}
                      </div>
                    </div>
                    <div>
                      <div
                        className="text-[9px] uppercase"
                        style={{ color: "#363d54" }}
                      >
                        Risk
                      </div>
                      <div className="text-[11px]">
                        <RiskBadge level={live?.riskLevel} />
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Remove button */}
                <button
                  onClick={() => removeFromWatchlist(item.mintAddress)}
                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full mt-0.5 transition-colors"
                  style={{ color: "#363d54" }}
                  aria-label={`Remove ${item.name} from watchlist`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width={12}
                    height={12}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </ErrorBoundary>
  );
}
