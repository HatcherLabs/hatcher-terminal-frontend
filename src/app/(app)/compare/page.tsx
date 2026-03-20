"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCompare } from "@/components/providers/CompareProvider";
import { useWatchlist } from "@/components/providers/WatchlistProvider";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { api } from "@/lib/api";
import type { TokenData } from "@/types/token";
import { useSolPriceContext } from "@/components/providers/SolPriceProvider";

// ---- palette (hardcoded hex) ----
const C = {
  green: "#00d672",
  red: "#f23645",
  accent: "#8b5cf6",
  bgPrimary: "#04060b",
  bgCard: "#0a0d14",
  bgElevated: "#10131c",
  bgHover: "#181c28",
  border: "#1a1f2e",
  borderHover: "#2a3048",
  textPrimary: "#e0e0e8",
  textSecondary: "#a0a0b8",
  textMuted: "#6b6b80",
  textFaint: "#44445a",
  yellow: "#facc15",
  blue: "#3b82f6",
  amber: "#f0a000",
} as const;

// ---- helpers ----

function fmt(n: number | null | undefined): string {
  if (n == null) return "\u2014";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(n < 10 ? 2 : 0);
}

function fmtUsd(n: number | null | undefined): string {
  if (n == null) return "\u2014";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "\u2014";
  return `${n.toFixed(1)}%`;
}

