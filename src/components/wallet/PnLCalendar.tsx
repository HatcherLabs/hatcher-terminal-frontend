"use client";

import { useState, useMemo } from "react";

interface PnLCalendarProps {
  dailyPnl: Record<string, number>;
}

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Monday = 0, Sunday = 6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to fill last week
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function formatMonth(year: number, month: number): string {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function dateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function getCellStyle(pnl: number | undefined): React.CSSProperties {
  if (pnl === undefined || pnl === 0) {
    return { backgroundColor: "#10131c" };
  }

  if (pnl > 0) {
    if (pnl >= 1) return { backgroundColor: "#00d672" };
    if (pnl >= 0.5) return { backgroundColor: "rgba(0, 214, 114, 0.7)" };
    if (pnl >= 0.1) return { backgroundColor: "rgba(0, 214, 114, 0.45)" };
    if (pnl >= 0.01) return { backgroundColor: "rgba(0, 214, 114, 0.25)" };
    return { backgroundColor: "rgba(0, 214, 114, 0.12)" };
  }

  const absPnl = Math.abs(pnl);
  if (absPnl >= 1) return { backgroundColor: "#f23645" };
  if (absPnl >= 0.5) return { backgroundColor: "rgba(242, 54, 69, 0.7)" };
  if (absPnl >= 0.1) return { backgroundColor: "rgba(242, 54, 69, 0.45)" };
  if (absPnl >= 0.01) return { backgroundColor: "rgba(242, 54, 69, 0.25)" };
  return { backgroundColor: "rgba(242, 54, 69, 0.12)" };
}

function getCellTextColor(pnl: number | undefined): string {
  // On bright cells (high profit/loss), use dark text for readability
  if (pnl === undefined || pnl === 0) return "#5c6380";
  const abs = Math.abs(pnl);
  if (abs >= 0.5) return "#0a0d14";
  return "#9ca3b8";
}

export function PnLCalendar({ dailyPnl }: PnLCalendarProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const cells = useMemo(() => getMonthDays(year, month), [year, month]);
  const weeks = useMemo(() => {
    const result: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      result.push(cells.slice(i, i + 7));
    }
    return result;
  }, [cells]);

  const monthTotal = useMemo(() => {
    let total = 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKey(year, month, d);
      if (dailyPnl[key] !== undefined) total += dailyPnl[key];
    }
    return total;
  }, [year, month, dailyPnl]);

  const goToPrevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };

  const hasAnyData = Object.keys(dailyPnl).length > 0;

  return (
    <div className="space-y-3">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevMonth}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "#5c6380" }}
          aria-label="Previous month"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: "#eef0f6" }}>
            {formatMonth(year, month)}
          </p>
          <p
            className="text-xs font-mono"
            style={{ color: monthTotal >= 0 ? "#00d672" : "#f23645" }}
          >
            {monthTotal >= 0 ? "+" : ""}{monthTotal.toFixed(4)} SOL
          </p>
        </div>
        <button
          onClick={goToNextMonth}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "#5c6380" }}
          aria-label="Next month"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_LABELS.map((label, i) => (
          <div
            key={i}
            className="text-center py-0.5"
            style={{ fontSize: 10, color: "#5c6380" }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) => {
              if (day === null) {
                return (
                  <div
                    key={di}
                    className="aspect-square"
                    style={{ borderRadius: 4 }}
                  />
                );
              }

              const key = dateKey(year, month, day);
              const pnl = dailyPnl[key];
              const cellStyle = getCellStyle(pnl);
              const textColor = getCellTextColor(pnl);

              return (
                <div
                  key={di}
                  className="aspect-square flex items-center justify-center cursor-default group relative"
                  style={{
                    ...cellStyle,
                    borderRadius: 4,
                    transition: "background-color 0.15s ease",
                  }}
                  title={
                    pnl !== undefined
                      ? `${key}: ${pnl >= 0 ? "+" : ""}${pnl.toFixed(4)} SOL`
                      : key
                  }
                >
                  <span
                    className="font-mono"
                    style={{ fontSize: 10, color: textColor }}
                  >
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Empty state hint */}
      {!hasAnyData && (
        <p
          className="text-center py-2"
          style={{ fontSize: 11, color: "#5c6380" }}
        >
          No P&L data for this month
        </p>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 pt-1">
        <span style={{ fontSize: 10, color: "#5c6380" }}>Loss</span>
        <div className="flex gap-0.5">
          <div
            className="w-3 h-3"
            style={{ backgroundColor: "#f23645", borderRadius: 3 }}
          />
          <div
            className="w-3 h-3"
            style={{ backgroundColor: "rgba(242, 54, 69, 0.45)", borderRadius: 3 }}
          />
          <div
            className="w-3 h-3"
            style={{ backgroundColor: "rgba(242, 54, 69, 0.12)", borderRadius: 3 }}
          />
          <div
            className="w-3 h-3"
            style={{ backgroundColor: "#10131c", borderRadius: 3 }}
          />
          <div
            className="w-3 h-3"
            style={{ backgroundColor: "rgba(0, 214, 114, 0.12)", borderRadius: 3 }}
          />
          <div
            className="w-3 h-3"
            style={{ backgroundColor: "rgba(0, 214, 114, 0.45)", borderRadius: 3 }}
          />
          <div
            className="w-3 h-3"
            style={{ backgroundColor: "#00d672", borderRadius: 3 }}
          />
        </div>
        <span style={{ fontSize: 10, color: "#5c6380" }}>Profit</span>
      </div>
    </div>
  );
}
