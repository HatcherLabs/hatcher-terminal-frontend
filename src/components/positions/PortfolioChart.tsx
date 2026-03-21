"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";

type TimeRange = "1D" | "7D" | "30D" | "ALL";

interface HistoryPosition {
  id: string;
  entrySol: number;
  exitSol: number | null;
  pnlSol: number | null;
  entryTimestamp: string;
  exitTimestamp: string | null;
  status: string;
}

interface ChartDataPoint {
  time: number;
  value: number;
}

function buildChartData(positions: HistoryPosition[]): ChartDataPoint[] {
  const closed = positions
    .filter(
      (p) =>
        p.status === "closed" &&
        p.exitTimestamp &&
        p.pnlSol !== null
    )
    .sort(
      (a, b) =>
        new Date(a.exitTimestamp!).getTime() -
        new Date(b.exitTimestamp!).getTime()
    );

  if (closed.length === 0) return [];

  let cumPnl = 0;
  const points: ChartDataPoint[] = [];

  const firstTime = Math.floor(
    new Date(closed[0].exitTimestamp!).getTime() / 1000
  );
  points.push({ time: firstTime - 86400, value: 0 });

  for (const pos of closed) {
    cumPnl += pos.pnlSol!;
    const time = Math.floor(
      new Date(pos.exitTimestamp!).getTime() / 1000
    );
    points.push({ time, value: parseFloat(cumPnl.toFixed(6)) });
  }

  const deduped: ChartDataPoint[] = [];
  for (const point of points) {
    const last = deduped[deduped.length - 1];
    if (last && last.time >= point.time) {
      last.value = point.value;
    } else {
      deduped.push(point);
    }
  }

  return deduped;
}

function filterByRange(data: ChartDataPoint[], range: TimeRange): ChartDataPoint[] {
  if (range === "ALL" || data.length === 0) return data;

  const now = Math.floor(Date.now() / 1000);
  const rangeSecs: Record<Exclude<TimeRange, "ALL">, number> = {
    "1D": 86400,
    "7D": 7 * 86400,
    "30D": 30 * 86400,
  };

  const cutoff = now - rangeSecs[range];
  const filtered = data.filter((d) => d.time >= cutoff);

  // If we filtered everything out, show at least 2 points
  if (filtered.length < 2) {
    // Find value just before cutoff for baseline
    let baseValue = 0;
    for (const d of data) {
      if (d.time < cutoff) baseValue = d.value;
      else break;
    }
    return [{ time: cutoff, value: baseValue }, ...data.filter((d) => d.time >= cutoff)];
  }

  return filtered;
}