function fmtChange(n: number | null | undefined): string {
  if (n == null) return "\u2014";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function tokenAge(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

// Risk level numeric value (lower = better)
function riskToNum(level: TokenData["riskLevel"]): number {
  if (!level) return 99;
  const map: Record<string, number> = { LOW: 1, MED: 2, HIGH: 3, EXTREME: 4 };
  return map[level] ?? 99;
}

// ---- metric definitions ----

type MetricDirection = "higher" | "lower";

interface MetricDef {
  label: string;
  key: string;
  direction: MetricDirection; // "higher" = bigger is better, "lower" = smaller is better
  getValue: (t: TokenData, live: LiveTokenData) => number | null;
  format: (v: number | null) => string;
}

interface LiveTokenData {
  marketCapSol: number | null;
  marketCapUsd: number | null;
  volume1h: number | null;
  buyCount: number | null;
  sellCount: number | null;
  bondingProgress: number | null;
}

const METRICS: MetricDef[] = [
  {
    label: "MCap",
    key: "mcap",
    direction: "higher",
    getValue: (_t, l) => l.marketCapUsd,
    format: fmtUsd,
  },
  {
    label: "Volume 1h",
    key: "vol1h",
    direction: "higher",
    getValue: (_t, l) => l.volume1h,
    format: (v) => (v != null ? `$${fmt(v)}` : "\u2014"),
  },
  {
    label: "Holders",
    key: "holders",
    direction: "higher",
    getValue: (t) => t.holders,
    format: fmt,
  },
  {
    label: "Dev Hold%",
    key: "devhold",
    direction: "lower",
    getValue: (t) => t.devHoldPct,
    format: fmtPct,
  },
  {
    label: "Top 10%",
    key: "top10",
    direction: "lower",
    getValue: (t) => t.topHoldersPct,
    format: fmtPct,
  },
  {
    label: "Buy Count",
    key: "buys",
    direction: "higher",
    getValue: (_t, l) => l.buyCount,
    format: fmt,
  },
  {
    label: "Sell Count",
    key: "sells",
    direction: "lower",
    getValue: (_t, l) => l.sellCount,
    format: fmt,
  },
  {
    label: "B/S Ratio",
    key: "bsratio",
    direction: "higher",
    getValue: (_t, l) => {
      const b = l.buyCount ?? 0;
      const s = l.sellCount ?? 0;
      if (b + s === 0) return null;
      return (b / (b + s)) * 100;
    },
    format: fmtPct,
  },
  {
    label: "Bonding%",
    key: "bonding",
    direction: "higher",
    getValue: (_t, l) => l.bondingProgress,
    format: fmtPct,
  },
  {
    label: "Risk",
    key: "risk",
    direction: "lower",
    getValue: (t) => riskToNum(t.riskLevel),
    format: () => "", // handled specially
  },
  {
    label: "Age",
    key: "age",
    direction: "higher",
    getValue: (t) => {
      const ms = Date.now() - new Date(t.createdAt).getTime();
      return ms / 1000;
    },
    format: () => "", // handled specially
  },
  {
    label: "5m Change",
    key: "chg5m",
    direction: "higher",
    getValue: (t) => t.priceChange5m,
    format: fmtChange,
  },
  {
    label: "1h Change",
    key: "chg1h",
    direction: "higher",
    getValue: (t) => t.priceChange1h,
    format: fmtChange,
  },
];

// ---- live data hook per token ----

function useLiveTokenData(token: TokenData): LiveTokenData {
  const { solPrice: SOL_PRICE_USD } = useSolPriceContext();
  const liveData = useTokenPrice(token.mintAddress);

  const marketCapSol = liveData?.marketCapSol ?? token.marketCapSol;
  const marketCapUsd =
    liveData?.marketCapUsd ??
    (marketCapSol != null ? marketCapSol * SOL_PRICE_USD : null);
  const volume1h = liveData?.volume1h ?? token.volume1h;
  const buyCount = liveData?.buyCount1h ?? token.buyCount;
  const sellCount = liveData?.sellCount1h ?? token.sellCount;
  const bondingProgress = liveData?.bondingProgress ?? token.bondingProgress;

  return { marketCapSol, marketCapUsd, volume1h, buyCount, sellCount, bondingProgress };
}

// ---- LiveDataProvider: renders hooks per token, passes data up ----

function LiveDataCollector({
  token,
  onData,
}: {
  token: TokenData;
  onData: (mint: string, data: LiveTokenData) => void;
}) {
  const live = useLiveTokenData(token);
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  useEffect(() => {
    onDataRef.current(token.mintAddress, live);
  }, [token.mintAddress, live]);

  return null;
}

// ---- Search modal for adding tokens ----

interface SearchToken {
  mintAddress: string;
  name: string;
  ticker: string;
  imageUri: string | null;
  marketCapUsd: number | null;
}

function AddTokenSearch({
  open,
  onClose,
  onSelect,
  existingMints,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (mint: string) => void;
  existingMints: string[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.raw(
          `/api/tokens/search?q=${encodeURIComponent(query.trim())}&limit=8`
        );
        const json = await res.json();
        if (json.success) {
          setResults(
            (json.data as SearchToken[]).filter(
              (t) => !existingMints.includes(t.mintAddress)
            )
          );
        } else setResults([]);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, existingMints]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [results]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((p) => (p < results.length - 1 ? p + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((p) => (p > 0 ? p - 1 : results.length - 1));
      } else if (e.key === "Enter" && results[selectedIdx]) {
        e.preventDefault();
        onSelect(results[selectedIdx].mintAddress);
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, selectedIdx, onSelect, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* backdrop */}
      <div className="absolute inset-0" style={{ background: "rgba(4,6,11,0.80)" }} />

      {/* modal */}
      <div
        className="relative w-full max-w-md rounded-xl overflow-hidden"
        style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* search input */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
          <svg viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="1.5" className="w-4 h-4 shrink-0">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search token to add..."
            className="flex-1 bg-transparent text-sm font-mono outline-none placeholder:text-[#363d54]"
            style={{ color: C.textPrimary }}
          />
          <kbd
            className="text-[9px] font-mono px-1.5 py-0.5 rounded"
            style={{ color: C.textFaint, background: C.bgHover, border: `1px solid ${C.border}` }}
          >
            ESC
          </kbd>
        </div>

        {/* results */}
        <div className="max-h-64 overflow-y-auto terminal-scrollbar">
          {query.trim().length >= 1 && query.trim().length < 2 && (
            <p className="text-xs font-mono text-center py-6" style={{ color: C.textMuted }}>
              Type at least 2 characters
            </p>
          )}
          {query.trim().length >= 2 && loading && (
            <div className="py-6 text-center">
              <div
                className="inline-block w-4 h-4 rounded-full animate-spin"
                style={{ border: `2px solid ${C.border}`, borderTopColor: C.accent }}
              />
            </div>
          )}
          {query.trim().length >= 2 && !loading && results.length === 0 && (
            <p className="text-xs font-mono text-center py-6" style={{ color: C.textMuted }}>
              No tokens found
            </p>
          )}
          {!loading &&
            results.map((t, i) => (
              <button
                key={t.mintAddress}
                onClick={() => {
                  onSelect(t.mintAddress);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIdx(i)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                style={{
                  background: selectedIdx === i ? C.bgElevated : "transparent",
                }}
              >
                <TokenAvatar mintAddress={t.mintAddress} imageUri={t.imageUri} size={28} ticker={t.ticker} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium truncate" style={{ color: C.textPrimary }}>
                      {t.name}
                    </span>
                    <span className="text-[10px] font-mono shrink-0" style={{ color: C.textSecondary }}>
                      ${t.ticker}
                    </span>
                  </div>
                  {t.marketCapUsd != null && (
                    <span className="text-[10px] font-mono" style={{ color: C.textMuted }}>
                      MC {fmtUsd(t.marketCapUsd)}
                    </span>
                  )}
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke={C.textFaint} strokeWidth="2" className="w-4 h-4 shrink-0">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

// ---- Proportional bar ----

function MetricBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1 rounded-full mt-1" style={{ background: C.bgHover }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

// ---- Radar / Spider Chart ----

const RADAR_AXES = [
  { label: "MCap", key: "mcap" },
  { label: "Volume", key: "vol1h" },
  { label: "Holders", key: "holders" },
  { label: "Safety", key: "risk" },
  { label: "Momentum", key: "momentum" },
] as const;

function getRadarValues(
  t: TokenData,
  live: LiveTokenData
): Record<string, number> {
  const mcapRaw = live.marketCapUsd ?? 0;
  const mcap = mcapRaw > 0 ? Math.min(Math.log10(mcapRaw + 1) / 7, 1) : 0;

  const volRaw = live.volume1h ?? 0;
  const vol = volRaw > 0 ? Math.min(Math.log10(volRaw + 1) / 6, 1) : 0;

  const holdersRaw = t.holders ?? 0;
  const holders =
    holdersRaw > 0 ? Math.min(Math.log10(holdersRaw + 1) / 4, 1) : 0;

  const riskNum = riskToNum(t.riskLevel);
  const safety = riskNum <= 4 ? 1 - (riskNum - 1) / 3 : 0;

  const chg5 = t.priceChange5m ?? 0;
  const chg1h = t.priceChange1h ?? 0;
  const momentum = Math.min(Math.max((chg5 + chg1h + 100) / 200, 0), 1);

  return { mcap, vol1h: vol, holders, risk: safety, momentum };
}

const TOKEN_COLORS = [C.accent, C.blue, C.amber];

function RadarChart({
  tokens,
  liveDataMap,
}: {
  tokens: TokenData[];
  liveDataMap: Record<string, LiveTokenData>;
}) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;
  const levels = 4;
  const axisCount = RADAR_AXES.length;
  const angleStep = (2 * Math.PI) / axisCount;
  const startAngle = -Math.PI / 2;

  function polarToXY(angle: number, radius: number) {
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  }

  const gridRings = Array.from({ length: levels }, (_, i) => {
    const ringR = (r * (i + 1)) / levels;
    const points = Array.from({ length: axisCount }, (_, j) => {
      const { x, y } = polarToXY(startAngle + j * angleStep, ringR);
      return `${x},${y}`;
    }).join(" ");
    return points;
  });

  const emptyLive: LiveTokenData = {
    marketCapSol: null,
    marketCapUsd: null,
    volume1h: null,
    buyCount: null,
    sellCount: null,
    bondingProgress: null,
  };

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
    >
      <h3
        className="text-[10px] font-bold uppercase tracking-wider mb-3"
        style={{ color: C.textMuted }}
      >
        Radar Comparison
      </h3>
      <div className="flex justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Grid rings */}
          {gridRings.map((pts, i) => (
            <polygon
              key={i}
              points={pts}
              fill="none"
              stroke={C.border}
              strokeWidth={i === levels - 1 ? 1 : 0.5}
            />
          ))}
          {/* Axis lines */}
          {RADAR_AXES.map((_, i) => {
            const { x, y } = polarToXY(startAngle + i * angleStep, r);
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke={C.border}
                strokeWidth={0.5}
              />
            );
          })}
          {/* Token polygons */}
          {tokens.map((t, tIdx) => {
            const vals = getRadarValues(
              t,
              liveDataMap[t.mintAddress] ?? emptyLive
            );
            const color = TOKEN_COLORS[tIdx % TOKEN_COLORS.length];
            const points = RADAR_AXES.map((axis, i) => {
              const v = vals[axis.key] ?? 0;
              const { x, y } = polarToXY(
                startAngle + i * angleStep,
                r * v
              );
              return `${x},${y}`;
            }).join(" ");
            return (
              <g key={t.mintAddress}>
                <polygon
                  points={points}
                  fill={`${color}20`}
                  stroke={color}
                  strokeWidth={1.5}
                />
                {RADAR_AXES.map((axis, i) => {
                  const v = vals[axis.key] ?? 0;
                  const { x, y } = polarToXY(
                    startAngle + i * angleStep,
                    r * v
                  );
                  return (
                    <circle
                      key={axis.key}
                      cx={x}
                      cy={y}
                      r={2.5}
                      fill={color}
                    />
                  );
                })}
              </g>
            );
          })}
          {/* Axis labels */}
          {RADAR_AXES.map((axis, i) => {
            const { x, y } = polarToXY(
              startAngle + i * angleStep,
              r + 18
            );
            return (
              <text
                key={axis.key}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={C.textMuted}
                fontSize={9}
                fontFamily="monospace"
                fontWeight={600}
              >
                {axis.label}
              </text>
            );
          })}
        </svg>
      </div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        {tokens.map((t, i) => (
          <div key={t.mintAddress} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: TOKEN_COLORS[i % TOKEN_COLORS.length],
              }}
            />
            <span
              className="text-[10px] font-mono"
              style={{ color: C.textSecondary }}
            >
              ${t.ticker}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Winner Badge ----

function WinnerBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide"
      style={{
        background: `${C.green}18`,
        color: C.green,
        border: `1px solid ${C.green}40`,
      }}
    >
      <svg viewBox="0 0 16 16" width={10} height={10} fill={C.green}>
        <path d="M8 1l2.09 4.26L15 5.97l-3.5 3.42.83 4.84L8 12.17l-4.33 2.06.83-4.84L1 5.97l4.91-.71z" />
      </svg>
      Winner
    </span>
  );
}

// ---- Price Correlation Indicator ----

function PriceCorrelation({ tokens }: { tokens: TokenData[] }) {
  if (tokens.length < 2) return null;

  const t1 = tokens[0];
  const t2 = tokens[1];

  const changes1 = [t1.priceChange5m, t1.priceChange1h, t1.priceChange6h, t1.priceChange24h].filter(
    (v): v is number => v != null
  );
  const changes2 = [t2.priceChange5m, t2.priceChange1h, t2.priceChange6h, t2.priceChange24h].filter(
    (v): v is number => v != null
  );

  const n = Math.min(changes1.length, changes2.length);
  if (n < 2) {
    return (
      <div
        className="rounded-xl p-4"
        style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
      >
        <h3
          className="text-[10px] font-bold uppercase tracking-wider mb-2"
          style={{ color: C.textMuted }}
        >
          Price Correlation
        </h3>
        <p className="text-xs font-mono" style={{ color: C.textFaint }}>
          Insufficient data
        </p>
      </div>
    );
  }

  const a = changes1.slice(0, n);
  const b = changes2.slice(0, n);
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  const corr = den > 0 ? num / den : 0;

  let label: string;
  let color: string;
  let icon: string;
  if (corr > 0.5) {
    label = "Moving together";
    color = C.green;
    icon = "↑↑";
  } else if (corr < -0.5) {
    label = "Moving inversely";
    color = C.red;
    icon = "↑↓";
  } else {
    label = "Uncorrelated";
    color = C.amber;
    icon = "↔";
  }

  const barWidth = 140;
  const barCenter = barWidth / 2;
  const dotX = barCenter + (corr * barWidth) / 2;

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
    >
      <h3
        className="text-[10px] font-bold uppercase tracking-wider mb-3"
        style={{ color: C.textMuted }}
      >
        Price Correlation
      </h3>
      <div className="flex items-center gap-3">
        <span className="text-lg" style={{ color }}>
          {icon}
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-xs font-medium"
              style={{ color }}
            >
              {label}
            </span>
            <span
              className="text-[10px] font-mono"
              style={{ color: C.textSecondary }}
            >
              r = {corr.toFixed(2)}
            </span>
          </div>
          {/* Correlation bar */}
          <div className="relative" style={{ width: barWidth, height: 8 }}>
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `linear-gradient(to right, ${C.red}, ${C.amber}, ${C.green})`,
                opacity: 0.25,
              }}
            />
            {/* center mark */}
            <div
              className="absolute top-0 bottom-0 w-px"
              style={{ left: barCenter, background: C.textFaint }}
            />
            {/* dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
              style={{
                left: dotX - 5,
                background: color,
                boxShadow: `0 0 6px ${color}80`,
              }}
            />
          </div>
          <div
            className="flex justify-between mt-1 text-[8px] font-mono"
            style={{ color: C.textFaint, width: barWidth }}
          >
            <span>-1</span>
            <span>0</span>
            <span>+1</span>
          </div>
        </div>
      </div>
      <p
        className="text-[10px] mt-2"
        style={{ color: C.textFaint }}
      >
        Based on 5m, 1h, 6h, 24h price changes for ${tokens[0].ticker} vs ${tokens[1].ticker}
      </p>
    </div>
  );
}

// ---- Main Compare Page ----

export default function ComparePage() {
  const router = useRouter();
  const { compareTokens, addToCompare, removeFromCompare, clearCompare } = useCompare();
  const { isWatchlisted, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [liveDataMap, setLiveDataMap] = useState<Record<string, LiveTokenData>>({});

  // Fetch token data
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

  const handleLiveData = useCallback((mint: string, data: LiveTokenData) => {
    setLiveDataMap((prev) => {
      const existing = prev[mint];
      if (
        existing &&
        existing.marketCapUsd === data.marketCapUsd &&
        existing.volume1h === data.volume1h &&
        existing.buyCount === data.buyCount &&
        existing.sellCount === data.sellCount &&
        existing.bondingProgress === data.bondingProgress
      ) {
        return prev;
      }
      return { ...prev, [mint]: data };
    });
  }, []);

  // Compute winner/loser for each metric
  function getWinnerLoser(metric: MetricDef): { winner: string | null; loser: string | null } {
    if (tokens.length < 2) return { winner: null, loser: null };

    const entries = tokens
      .map((t) => ({
        mint: t.mintAddress,
        val: metric.getValue(t, liveDataMap[t.mintAddress] ?? {
          marketCapSol: null, marketCapUsd: null, volume1h: null,
          buyCount: null, sellCount: null, bondingProgress: null,
        }),
      }))
      .filter((e): e is { mint: string; val: number } => e.val != null);

    if (entries.length < 2) return { winner: null, loser: null };

    const sorted = [...entries].sort((a, b) => a.val - b.val);
    if (sorted[0].val === sorted[sorted.length - 1].val) return { winner: null, loser: null };

    if (metric.direction === "higher") {
      return { winner: sorted[sorted.length - 1].mint, loser: sorted[0].mint };
    } else {
      return { winner: sorted[0].mint, loser: sorted[sorted.length - 1].mint };
    }
  }

  // Max value per metric (for proportional bars)
  function getMaxValue(metric: MetricDef): number {
    let max = 0;
    for (const t of tokens) {
      const v = metric.getValue(t, liveDataMap[t.mintAddress] ?? {
        marketCapSol: null, marketCapUsd: null, volume1h: null,
        buyCount: null, sellCount: null, bondingProgress: null,
      });
      if (v != null && v > max) max = v;
    }
    return max;
  }

  const canAdd = compareTokens.length < 3;

  // Tally wins per token to determine overall winner
  const winTally: Record<string, number> = {};
  if (tokens.length >= 2) {
    for (const t of tokens) winTally[t.mintAddress] = 0;
    for (const metric of METRICS) {
      const { winner } = getWinnerLoser(metric);
      if (winner && winTally[winner] !== undefined) {
        winTally[winner]++;
      }
    }
  }
  const maxWins = Math.max(0, ...Object.values(winTally));
  const overallWinnerMint =
    tokens.length >= 2 && maxWins > 0
      ? Object.entries(winTally).find(
          ([, count]) => count === maxWins
        )?.[0] ?? null
      : null;
  // Only award badge if there is a unique winner
  const overallWinner =
    overallWinnerMint &&
    Object.values(winTally).filter((c) => c === maxWins).length === 1
      ? overallWinnerMint
      : null;

  // ---- EMPTY STATE ----
  if (!loading && tokens.length < 2 && compareTokens.length < 2) {
    return (
      <ErrorBoundary fallbackTitle="Compare error">
      <div className="flex flex-col items-center justify-center gap-5 pt-16 pb-24">
        {/* Live data collectors for existing tokens */}
        {tokens.map((t) => (
          <LiveDataCollector key={t.mintAddress} token={t} onData={handleLiveData} />
        ))}

        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: C.bgElevated, border: `1px solid ${C.border}` }}
        >
          <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke={C.textFaint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="18" rx="1" />
            <rect x="14" y="3" width="7" height="18" rx="1" />
          </svg>
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm font-medium" style={{ color: C.textSecondary }}>
            Add 2+ tokens to compare
          </p>
          <p className="text-xs" style={{ color: C.textMuted }}>
            Use the compare button on token cards, or search below.
          </p>
        </div>
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-colors"
          style={{
            background: `${C.accent}18`,
            border: `1px solid ${C.accent}40`,
            color: C.accent,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Token
        </button>

        <AddTokenSearch
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          onSelect={addToCompare}
          existingMints={compareTokens}
        />
      </div>
      </ErrorBoundary>
    );
  }

  // ---- LOADING ----
  if (loading) {
    return (
      <ErrorBoundary fallbackTitle="Compare error">
      <div className="flex flex-col pt-2">
        <h1 className="text-lg font-bold tracking-tight mb-4" style={{ color: C.textPrimary }}>
          Compare
        </h1>
        <div className="space-y-2">
          {Array.from({ length: 13 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded animate-pulse"
              style={{ background: C.bgElevated }}
            />
          ))}
        </div>
      </div>
      </ErrorBoundary>
    );
  }

  // ---- MAIN TABLE VIEW ----
  const colCount = tokens.length;
  const gridCols =
    colCount === 1
      ? "1fr"
      : colCount === 2
        ? "1fr 1fr"
        : "1fr 1fr 1fr";

  return (
    <ErrorBoundary fallbackTitle="Compare error">
    <div className="flex flex-col pt-2 pb-24 md:pb-4">
      {/* Live data collectors */}
      {tokens.map((t) => (
        <LiveDataCollector key={t.mintAddress} token={t} onData={handleLiveData} />
      ))}

      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold tracking-tight" style={{ color: C.textPrimary }}>
          Compare
          <span className="ml-2 text-xs font-normal" style={{ color: C.textMuted }}>
            {tokens.length}/3
          </span>
        </h1>
        <div className="flex items-center gap-3">
          {canAdd && (
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
              style={{
                background: `${C.accent}18`,
                border: `1px solid ${C.accent}40`,
                color: C.accent,
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add
            </button>
          )}
          <button
            onClick={clearCompare}
            className="text-[11px] font-medium transition-colors"
            style={{ color: C.textMuted }}
            onMouseEnter={(e) => (e.currentTarget.style.color = C.red)}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.textMuted)}
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Comparison table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
      >
        {/* ---- Token Header Row ---- */}
        <div
          className="grid items-stretch"
          style={{
            gridTemplateColumns: `120px ${gridCols}`,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          {/* label cell */}
          <div className="px-3 py-3" style={{ borderRight: `1px solid ${C.border}` }} />

          {/* token header cells */}
          {tokens.map((t, idx) => (
            <div
              key={t.mintAddress}
              className="px-3 py-3 flex flex-col items-center gap-2"
              style={{
                borderRight: idx < colCount - 1 ? `1px solid ${C.border}` : undefined,
              }}
            >
              <TokenAvatar mintAddress={t.mintAddress} imageUri={t.imageUri} size={36} ticker={t.ticker} />
              <div className="text-center">
                <div className="text-xs font-bold truncate max-w-[120px]" style={{ color: C.textPrimary }}>
                  {t.name}
                </div>
                <div className="text-[10px] font-mono" style={{ color: C.textMuted }}>
                  ${t.ticker}
                </div>
              </div>
              <RiskBadge level={t.riskLevel} />
              {overallWinner === t.mintAddress && <WinnerBadge />}
            </div>
          ))}
        </div>

        {/* ---- Quick Actions Row ---- */}
        <div
          className="grid items-center"
          style={{
            gridTemplateColumns: `120px ${gridCols}`,
            borderBottom: `1px solid ${C.border}`,
            background: C.bgElevated,
          }}
        >
          <div
            className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: C.textFaint, borderRight: `1px solid ${C.border}` }}
          >
            Actions
          </div>
          {tokens.map((t, idx) => {
            const watched = isWatchlisted(t.mintAddress);
            return (
              <div
                key={t.mintAddress}
                className="px-2 py-2 flex flex-wrap items-center justify-center gap-1"
                style={{ borderRight: idx < colCount - 1 ? `1px solid ${C.border}` : undefined }}
              >
                <button
                  onClick={() => router.push(`/token/${t.mintAddress}`)}
                  className="px-2 py-1 rounded text-[10px] font-bold transition-colors"
                  style={{ background: `${C.green}18`, color: C.green, border: `1px solid ${C.green}40` }}
                >
                  Detail
                </button>
                <button
                  onClick={() =>
                    watched
                      ? removeFromWatchlist(t.mintAddress)
                      : addToWatchlist({ mintAddress: t.mintAddress, name: t.name, ticker: t.ticker, imageUri: t.imageUri })
                  }
                  className="px-2 py-1 rounded text-[10px] font-bold transition-colors"
                  style={{
                    background: watched ? `${C.yellow}18` : `${C.accent}18`,
                    color: watched ? C.yellow : C.accent,
                    border: `1px solid ${watched ? C.yellow : C.accent}40`,
                  }}
                >
                  {watched ? "Watched" : "Watch"}
                </button>
                <button
                  onClick={() => router.push(`/token/${t.mintAddress}?action=buy`)}
                  className="px-2 py-1 rounded text-[10px] font-bold transition-colors"
                  style={{ background: `${C.green}18`, color: C.green, border: `1px solid ${C.green}40` }}
                >
                  Buy
                </button>
                <button
                  onClick={() => removeFromCompare(t.mintAddress)}
                  className="px-2 py-1 rounded text-[10px] font-bold transition-colors"
                  style={{ background: `${C.red}18`, color: C.red, border: `1px solid ${C.red}40` }}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>

        {/* ---- Metric Rows ---- */}
        {METRICS.map((metric, rowIdx) => {
          const { winner, loser } = getWinnerLoser(metric);
          const maxVal = getMaxValue(metric);
          const isEven = rowIdx % 2 === 0;

          return (
            <div
              key={metric.key}
              className="grid items-center"
              style={{
                gridTemplateColumns: `120px ${gridCols}`,
                background: isEven ? C.bgCard : `${C.bgElevated}80`,
                borderBottom: rowIdx < METRICS.length - 1 ? `1px solid ${C.border}` : undefined,
              }}
            >
              {/* Row label */}
              <div
                className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: C.textMuted, borderRight: `1px solid ${C.border}` }}
              >
                {metric.label}
              </div>

              {/* Value cells */}
              {tokens.map((t, colIdx) => {
                const live = liveDataMap[t.mintAddress] ?? {
                  marketCapSol: null, marketCapUsd: null, volume1h: null,
                  buyCount: null, sellCount: null, bondingProgress: null,
                };
                const val = metric.getValue(t, live);
                const isWinner = winner === t.mintAddress;
                const isLoser = loser === t.mintAddress;

                // Cell color
                let cellColor: string = C.textPrimary;
                let cellBg = "transparent";
                if (isWinner) {
                  cellColor = C.green;
                  cellBg = `${C.green}14`;
                } else if (isLoser) {
                  cellColor = C.red;
                  cellBg = `${C.red}14`;
                }

                // Special rendering for Risk row
                if (metric.key === "risk") {
                  return (
                    <div
                      key={t.mintAddress}
                      className="px-3 py-2.5 flex items-center justify-center"
                      style={{
                        background: cellBg,
                        borderRight: colIdx < colCount - 1 ? `1px solid ${C.border}` : undefined,
                      }}
                    >
                      <RiskBadge level={t.riskLevel} />
                    </div>
                  );
                }

                // Special rendering for Age row
                if (metric.key === "age") {
                  return (
                    <div
                      key={t.mintAddress}
                      className="px-3 py-2.5 text-center"
                      style={{
                        background: cellBg,
                        borderRight: colIdx < colCount - 1 ? `1px solid ${C.border}` : undefined,
                      }}
                    >
                      <span className="text-xs font-mono font-medium" style={{ color: cellColor }}>
                        {tokenAge(t.createdAt)}
                      </span>
                    </div>
                  );
                }

                // Change rows get special coloring
                const isChangeMetric = metric.key === "chg5m" || metric.key === "chg1h";
                let displayColor = cellColor;
                if (isChangeMetric && val != null && !isWinner && !isLoser) {
                  displayColor = val >= 0 ? C.green : C.red;
                }

                // Bar color
                const barColor = isWinner ? C.green : isLoser ? C.red : C.accent;

                // Should show bar? Only for non-percentage, non-change metrics where absolute value matters
                const showBar = !isChangeMetric && metric.key !== "bsratio" && metric.key !== "risk" && val != null;

                return (
                  <div
                    key={t.mintAddress}
                    className="px-3 py-2.5 text-center"
                    style={{
                      background: cellBg,
                      borderRight: colIdx < colCount - 1 ? `1px solid ${C.border}` : undefined,
                    }}
                  >
                    <span className="text-xs font-mono font-medium inline-flex items-center gap-0.5" style={{ color: displayColor }}>
                      {isWinner && (
                        <svg viewBox="0 0 10 10" width={8} height={8} fill={C.green} className="shrink-0">
                          <path d="M5 2L8 6H2z" />
                        </svg>
                      )}
                      {isLoser && (
                        <svg viewBox="0 0 10 10" width={8} height={8} fill={C.red} className="shrink-0">
                          <path d="M5 8L2 4h6z" />
                        </svg>
                      )}
                      {metric.format(val)}
                    </span>
                    {showBar && (
                      <MetricBar value={Math.abs(val ?? 0)} max={maxVal} color={barColor} />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Radar chart + Price correlation */}
      {tokens.length >= 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <RadarChart tokens={tokens} liveDataMap={liveDataMap} />
          <PriceCorrelation tokens={tokens} />
        </div>
      )}

      {/* Add token slot (if under 3) */}
      {canAdd && (
        <button
          onClick={() => setSearchOpen(true)}
          className="mt-3 w-full py-4 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
          style={{
            background: C.bgCard,
            border: `1px dashed ${C.borderHover}`,
            color: C.textMuted,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = C.accent;
            e.currentTarget.style.color = C.accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = C.borderHover;
            e.currentTarget.style.color = C.textMuted;
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add token to compare ({tokens.length}/3)
        </button>
      )}

      {/* Search modal */}
      <AddTokenSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={addToCompare}
        existingMints={compareTokens}
      />
    </div>
    </ErrorBoundary>
  );
}
