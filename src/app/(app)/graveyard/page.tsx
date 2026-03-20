"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { api } from "@/lib/api";

/* ── types ─────────────────────────────────────────────── */

interface GraveyardToken {
  id: string;
  swipedAt: string;
  token: {
    mintAddress: string;
    name: string;
    ticker: string;
    imageUri: string | null;
    riskLevel: "LOW" | "MED" | "HIGH" | "EXTREME" | null;
    isGraduated: boolean;
    isActive: boolean;
    marketCapSol: number | null;
  };
  priceChangePct: number | null;
}

interface GraveyardStats {
  totalSkipped: number;
  graduated: number;
  biggestMiss: { ticker: string; marketCapSol: number } | null;
  avgMissedGain: number;
}

type SortOption = "missedGains" | "recent" | "graduated";
type OutcomeFilter = "all" | "pump" | "rug" | "graduated";

/* ── palette (hardcoded hex) ───────────────────────────── */

const C = {
  bgPrimary: "#04060b",
  bgCard: "#0a0d14",
  bgElevated: "#10131c",
  bgHover: "#181c28",
  border: "#1a1f2e",
  borderHover: "#2a3048",
  green: "#00d672",
  greenBg: "#00d67218",
  red: "#f23645",
  redBg: "#f2364518",
  amber: "#f0a000",
  amberBg: "#f0a00018",
  blue: "#3b82f6",
  blueBg: "#3b82f618",
  accent: "#8b5cf6",
  accentBg: "#8b5cf618",
  textPrimary: "#eef0f6",
  textSecondary: "#9ca3b8",
  textMuted: "#5c6380",
} as const;

/* ── helpers ───────────────────────────────────────────── */

