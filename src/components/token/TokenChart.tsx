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

interface TokenChartProps {
  mintAddress: string;
  height?: number;
}

const CACHE = new Map<string, { data: ChartResponse; ts: number }>();
const CACHE_TTL = 60_000;

async function fetchChartData(mint: string): Promise<ChartResponse> {
  const cached = CACHE.get(mint);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const res = await api.raw(`/api/tokens/${mint}/chart?limit=60`);
  if (!res.ok) throw new Error("Failed to fetch chart data");
  const json: ChartResponse = await res.json();
  CACHE.set(mint, { data: json, ts: Date.now() });
  return json;
}

function ChartPlaceholder({
  icon,
  title,
  subtitle,
  height = 200,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  height?: number;
}) {
  return (
    <div className="w-full rounded-xl bg-bg-elevated border border-border flex flex-col items-center justify-center gap-1.5" style={{ height }}>
      {icon || (
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
      )}
      <p className="text-xs text-text-muted">{title}</p>
      {subtitle && (
        <p className="text-[10px] text-text-faint">{subtitle}</p>
      )}
    </div>
  );
}

function TradingViewChart({ candles, height = 200 }: { candles: CandleData[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);

  const initChart = useCallback(async () => {
    if (!containerRef.current) return;

    const { createChart, CandlestickSeries, ColorType } = await import(
      "lightweight-charts"
    );

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#888888",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        vertLine: {
          color: "rgba(255,255,255,0.2)",
          labelBackgroundColor: "#1a1a2e",
        },
        horzLine: {
          color: "rgba(255,255,255,0.2)",
          labelBackgroundColor: "#1a1a2e",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#00ff88",
      downColor: "#ff4466",
      borderVisible: false,
      wickUpColor: "#00ff88",
      wickDownColor: "#ff4466",
    });

    const chartData = candles.map((c) => ({
      time: c.timestamp as import("lightweight-charts").UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candlestickSeries.setData(chartData);
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
  }, [candles, height]);

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

  return (
    <div className="bg-bg-elevated rounded-xl p-3 border border-border">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-text-secondary font-medium">Price</p>
        <p className="text-[10px] text-text-muted font-mono">5m candles</p>
      </div>
      <div ref={containerRef} className="w-full" style={{ height }} />
    </div>
  );
}

function DexScreenerEmbed({ pairAddress, height = 200 }: { pairAddress: string; height?: number }) {
  return (
    <div className="bg-bg-elevated rounded-xl overflow-hidden border border-border">
      <div className="flex items-center justify-between px-3 pt-3 mb-1.5">
        <p className="text-xs text-text-secondary font-medium">Price</p>
        <p className="text-[10px] text-text-muted font-mono">DexScreener</p>
      </div>
      <iframe
        src={`https://dexscreener.com/solana/${pairAddress}?embed=1&theme=dark&trades=0&info=0`}
        className="w-full border-0"
        style={{ height }}
        title="DexScreener chart"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}

export function TokenChart({ mintAddress, height = 200 }: TokenChartProps) {
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

  if (!error && chartData === null) {
    return (
      <div className="w-full rounded-xl bg-bg-elevated animate-pulse" style={{ height }} />
    );
  }

  if (error) {
    return (
      <ChartPlaceholder
        title="Chart unavailable"
        subtitle="Try again later"
        height={height}
      />
    );
  }

  if (chartData?.tooNew) {
    return (
      <ChartPlaceholder
        title="Chart available after ~2 min"
        subtitle="Token was just created"
        height={height}
      />
    );
  }

  if (chartData && chartData.candles.length >= 2) {
    return <TradingViewChart candles={chartData.candles} height={height} />;
  }

  if (chartData?.pairAddress) {
    return <DexScreenerEmbed pairAddress={chartData.pairAddress} height={height} />;
  }

  return (
    <ChartPlaceholder
      title="Chart data loading..."
      subtitle="Data appears after first trades"
      height={height}
    />
  );
}
