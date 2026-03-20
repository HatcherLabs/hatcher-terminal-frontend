"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useSolPriceContext } from "@/components/providers/SolPriceProvider";
import { Skeleton } from "@/components/ui/Skeleton";

/* ─── Types ─── */

interface DailyPnL {
  date: string;
  pnlSol: number;
  trades: number;
  wins: number;
}

interface DailyPnLResponse {
  success: boolean;
  data: DailyPnL[];
}

/* ─── Color palette (hardcoded hex) ─── */

const C = {
  bg0: "#06080e",
  bg1: "#0d1017",
  bg2: "#141820",
  bg3: "#1a1f2a",
  bg4: "#1f2435",
  bd: "#1c2030",
  t0: "#f0f2f7",
  t1: "#8890a4",
  t2: "#5c6380",
  t3: "#444c60",
  g: "#22c55e",
  r: "#ef4444",
  a: "#f59e0b",
  ac: "#8b5cf6",
} as const;

/* ─── Helpers ─── */

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Returns 0 = Mon … 6 = Sun (ISO week) */
function isoWeekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Map pnl magnitude to an alpha value 0.05–0.35 for subtle background tinting */
function pnlAlpha(pnlSol: number, maxAbs: number): number {
  if (maxAbs === 0) return 0.05;
  const ratio = Math.min(Math.abs(pnlSol) / maxAbs, 1);
  return 0.05 + ratio * 0.3;
}

function formatSol(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 100) return v.toFixed(1);
  if (abs >= 1) return v.toFixed(2);
  return v.toFixed(3);
}

function formatUsd(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  if (abs >= 1) return `$${v.toFixed(0)}`;
  return `$${v.toFixed(2)}`;
}

/* ─── Arrow Button ─── */

function NavButton({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "none",
        border: `1px solid ${C.bd}`,
        borderRadius: 6,
        color: disabled ? C.t3 : C.t1,
        cursor: disabled ? "not-allowed" : "pointer",
        width: 28,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        lineHeight: 1,
        padding: 0,
        transition: "border-color 0.15s",
      }}
    >
      {children}
    </button>
  );
}

/* ─── Skeleton loader ─── */

