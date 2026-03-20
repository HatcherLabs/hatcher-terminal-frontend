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
    currentMarketCapSol: number | null;
  };
  marketCapAtSwipe: number | null;
  currentMarketCap: number | null;
  priceChangePct: number | null;
  outcome: "rug" | "pump" | "neutral";
}

interface GraveyardStats {
  totalPassed: number;
  rugsDodged: number;
  opportunitiesMissed: number;
}

type OutcomeFilter = "all" | "rug" | "pump" | "neutral";

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
  accent: "#8b5cf6",
  accentBg: "#8b5cf618",
  textPrimary: "#e0e0e8",
  textSecondary: "#a0a4b8",
  textMuted: "#5c6178",
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

function formatMcap(val: number | null, isActive: boolean): string {
  if (val === null || val <= 0) return isActive ? "--" : "DEAD";
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return val.toFixed(0);
}

function formatPct(pct: number | null): string {
  if (pct === null) return "--";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}%`;
}

/* ── outcome badge ─────────────────────────────────────── */

function OutcomeBadge({ outcome }: { outcome: "rug" | "pump" | "neutral" }) {
  const config = {
    rug: { label: "RUG DODGED", color: C.green, bg: C.greenBg },
    pump: { label: "MISSED", color: C.red, bg: C.redBg },
    neutral: { label: "NEUTRAL", color: C.textMuted, bg: `${C.textMuted}18` },
  } as const;
  const { label, color, bg } = config[outcome];

  return (
    <span
      className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ color, backgroundColor: bg }}
    >
      {label}
    </span>
  );
}

/* ── filter tabs ───────────────────────────────────────── */

const FILTER_OPTIONS: { value: OutcomeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "rug", label: "Rugs Dodged" },
  { value: "pump", label: "Missed" },
  { value: "neutral", label: "Neutral" },
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

/* ── summary stats bar ─────────────────────────────────── */

function SummaryStats({
  stats,
  avgChange,
}: {
  stats: GraveyardStats;
  avgChange: number | null;
}) {
  const cells = [
    { label: "Passed", value: String(stats.totalPassed), color: C.textPrimary },
    { label: "Rugs Dodged", value: String(stats.rugsDodged), color: C.green },
    { label: "Missed", value: String(stats.opportunitiesMissed), color: C.red },
    {
      label: "Avg Change",
      value: avgChange !== null ? formatPct(avgChange) : "--",
      color:
        avgChange !== null
          ? avgChange >= 0
            ? C.green
            : C.red
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

/* ── table header ──────────────────────────────────────── */

function TableHeader() {
  return (
    <div
      className="grid items-center px-3 py-2 text-[10px] font-mono uppercase tracking-wider rounded-t-lg"
      style={{
        gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr",
        backgroundColor: C.bgCard,
        borderBottom: `1px solid ${C.border}`,
        color: C.textMuted,
      }}
    >
      <span>Token</span>
      <span className="text-right">Passed</span>
      <span className="text-right">Price Then</span>
      <span className="text-right">Price Now</span>
      <span className="text-right">Change%</span>
      <span className="text-center">Outcome</span>
      <span className="text-right">MCap Now</span>
    </div>
  );
}

/* ── table row ─────────────────────────────────────────── */

function TableRow({ item }: { item: GraveyardToken }) {
  const pct = item.priceChangePct;
  const isUp = pct !== null && pct > 0;

  return (
    <Link
      href={`/token/${item.token.mintAddress}`}
      className="grid items-center px-3 py-2.5 transition-colors duration-150"
      style={{
        gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr",
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
            {item.token.isGraduated && (
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

      {/* Price Then (MCap at swipe) */}
      <span
        className="text-[11px] font-mono text-right"
        style={{ color: C.textSecondary }}
      >
        {item.marketCapAtSwipe !== null
          ? `${formatMcap(item.marketCapAtSwipe, true)} SOL`
          : "--"}
      </span>

      {/* Price Now */}
      <span
        className="text-[11px] font-mono text-right"
        style={{ color: C.textSecondary }}
      >
        {item.currentMarketCap !== null && item.currentMarketCap > 0
          ? `${formatMcap(item.currentMarketCap, true)} SOL`
          : item.token.isActive
            ? "--"
            : "DEAD"}
      </span>

      {/* Change % */}
      <span
        className="text-[11px] font-mono font-semibold text-right"
        style={{ color: pct === null ? C.textMuted : isUp ? C.green : C.red }}
      >
        {formatPct(pct)}
      </span>

      {/* Outcome badge */}
      <div className="flex justify-center">
        <OutcomeBadge outcome={item.outcome} />
      </div>

      {/* MCap Now */}
      <span
        className="text-[11px] font-mono text-right"
        style={{
          color:
            item.currentMarketCap && item.currentMarketCap > 0
              ? C.textPrimary
              : C.textMuted,
        }}
      >
        {item.currentMarketCap !== null && item.currentMarketCap > 0
          ? `${formatMcap(item.currentMarketCap, true)} SOL`
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

  return (
    <Link
      href={`/token/${item.token.mintAddress}`}
      className="block rounded-lg p-3 transition-colors duration-150"
      style={{
        backgroundColor: C.bgCard,
        border: `1px solid ${C.border}`,
      }}
    >
      {/* Top row: avatar + name + outcome */}
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
        <OutcomeBadge outcome={item.outcome} />
      </div>

      {/* Data grid */}
      <div
        className="grid grid-cols-4 gap-2 text-[10px] font-mono pt-2"
        style={{ borderTop: `1px solid ${C.border}` }}
      >
        <div>
          <span className="block" style={{ color: C.textMuted }}>Passed</span>
          <span style={{ color: C.textSecondary }}>{formatTimeSince(item.swipedAt)}</span>
        </div>
        <div>
          <span className="block" style={{ color: C.textMuted }}>Then</span>
          <span style={{ color: C.textSecondary }}>
            {item.marketCapAtSwipe !== null
              ? `${formatMcap(item.marketCapAtSwipe, true)}`
              : "--"}
          </span>
        </div>
        <div>
          <span className="block" style={{ color: C.textMuted }}>Now</span>
          <span style={{ color: C.textSecondary }}>
            {formatMcap(item.currentMarketCap, item.token.isActive)}
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

/* ── main page ─────────────────────────────────────────── */

export default function GraveyardPage() {
  const router = useRouter();
  const [items, setItems] = useState<GraveyardToken[]>([]);
  const [stats, setStats] = useState<GraveyardStats>({
    totalPassed: 0,
    rugsDodged: 0,
    opportunitiesMissed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OutcomeFilter>("all");

  const fetchGraveyard = useCallback(async () => {
    try {
      const res = await api.raw("/api/tokens/graveyard");
      if (res.ok) {
        const json = await res.json();
        setItems(json.data);
        setStats(json.stats);
      }
    } catch {
      // retry on next load
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraveyard();
  }, [fetchGraveyard]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((t) => t.outcome === filter);
  }, [items, filter]);

  const counts = useMemo<Record<OutcomeFilter, number>>(() => {
    const c = { all: items.length, rug: 0, pump: 0, neutral: 0 };
    for (const t of items) {
      c[t.outcome]++;
    }
    return c;
  }, [items]);

  const avgChange = useMemo(() => {
    const valid = items.filter((t) => t.priceChangePct !== null);
    if (valid.length === 0) return null;
    const sum = valid.reduce((a, t) => a + (t.priceChangePct ?? 0), 0);
    return sum / valid.length;
  }, [items]);

  /* ── loading state ── */
  if (loading) {
    return (
      <ErrorBoundary fallbackTitle="Graveyard error">
      <div className="max-w-5xl mx-auto">
        <h1
          className="text-lg font-bold mb-4 font-mono"
          style={{ color: C.textPrimary }}
        >
          &gt; graveyard
        </h1>
        <div className="grid grid-cols-4 gap-px rounded-xl overflow-hidden mb-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="h-10 rounded-lg mb-4" />
        <div className="space-y-0">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </div>
      </ErrorBoundary>
    );
  }

  /* ── empty state ── */
  if (items.length === 0) {
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

      <SummaryStats stats={stats} avgChange={avgChange} />

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