function formatTimeSince(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function formatMcap(val: number | null): string {
  if (val === null || val <= 0) return "--";
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return val.toFixed(0);
}

function formatPct(pct: number | null): string {
  if (pct === null) return "--";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}%`;
}

/* ── biggest miss highlight card ──────────────────────── */

function BiggestMissCard({
  biggestMiss,
}: {
  biggestMiss: { ticker: string; marketCapSol: number } | null;
}) {
  if (!biggestMiss) return null;

  return (
    <div
      className="rounded-xl p-4 mb-4 flex items-center gap-3"
      style={{
        backgroundColor: C.redBg,
        border: `1px solid ${C.red}30`,
      }}
    >
      <div
        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg"
        style={{ backgroundColor: `${C.red}20` }}
      >
        <span role="img" aria-label="skull">💀</span>
      </div>
      <div className="min-w-0 flex-1">
        <span
          className="text-[10px] font-mono uppercase tracking-wider block"
          style={{ color: C.red }}
        >
          Biggest Miss
        </span>
        <span
          className="text-sm font-mono font-bold block truncate"
          style={{ color: C.textPrimary }}
        >
          ${biggestMiss.ticker}
        </span>
      </div>
      <div className="text-right">
        <span
          className="text-[10px] font-mono uppercase tracking-wider block"
          style={{ color: C.textMuted }}
        >
          MCap Now
        </span>
        <span
          className="text-sm font-mono font-bold"
          style={{ color: C.red }}
        >
          {formatMcap(biggestMiss.marketCapSol)} SOL
        </span>
      </div>
    </div>
  );
}

/* ── filter tabs ───────────────────────────────────────── */

const FILTER_OPTIONS: { value: OutcomeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pump", label: "Missed" },
  { value: "rug", label: "Dodged" },
  { value: "graduated", label: "Graduated" },
];

function FilterTabs({
  active,
  onChange,
  counts,
}: {
  active: OutcomeFilter;
  onChange: (v: OutcomeFilter) => void;
  counts: Record<OutcomeFilter, number>;
}) {
  return (
    <div
      className="flex gap-1 p-1 rounded-lg mb-4 overflow-x-auto"
      style={{ backgroundColor: C.bgCard, border: `1px solid ${C.border}` }}
    >
      {FILTER_OPTIONS.map((opt) => {
        const isActive = active === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="flex-1 min-w-0 text-xs font-mono font-semibold px-3 py-1.5 rounded-md transition-all whitespace-nowrap"
            style={{
              backgroundColor: isActive ? C.bgElevated : "transparent",
              color: isActive ? C.textPrimary : C.textMuted,
              border: isActive ? `1px solid ${C.borderHover}` : "1px solid transparent",
            }}
          >
            {opt.label}
            <span
              className="ml-1 text-[10px]"
              style={{ color: isActive ? C.textSecondary : C.textMuted }}
            >
              {counts[opt.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── sort selector ─────────────────────────────────────── */

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "missedGains", label: "Missed Gains" },
  { value: "graduated", label: "Graduated" },
];

function SortSelector({
  active,
  onChange,
}: {
  active: SortOption;
  onChange: (v: SortOption) => void;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span
        className="text-[10px] font-mono uppercase tracking-wider"
        style={{ color: C.textMuted }}
      >
        Sort:
      </span>
      {SORT_OPTIONS.map((opt) => {
        const isActive = active === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="text-[11px] font-mono px-2 py-1 rounded-md transition-all"
            style={{
              backgroundColor: isActive ? C.bgElevated : "transparent",
              color: isActive ? C.textPrimary : C.textMuted,
              border: isActive ? `1px solid ${C.borderHover}` : "1px solid transparent",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── summary stats bar ─────────────────────────────────── */

function SummaryStats({ stats }: { stats: GraveyardStats }) {
  const cells = [
    { label: "Total Skipped", value: String(stats.totalSkipped), color: C.textPrimary },
    { label: "Graduated", value: String(stats.graduated), color: C.green },
    {
      label: "Biggest Miss",
      value: stats.biggestMiss ? `$${stats.biggestMiss.ticker}` : "--",
      color: C.red,
    },
    {
      label: "Avg Missed Gain",
      value: formatPct(stats.avgMissedGain),
      color:
        stats.avgMissedGain > 0
          ? C.red
          : stats.avgMissedGain < 0
            ? C.green
            : C.textMuted,
    },
  ];

  return (
    <div
      className="grid grid-cols-4 gap-px rounded-xl overflow-hidden mb-4"
      style={{ backgroundColor: C.border }}
    >
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="flex flex-col items-center justify-center py-3 px-1"
          style={{ backgroundColor: C.bgCard }}
        >
          <span
            className="text-lg font-mono font-bold leading-none"
            style={{ color: cell.color }}
          >
            {cell.value}
          </span>
          <span
            className="text-[9px] uppercase tracking-wider mt-1 text-center leading-tight"
            style={{ color: C.textMuted }}
          >
            {cell.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── stats skeleton ────────────────────────────────────── */

function StatsSkeleton() {
  return (
    <div
      className="grid grid-cols-4 gap-px rounded-xl overflow-hidden mb-4"
      style={{ backgroundColor: C.border }}
    >
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex flex-col items-center justify-center py-3 px-1"
          style={{ backgroundColor: C.bgCard }}
        >
          <Skeleton className="h-6 w-12 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

/* ── table header ──────────────────────────────────────── */

function TableHeader() {
  return (
    <div
      className="grid items-center px-3 py-2 text-[10px] font-mono uppercase tracking-wider rounded-t-lg"
      style={{
        gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
        backgroundColor: C.bgCard,
        borderBottom: `1px solid ${C.border}`,
        color: C.textMuted,
      }}
    >
      <span>Token</span>
      <span className="text-right">Passed</span>
      <span className="text-right">Change%</span>
      <span className="text-center">Status</span>
      <span className="text-right">MCap Now</span>
    </div>
  );
}

/* ── table row ─────────────────────────────────────────── */

function TableRow({ item }: { item: GraveyardToken }) {
  const pct = item.priceChangePct;
  const isUp = pct !== null && pct > 0;
  const isGraduated = item.token.isGraduated;
  const isDead = !item.token.isActive;

  return (
    <Link
      href={`/token/${item.token.mintAddress}`}
      className="grid items-center px-3 py-2.5 transition-colors duration-150"
      style={{
        gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
        borderBottom: `1px solid ${C.border}`,
        backgroundColor: C.bgPrimary,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = C.bgHover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = C.bgPrimary;
      }}
    >
      {/* Token */}
      <div className="flex items-center gap-2 min-w-0">
        <TokenAvatar
          mintAddress={item.token.mintAddress}
          imageUri={item.token.imageUri}
          size={28}
          ticker={item.token.ticker}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs font-semibold truncate"
              style={{ color: C.textPrimary }}
            >
              ${item.token.ticker}
            </span>
            <RiskBadge level={item.token.riskLevel} />
            {isGraduated && (
              <span
                className="text-[8px] font-mono font-bold px-1.5 py-0 rounded-sm"
                style={{ color: C.green, backgroundColor: C.greenBg }}
              >
                RAY
              </span>
            )}
          </div>
          <span
            className="text-[10px] truncate block"
            style={{ color: C.textMuted }}
          >
            {item.token.name}
          </span>
        </div>
      </div>

      {/* Passed At */}
      <span
        className="text-[11px] font-mono text-right"
        style={{ color: C.textSecondary }}
      >
        {formatTimeSince(item.swipedAt)}
      </span>

      {/* Change % */}
      <span
        className="text-[11px] font-mono font-semibold text-right"
        style={{ color: pct === null ? C.textMuted : isUp ? C.green : C.red }}
      >
        {formatPct(pct)}
      </span>

      {/* Status badge */}
      <div className="flex justify-center">
        {isDead ? (
          <span
            className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ color: C.textMuted, backgroundColor: `${C.textMuted}18` }}
          >
            DEAD
          </span>
        ) : isUp ? (
          <span
            className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ color: C.red, backgroundColor: C.redBg }}
          >
            MISSED
          </span>
        ) : (
          <span
            className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ color: C.green, backgroundColor: C.greenBg }}
          >
            DODGED
          </span>
        )}
      </div>

      {/* MCap Now */}
      <span
        className="text-[11px] font-mono text-right"
        style={{
          color:
            item.token.marketCapSol && item.token.marketCapSol > 0
              ? C.textPrimary
              : C.textMuted,
        }}
      >
        {item.token.marketCapSol && item.token.marketCapSol > 0
          ? `${formatMcap(item.token.marketCapSol)} SOL`
          : item.token.isActive
            ? "--"
            : "DEAD"}
      </span>
    </Link>
  );
}

/* ── mobile card (< md) ────────────────────────────────── */

function MobileCard({ item }: { item: GraveyardToken }) {
  const pct = item.priceChangePct;
  const isUp = pct !== null && pct > 0;
  const isDead = !item.token.isActive;

  return (
    <Link
      href={`/token/${item.token.mintAddress}`}
      className="block rounded-lg p-3 transition-colors duration-150"
      style={{
        backgroundColor: C.bgCard,
        border: `1px solid ${C.border}`,
      }}
    >
      {/* Top row: avatar + name + status */}
      <div className="flex items-center gap-2.5 mb-2">
        <TokenAvatar
          mintAddress={item.token.mintAddress}
          imageUri={item.token.imageUri}
          size={32}
          ticker={item.token.ticker}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs font-semibold truncate"
              style={{ color: C.textPrimary }}
            >
              ${item.token.ticker}
            </span>
            <RiskBadge level={item.token.riskLevel} />
            {item.token.isGraduated && (
              <span
                className="text-[8px] font-mono font-bold px-1.5 rounded-sm"
                style={{ color: C.green, backgroundColor: C.greenBg }}
              >
                RAY
              </span>
            )}
          </div>
          <span className="text-[10px] truncate block" style={{ color: C.textMuted }}>
            {item.token.name}
          </span>
        </div>
        {isDead ? (
          <span
            className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ color: C.textMuted, backgroundColor: `${C.textMuted}18` }}
          >
            DEAD
          </span>
        ) : isUp ? (
          <span
            className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ color: C.red, backgroundColor: C.redBg }}
          >
            MISSED
          </span>
        ) : (
          <span
            className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ color: C.green, backgroundColor: C.greenBg }}
          >
            DODGED
          </span>
        )}
      </div>

      {/* Data grid */}
      <div
        className="grid grid-cols-3 gap-2 text-[10px] font-mono pt-2"
        style={{ borderTop: `1px solid ${C.border}` }}
      >
        <div>
          <span className="block" style={{ color: C.textMuted }}>Passed</span>
          <span style={{ color: C.textSecondary }}>{formatTimeSince(item.swipedAt)}</span>
        </div>
        <div>
          <span className="block" style={{ color: C.textMuted }}>MCap</span>
          <span style={{ color: C.textSecondary }}>
            {formatMcap(item.token.marketCapSol)}
          </span>
        </div>
        <div className="text-right">
          <span className="block" style={{ color: C.textMuted }}>Change</span>
          <span
            className="font-semibold"
            style={{ color: pct === null ? C.textMuted : isUp ? C.green : C.red }}
          >
            {formatPct(pct)}
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ── row skeleton ──────────────────────────────────────── */

function RowSkeleton() {
  return (
    <div className="space-y-0">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-2.5"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-3 w-24 mb-1" />
            <Skeleton className="h-2 w-16" />
          </div>
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

/* ── error inline display ──────────────────────────────── */

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="rounded-xl p-6 text-center"
      style={{
        backgroundColor: C.bgCard,
        border: `1px solid ${C.red}30`,
      }}
    >
      <span
        className="text-sm font-mono block mb-2"
        style={{ color: C.red }}
      >
        {message}
      </span>
      <button
        onClick={onRetry}
        className="text-xs font-mono px-4 py-1.5 rounded-lg transition-colors"
        style={{
          color: C.textPrimary,
          backgroundColor: C.bgElevated,
          border: `1px solid ${C.border}`,
        }}
      >
        Retry
      </button>
    </div>
  );
}

/* ── main page ─────────────────────────────────────────── */

export default function GraveyardPage() {
  const router = useRouter();
  const [items, setItems] = useState<GraveyardToken[]>([]);
  const [stats, setStats] = useState<GraveyardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OutcomeFilter>("all");
  const [sort, setSort] = useState<SortOption>("recent");

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: GraveyardStats }>(
        "/api/swipe/graveyard/stats"
      );
      if (res.success) {
        setStats(res.data);
      }
    } catch {
      // Stats are non-critical, fail silently
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchGraveyard = useCallback(
    async (sortParam: SortOption) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<{ success: boolean; data: GraveyardToken[] }>(
          `/api/swipe/graveyard?sort=${sortParam}&limit=20`
        );
        if (res.success) {
          setItems(res.data);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load graveyard";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchStats();
    fetchGraveyard(sort);
  }, [fetchStats, fetchGraveyard, sort]);

  const handleSortChange = useCallback(
    (newSort: SortOption) => {
      setSort(newSort);
    },
    []
  );

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "graduated") return items.filter((t) => t.token.isGraduated);
    if (filter === "pump")
      return items.filter((t) => t.priceChangePct !== null && t.priceChangePct > 0);
    if (filter === "rug")
      return items.filter(
        (t) => !t.token.isActive || (t.priceChangePct !== null && t.priceChangePct < 0)
      );
    return items;
  }, [items, filter]);

  const counts = useMemo<Record<OutcomeFilter, number>>(() => {
    const c: Record<OutcomeFilter, number> = { all: items.length, pump: 0, rug: 0, graduated: 0 };
    for (const t of items) {
      if (t.token.isGraduated) c.graduated++;
      if (t.priceChangePct !== null && t.priceChangePct > 0) c.pump++;
      if (!t.token.isActive || (t.priceChangePct !== null && t.priceChangePct < 0))
        c.rug++;
    }
    return c;
  }, [items]);

  const handleRetry = useCallback(() => {
    fetchStats();
    fetchGraveyard(sort);
  }, [fetchStats, fetchGraveyard, sort]);

  /* ── loading state ── */
  if (loading && items.length === 0) {
    return (
      <ErrorBoundary fallbackTitle="Graveyard error">
        <div className="max-w-5xl mx-auto">
          <h1
            className="text-lg font-bold mb-4 font-mono"
            style={{ color: C.textPrimary }}
          >
            &gt; graveyard
          </h1>
          <StatsSkeleton />
          <Skeleton className="h-10 rounded-lg mb-4" />
          <Skeleton className="h-8 rounded-lg mb-4" />
          <div
            className="hidden md:block rounded-xl overflow-hidden"
            style={{ border: `1px solid ${C.border}` }}
          >
            <RowSkeleton />
          </div>
          <div className="md:hidden space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  /* ── error state ── */
  if (error && items.length === 0) {
    return (
      <ErrorBoundary fallbackTitle="Graveyard error">
        <div className="max-w-5xl mx-auto">
          <h1
            className="text-lg font-bold mb-4 font-mono"
            style={{ color: C.textPrimary }}
          >
            &gt; graveyard
          </h1>
          <InlineError message={error} onRetry={handleRetry} />
        </div>
      </ErrorBoundary>
    );
  }

  /* ── empty state ── */
  if (!loading && items.length === 0) {
    return (
      <ErrorBoundary fallbackTitle="Graveyard error">
        <div className="max-w-5xl mx-auto">
          <h1
            className="text-lg font-bold mb-4 font-mono"
            style={{ color: C.textPrimary }}
          >
            &gt; graveyard
          </h1>
          <EmptyState
            icon={
              <svg
                viewBox="0 0 24 24"
                width={48}
                height={48}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L8 6H4v4l-4 4 4 4v4h4l4 4 4-4h4v-4l4-4-4-4V6h-4L12 2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            }
            title="No tokens in the graveyard yet"
            description="Tokens you pass on will show up here. Swipe through some tokens to see how your passes play out."
            action={{
              label: "Start Swiping",
              onClick: () => router.push("/"),
            }}
          />
        </div>
      </ErrorBoundary>
    );
  }

  /* ── main render ── */
  return (
    <ErrorBoundary fallbackTitle="Graveyard error">
      <div className="max-w-5xl mx-auto">
        <h1
          className="text-lg font-bold mb-4 font-mono"
          style={{ color: C.textPrimary }}
        >
          &gt; graveyard
        </h1>

        {/* Stats bar */}
        {statsLoading ? (
          <StatsSkeleton />
        ) : stats ? (
          <SummaryStats stats={stats} />
        ) : null}

        {/* Biggest miss highlight */}
        {stats?.biggestMiss && <BiggestMissCard biggestMiss={stats.biggestMiss} />}

        {/* Sort selector */}
        <SortSelector active={sort} onChange={handleSortChange} />

        {/* Filter tabs */}
        <FilterTabs active={filter} onChange={setFilter} counts={counts} />

        {/* Desktop table (hidden on small screens) */}
        <div
          className="hidden md:block rounded-xl overflow-hidden"
          style={{ border: `1px solid ${C.border}` }}
        >
          <TableHeader />
          {filteredItems.length === 0 ? (
            <div
              className="text-center py-10 text-xs font-mono"
              style={{ color: C.textMuted, backgroundColor: C.bgPrimary }}
            >
              No tokens match this filter.
            </div>
          ) : (
            filteredItems.map((item) => <TableRow key={item.id} item={item} />)
          )}
        </div>

        {/* Mobile cards (visible on small screens) */}
        <div className="md:hidden space-y-2">
          {filteredItems.length === 0 ? (
            <div
              className="text-center py-10 text-xs font-mono rounded-lg"
              style={{
                color: C.textMuted,
                backgroundColor: C.bgCard,
                border: `1px solid ${C.border}`,
              }}
            >
              No tokens match this filter.
            </div>
          ) : (
            filteredItems.map((item) => <MobileCard key={item.id} item={item} />)
          )}
        </div>

        {/* Footer count */}
        <div className="mt-3 text-center">
          <span className="text-[10px] font-mono" style={{ color: C.textMuted }}>
            showing {filteredItems.length} of {items.length} passed tokens
          </span>
        </div>
      </div>
    </ErrorBoundary>
  );
}