function CalendarSkeleton() {
  return (
    <div style={{ padding: 16 }}>
      {/* Header skeleton */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Skeleton width={28} height={28} rounded="rounded-md" />
        <Skeleton width={140} height={16} rounded="rounded" />
        <Skeleton width={28} height={28} rounded="rounded-md" />
      </div>
      {/* Weekday headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} height={14} rounded="rounded" />
        ))}
      </div>
      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} height={48} rounded="rounded-md" />
        ))}
      </div>
      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={44} rounded="rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export function PnLCalendar() {
  const [data, setData] = useState<DailyPnL[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUsd, setShowUsd] = useState(false);

  const { solPrice } = useSolPriceContext();

  // Current displayed month
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  // Fetch data
  useEffect(() => {
    let cancelled = false;

    async function fetchPnL() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<DailyPnLResponse>("/api/positions/daily-pnl?days=90");
        if (!cancelled && res.success) {
          setData(res.data);
        }
      } catch {
        if (!cancelled) setError("Failed to load PnL data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPnL();
    return () => { cancelled = true; };
  }, []);

  // Index data by date key
  const dataByDate = useMemo(() => {
    const map = new Map<string, DailyPnL>();
    for (const d of data) {
      map.set(d.date, d);
    }
    return map;
  }, [data]);

  // Build calendar grid cells
  const gridCells = useMemo(() => {
    const total = daysInMonth(viewYear, viewMonth);
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startPad = isoWeekday(firstDay); // blank cells before day 1

    const cells: Array<{ day: number; dateKey: string } | null> = [];

    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= total; d++) {
      cells.push({ day: d, dateKey: toDateKey(new Date(viewYear, viewMonth, d)) });
    }
    // Pad end to fill the last row
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [viewYear, viewMonth]);

  // Month-scoped data for coloring intensity
  const monthEntries = useMemo(() => {
    return gridCells
      .filter((c): c is { day: number; dateKey: string } => c !== null)
      .map((c) => dataByDate.get(c.dateKey))
      .filter((d): d is DailyPnL => d !== undefined);
  }, [gridCells, dataByDate]);

  const maxAbsPnl = useMemo(() => {
    if (monthEntries.length === 0) return 1;
    return Math.max(...monthEntries.map((e) => Math.abs(e.pnlSol)), 0.001);
  }, [monthEntries]);

  // Monthly summary
  const summary = useMemo(() => {
    let totalPnl = 0;
    let totalTrades = 0;
    let totalWins = 0;
    for (const e of monthEntries) {
      totalPnl += e.pnlSol;
      totalTrades += e.trades;
      totalWins += e.wins;
    }
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    return { totalPnl, totalTrades, totalWins, winRate };
  }, [monthEntries]);

  // Navigation
  const goToPrev = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goToNext = useCallback(() => {
    const now = new Date();
    const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
    if (isCurrentMonth) return;
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, [viewYear, viewMonth]);

  const isCurrentMonth = viewYear === new Date().getFullYear() && viewMonth === new Date().getMonth();
  const today = toDateKey(new Date());

  if (loading) {
    return (
      <div style={{ background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 12 }}>
        <CalendarSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: C.bg1,
          border: `1px solid ${C.bd}`,
          borderRadius: 12,
          padding: 24,
          textAlign: "center",
          color: C.t2,
          fontSize: 13,
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div style={{ background: C.bg1, border: `1px solid ${C.bd}`, borderRadius: 12, overflow: "hidden" }}>
      {/* ─── Header ─── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: `1px solid ${C.bd}`,
        }}
      >
        <NavButton onClick={goToPrev}>&#8249;</NavButton>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: C.t0, fontSize: 14, fontWeight: 600 }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={() => setShowUsd((v) => !v)}
            style={{
              background: C.bg3,
              border: `1px solid ${C.bd}`,
              borderRadius: 4,
              color: showUsd ? C.a : C.t2,
              cursor: "pointer",
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 6px",
              lineHeight: "16px",
              transition: "color 0.15s",
            }}
          >
            {showUsd ? "USD" : "SOL"}
          </button>
        </div>

        <NavButton onClick={goToNext} disabled={isCurrentMonth}>&#8250;</NavButton>
      </div>

      {/* ─── Weekday Headers ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
          padding: "8px 8px 4px",
        }}
      >
        {DAYS_OF_WEEK.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: 10,
              fontWeight: 600,
              color: C.t3,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "0 0 2px",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* ─── Calendar Grid ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
          padding: "0 8px 8px",
        }}
      >
        {gridCells.map((cell, idx) => {
          if (!cell) {
            return <div key={`empty-${idx}`} style={{ minHeight: 48 }} />;
          }

          const entry = dataByDate.get(cell.dateKey);
          const isToday = cell.dateKey === today;
          const hasTrades = entry && entry.trades > 0;
          const pnl = entry?.pnlSol ?? 0;
          const isPositive = pnl >= 0;
          const alpha = hasTrades ? pnlAlpha(pnl, maxAbsPnl) : 0;
          const tintColor = isPositive ? C.g : C.r;

          let bgColor: string = C.bg2;
          if (hasTrades) {
            // Convert hex + alpha to rgba
            const cr = parseInt(tintColor.slice(1, 3), 16);
            const cg = parseInt(tintColor.slice(3, 5), 16);
            const cb = parseInt(tintColor.slice(5, 7), 16);
            bgColor = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
          }

          const displayValue = hasTrades
            ? showUsd
              ? formatUsd(pnl * solPrice)
              : `${pnl >= 0 ? "+" : ""}${formatSol(pnl)}`
            : null;

          return (
            <div
              key={cell.dateKey}
              style={{
                background: bgColor,
                borderRadius: 6,
                padding: "4px 4px 6px",
                minHeight: 48,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                border: isToday ? `1px solid ${C.ac}` : `1px solid transparent`,
                transition: "background 0.15s",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: isToday ? C.t0 : hasTrades ? C.t1 : C.t3,
                  lineHeight: 1,
                }}
              >
                {cell.day}
              </span>
              {displayValue && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "monospace",
                    color: isPositive ? C.g : C.r,
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {displayValue}
                </span>
              )}
              {hasTrades && (
                <span
                  style={{
                    fontSize: 8,
                    color: C.t2,
                    lineHeight: 1,
                  }}
                >
                  {entry.wins}/{entry.trades}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Monthly Summary ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          padding: "0 12px 12px",
        }}
      >
        {/* Total PnL */}
        <div
          style={{
            background: C.bg2,
            border: `1px solid ${C.bd}`,
            borderRadius: 8,
            padding: "8px 10px",
          }}
        >
          <div style={{ fontSize: 9, color: C.t2, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
            Monthly P&L
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "monospace",
              color: summary.totalPnl >= 0 ? C.g : C.r,
            }}
          >
            {summary.totalPnl >= 0 ? "+" : ""}
            {showUsd
              ? formatUsd(summary.totalPnl * solPrice)
              : `${formatSol(summary.totalPnl)} SOL`}
          </div>
        </div>

        {/* Win Rate */}
        <div
          style={{
            background: C.bg2,
            border: `1px solid ${C.bd}`,
            borderRadius: 8,
            padding: "8px 10px",
          }}
        >
          <div style={{ fontSize: 9, color: C.t2, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
            Win Rate
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "monospace",
              color: summary.winRate >= 50 ? C.g : summary.totalTrades > 0 ? C.r : C.t2,
            }}
          >
            {summary.totalTrades > 0 ? `${summary.winRate.toFixed(1)}%` : "--"}
          </div>
        </div>

        {/* Total Trades */}
        <div
          style={{
            background: C.bg2,
            border: `1px solid ${C.bd}`,
            borderRadius: 8,
            padding: "8px 10px",
          }}
        >
          <div style={{ fontSize: 9, color: C.t2, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
            Trades
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "monospace",
              color: summary.totalTrades > 0 ? C.t0 : C.t2,
            }}
          >
            {summary.totalTrades > 0
              ? `${summary.totalTrades} (${summary.totalWins}W)`
              : "--"}
          </div>
        </div>
      </div>
    </div>
  );
}
