"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "@/lib/api";

interface CandleData {
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  timestamp: number;
}

interface ChartResponse {
  candles: CandleData[];
  pairAddress?: string;
  dexscreenerPairUrl?: string;
  tooNew?: boolean;
  error?: string;
}

interface MiniChartProps {
  mintAddress: string;
}

const CACHE = new Map<string, { data: ChartResponse; ts: number }>();
const CACHE_TTL = 60_000;

async function fetchChartData(mint: string): Promise<ChartResponse> {
  const cached = CACHE.get(mint);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const res = await api.raw(`/api/tokens/${mint}/chart?limit=30`);
  if (!res.ok) throw new Error("Failed to fetch chart data");
  const json: ChartResponse = await res.json();
  CACHE.set(mint, { data: json, ts: Date.now() });
  return json;
}

function MiniAreaChart({ candles }: { candles: CandleData[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);

  const initChart = useCallback(async () => {
    if (!containerRef.current) return;

    const { createChart, AreaSeries, ColorType } = await import(
      "lightweight-charts"
    );

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const closes = candles.map((c) => c.close);
    const isUp = closes[closes.length - 1] >= closes[0];
    const lineColor = isUp ? "#00ff88" : "#ff4466";
    const topColor = isUp
      ? "rgba(0, 255, 136, 0.25)"
      : "rgba(255, 68, 102, 0.25)";
    const bottomColor = isUp
      ? "rgba(0, 255, 136, 0.02)"
      : "rgba(255, 68, 102, 0.02)";

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 60,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "transparent",
        fontSize: 0,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      crosshair: {
        vertLine: { visible: false, labelVisible: false },
        horzLine: { visible: false, labelVisible: false },
      },
      rightPriceScale: {
        visible: false,
      },
      timeScale: {
        visible: false,
      },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor,
      topColor,
      bottomColor,
      lineWidth: 2,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const chartData = candles.map((c) => ({
      time: c.timestamp as import("lightweight-charts").UTCTimestamp,
      value: c.close,
    }));

    areaSeries.setData(chartData);
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0 && chartRef.current) {
          chartRef.current.applyOptions({ width });
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    (containerRef.current as HTMLDivElement & { _resizeObserver?: ResizeObserver })._resizeObserver =
      resizeObserver;
  }, [candles]);

  useEffect(() => {
    const container = containerRef.current;
    initChart();

    return () => {
      if (container) {
        const obs = (container as HTMLDivElement & { _resizeObserver?: ResizeObserver })._resizeObserver;
        if (obs) {
          obs.disconnect();
        }
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [initChart]);

  return <div ref={containerRef} className="w-full h-[60px]" />;
}

export function MiniChart({ mintAddress }: MiniChartProps) {
  const [chartData, setChartData] = useState<ChartResponse | null>(null);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setChartData(null);
    setError(false);

    fetchChartData(mintAddress)
      .then((data) => {
        if (mountedRef.current) setChartData(data);
      })
      .catch(() => {
        if (mountedRef.current) setError(true);
      });

    return () => {
      mountedRef.current = false;
    };
  }, [mintAddress]);

  if (error || (chartData !== null && chartData.candles.length < 2)) {
    return (
      <div className="w-full h-[60px] flex items-center justify-center">
        <span className="text-[10px] text-text-faint font-mono">
          No chart
        </span>
      </div>
    );
  }

  if (chartData === null) {
    return (
      <div className="w-full h-[60px] rounded-lg bg-bg-elevated animate-pulse" />
    );
  }

  return <MiniAreaChart candles={chartData.candles} />;
}
