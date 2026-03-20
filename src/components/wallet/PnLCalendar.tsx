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

function getCellColor(pnl: number | undefined): string {
  if (pnl === undefined || pnl === 0) return "bg-bg-elevated";

  if (pnl > 0) {
    if (pnl >= 1) return "bg-[#00ff88]";
    if (pnl >= 0.5) return "bg-[#00ff88]/80";
    if (pnl >= 0.1) return "bg-[#00ff88]/50";
    if (pnl >= 0.01) return "bg-[#00ff88]/30";
    return "bg-[#00ff88]/15";
  }

  const absPnl = Math.abs(pnl);
  if (absPnl >= 1) return "bg-[#ff3b5c]";
  if (absPnl >= 0.5) return "bg-[#ff3b5c]/80";
  if (absPnl >= 0.1) return "bg-[#ff3b5c]/50";
  if (absPnl >= 0.01) return "bg-[#ff3b5c]/30";
  return "bg-[#ff3b5c]/15";
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

  return (
    <div className="space-y-3">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevMonth}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors"
          aria-label="Previous month"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-sm font-medium text-text-primary">{formatMonth(year, month)}</p>
          <p className={`text-xs font-mono ${monthTotal >= 0 ? "text-green" : "text-red"}`}>
            {monthTotal >= 0 ? "+" : ""}{monthTotal.toFixed(4)} SOL
          </p>
        </div>
        <button
          onClick={goToNextMonth}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors"
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
          <div key={i} className="text-center text-[10px] text-text-muted py-0.5">
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
                return <div key={di} className="aspect-square rounded-sm" />;
              }

              const key = dateKey(year, month, day);
              const pnl = dailyPnl[key];
              const colorClass = getCellColor(pnl);

              return (
                <div
                  key={di}
                  className={`aspect-square rounded-sm ${colorClass} flex items-center justify-center cursor-default group relative`}
                  title={
                    pnl !== undefined
                      ? `${key}: ${pnl >= 0 ? "+" : ""}${pnl.toFixed(4)} SOL`
                      : key
                  }
                >
                  <span className="text-[10px] font-mono text-text-muted group-hover:text-text-secondary transition-colors">
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 pt-1">
        <span className="text-[10px] text-text-muted">Loss</span>
        <div className="flex gap-0.5">
          <div className="w-3 h-3 rounded-sm bg-[#ff3b5c]" />
          <div className="w-3 h-3 rounded-sm bg-[#ff3b5c]/50" />
          <div className="w-3 h-3 rounded-sm bg-[#ff3b5c]/15" />
          <div className="w-3 h-3 rounded-sm bg-bg-elevated" />
          <div className="w-3 h-3 rounded-sm bg-[#00ff88]/15" />
          <div className="w-3 h-3 rounded-sm bg-[#00ff88]/50" />
          <div className="w-3 h-3 rounded-sm bg-[#00ff88]" />
        </div>
        <span className="text-[10px] text-text-muted">Profit</span>
      </div>
    </div>
  );
}