function AreaChartRenderer({
  data,
  isPositive,
}: {
  data: ChartDataPoint[];
  isPositive: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<
    typeof import("lightweight-charts").createChart
  > | null>(null);

  const initChart = useCallback(async () => {
    if (!containerRef.current || data.length < 2) return;

    const { createChart, AreaSeries, ColorType } = await import(
      "lightweight-charts"
    );

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const el = containerRef.current;
    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: "#0d1017" },
        textColor: "#5c6380",
        fontFamily: "var(--font-jetbrains-mono), monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "rgba(26, 31, 46, 0.5)" },
      },
      crosshair: {
        vertLine: {
          color: "#5c6380",
          width: 1,
          style: 3,
          labelBackgroundColor: "#141820",
        },
        horzLine: {
          color: "#5c6380",
          width: 1,
          style: 3,
          labelBackgroundColor: "#141820",
        },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: false,
      },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    const lineColor = isPositive ? "#22c55e" : "#ef4444";
    const topColor = isPositive
      ? "rgba(34, 197, 94, 0.25)"
      : "rgba(239, 68, 68, 0.25)";
    const bottomColor = isPositive
      ? "rgba(34, 197, 94, 0.0)"
      : "rgba(239, 68, 68, 0.0)";

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor,
      topColor,
      bottomColor,
      lineWidth: 2,
      crosshairMarkerRadius: 4,
      crosshairMarkerBackgroundColor: lineColor,
    });

    areaSeries.setData(
      data.map((d) => ({
        time: d.time as import("lightweight-charts").UTCTimestamp,
        value: d.value,
      }))
    );

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0 && chartRef.current) {
          chartRef.current.applyOptions({ width });
        }
      }
    });

    resizeObserver.observe(el);
    (el as HTMLDivElement & { _ro?: ResizeObserver })._ro = resizeObserver;
  }, [data, isPositive]);

  useEffect(() => {
    const el = containerRef.current;
    initChart();

    return () => {
      if (el) {
        const obs = (el as HTMLDivElement & { _ro?: ResizeObserver })._ro;
        if (obs) obs.disconnect();
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [initChart]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[180px] md:h-[220px]"
    />
  );
}

const TIME_RANGES: TimeRange[] = ["1D", "7D", "30D", "ALL"];

export function PortfolioChart() {
  const [allData, setAllData] = useState<ChartDataPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>("ALL");

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      try {
        const res = await api.raw("/api/positions/history");
        if (res.ok) {
          const json = await res.json();
          const positions: HistoryPosition[] = json.data ?? json;
          if (!cancelled) {
            setAllData(buildChartData(positions));
          }
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredData = useMemo(() => {
    if (!allData) return null;
    return filterByRange(allData, range);
  }, [allData, range]);

  if (loading) {
    return <Skeleton className="h-[240px] md:h-[280px] rounded-lg" />;
  }

  if (!allData || allData.length < 2) {
    return (
      <div
        className="w-full h-[180px] md:h-[220px] flex flex-col items-center justify-center gap-1.5"
        style={{
          background: "#0d1017",
          border: "1px solid rgba(34,197,94,0.08)",
          borderRadius: 8,
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          style={{ color: "#444c60" }}
        >
          <path
            d="M3 17L9 11L13 15L21 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17 7H21V11"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-xs" style={{ color: "#5c6380" }}>No trade history yet</p>
        <p className="text-[10px]" style={{ color: "#444c60" }}>
          Close some positions to see your P&amp;L chart
        </p>
      </div>
    );
  }

  const displayData = filteredData && filteredData.length >= 2 ? filteredData : allData;
  const lastValue = displayData[displayData.length - 1].value;
  const firstValue = displayData[0].value;
  const periodChange = lastValue - firstValue;
  const isPositive = lastValue >= 0;
  const periodPositive = periodChange >= 0;

  return (
    <div
      style={{
        background: "#0d1017",
        border: "1px solid rgba(34,197,94,0.08)",
        borderRadius: 8,
      }}
      className="p-3"
    >
      {/* Header with title, value, and range selector */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <p
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: "#5c6380" }}
          >
            Cumulative P&amp;L
          </p>
          <p
            className="font-mono text-sm font-bold"
            style={{ color: isPositive ? "#22c55e" : "#ef4444" }}
          >
            {isPositive ? "+" : ""}
            {lastValue.toFixed(4)} SOL
          </p>
          {range !== "ALL" && (
            <span
              className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{
                background: periodPositive
                  ? "rgba(34, 197, 94, 0.12)"
                  : "rgba(239, 68, 68, 0.12)",
                color: periodPositive ? "#22c55e" : "#ef4444",
              }}
            >
              {periodPositive ? "+" : ""}{periodChange.toFixed(4)}
            </span>
          )}
        </div>

        {/* Time range selector */}
        <div className="flex items-center gap-0.5" style={{ background: "#141820", borderRadius: 6, padding: 2 }}>
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-2 py-1 text-[10px] font-mono font-medium rounded transition-colors"
              style={{
                background: range === r ? "rgba(34,197,94,0.08)" : "transparent",
                color: range === r ? "#f0f2f7" : "#5c6380",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <AreaChartRenderer data={displayData} isPositive={isPositive} />
    </div>
  );
}
