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
  const key = `mini:${mint}`;
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const res = await api.raw(`/api/tokens/${mint}/chart?limit=30`);
  if (!res.ok) throw new Error("Failed to fetch chart data");
  const json: ChartResponse = await res.json();
  CACHE.set(key, { data: json, ts: Date.now() });
  return json;
}

function MiniAreaChart({ candles }: { candles: CandleData[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<
    typeof import("lightweight-charts").createChart
  > | null>(null);

  const initChart = useCallback(async () => {
    if (!containerRef.current) return;

    const { createChart, AreaSeries, LineSeries, ColorType } = await import(
      "lightweight-charts"
    );

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const closes = candles.map((c) => c.close);
    const openPrice = candles[0].open;
    const currentPrice = closes[closes.length - 1];
    const isUp = currentPrice >= openPrice;
    const lineColor = isUp ? "#00d672" : "#f23645";
    const topColor = isUp
      ? "rgba(0, 214, 114, 0.20)"
      : "rgba(242, 54, 69, 0.20)";
    const bottomColor = isUp
      ? "rgba(0, 214, 114, 0.01)"
      : "rgba(242, 54, 69, 0.01)";

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 48,
      layout: {
        background: { type: ColorType.Solid, color: "#0a0d14" },
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

    // Baseline: thin horizontal line at open price
    const baselineSeries = chart.addSeries(LineSeries, {
      color: "rgba(156, 163, 184, 0.25)",
      lineWidth: 1,
      lineStyle: 2, // Dashed
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
      pointMarkersVisible: false,
    });

    const baselineData = [
      {
        time: candles[0].timestamp as import("lightweight-charts").UTCTimestamp,
        value: openPrice,
      },
      {
        time: candles[candles.length - 1]
          .timestamp as import("lightweight-charts").UTCTimestamp,
        value: openPrice,
      },
    ];
    baselineSeries.setData(baselineData);

    // Main area series with smooth interpolation
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

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0 && chartRef.current) {
          chartRef.current.applyOptions({ width });
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    (
      containerRef.current as HTMLDivElement & {
        _resizeObserver?: ResizeObserver;
      }
    )._resizeObserver = resizeObserver;
  }, [candles]);

  useEffect(() => {
    const container = containerRef.current;
    initChart();

    return () => {
      if (container) {
        const obs = (
          container as HTMLDivElement & { _resizeObserver?: ResizeObserver }
        )._resizeObserver;
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

  return <div ref={containerRef} className="w-full h-[48px]" />;
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
      <div className="w-full h-[48px] flex items-center justify-center">
        <span className="text-[10px] text-text-faint font-mono">
          No chart
        </span>
      </div>
    );
  }

  if (chartData === null) {
    return (
      <div className="w-full h-[48px] rounded-lg bg-bg-elevated animate-pulse" />
    );
  }

  return <MiniAreaChart candles={chartData.candles} />;
}
