"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";

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
  // Filter to closed positions with valid timestamps and P&L
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

  // Start at zero before first trade
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

  // Deduplicate timestamps (lightweight-charts requires unique times)
  const deduped: ChartDataPoint[] = [];
  for (const point of points) {
    const last = deduped[deduped.length - 1];
    if (last && last.time >= point.time) {
      // Same or earlier timestamp - replace with latest value
      last.value = point.value;
    } else {
      deduped.push(point);
    }
  }

  return deduped;
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
        background: { type: ColorType.Solid, color: "#0a0d14" },
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
          labelBackgroundColor: "#10131c",
        },
        horzLine: {
          color: "#5c6380",
          width: 1,
          style: 3,
          labelBackgroundColor: "#10131c",
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

    const lineColor = isPositive ? "#00d672" : "#f23645";
    const topColor = isPositive
      ? "rgba(0, 214, 114, 0.25)"
      : "rgba(242, 54, 69, 0.25)";
    const bottomColor = isPositive
      ? "rgba(0, 214, 114, 0.0)"
      : "rgba(242, 54, 69, 0.0)";

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
      className="w-full h-[200px] md:h-[250px]"
    />
  );
}

export function PortfolioChart() {
  const [data, setData] = useState<ChartDataPoint[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      try {
        const res = await api.raw("/api/positions/history");
        if (res.ok) {
          const json = await res.json();
          const positions: HistoryPosition[] = json.data ?? json;
          if (!cancelled) {
            setData(buildChartData(positions));
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

  if (loading) {
    return <Skeleton className="h-[200px] md:h-[250px] rounded-xl" />;
  }

  if (!data || data.length < 2) {
    return (
      <div className="w-full h-[200px] md:h-[250px] rounded-xl bg-bg-card border border-border flex flex-col items-center justify-center gap-1.5">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className="text-text-faint"
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
        <p className="text-xs text-text-muted">No trade history yet</p>
        <p className="text-[10px] text-text-faint">
          Close some positions to see your P&L chart
        </p>
      </div>
    );
  }

  const lastValue = data[data.length - 1].value;
  const isPositive = lastValue >= 0;

  return (
    <div className="bg-bg-card border border-border rounded-xl p-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Cumulative P&L
        </p>
        <p
          className={`text-sm font-mono font-bold ${
            isPositive ? "text-green" : "text-red"
          }`}
        >
          {isPositive ? "+" : ""}
          {lastValue.toFixed(4)} SOL
        </p>
      </div>
      <AreaChartRenderer data={data} isPositive={isPositive} />
    </div>
  );
}
