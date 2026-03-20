"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { useLiveCandles } from "@/hooks/useLiveCandles";

// ---- Chart Theme Constants ----
const CHART_THEME = {
  background: "#04060b",
  gridColor: "#1a1f2e",
  upColor: "#00d672",
  downColor: "#f23645",
  crosshairColor: "#5c6380",
  textColor: "#5c6380",
  labelBg: "#0a0d14",
  borderColor: "#1a1f2e",
  volumeUpColor: "rgba(0, 214, 114, 0.2)",
  volumeDownColor: "rgba(242, 54, 69, 0.2)",
  priceLineColor: "#5c6380",
} as const;

// ---- Timeframe Config ----
type Timeframe = "1m" | "5m" | "15m" | "1H" | "4H" | "1D" | "1W";

interface TimeframeConfig {
  label: string;
  interval: string;
  limit: number;
  secondsVisible: boolean;
}

const TIMEFRAMES: Record<Timeframe, TimeframeConfig> = {
  "1m": { label: "1m", interval: "1m", limit: 120, secondsVisible: true },
  "5m": { label: "5m", interval: "5m", limit: 120, secondsVisible: false },
  "15m": { label: "15m", interval: "15m", limit: 96, secondsVisible: false },
  "1H": { label: "1H", interval: "1h", limit: 72, secondsVisible: false },
  "4H": { label: "4H", interval: "4h", limit: 60, secondsVisible: false },
  "1D": { label: "1D", interval: "1d", limit: 90, secondsVisible: false },
  "1W": { label: "1W", interval: "1w", limit: 52, secondsVisible: false },
};

const TIMEFRAME_KEYS: Timeframe[] = ["1m", "5m", "15m", "1H", "4H", "1D", "1W"];

/** Whether an interval is served by our local candle builder (real-time capable) */
const LOCAL_INTERVALS = new Set(["1m", "5m", "15m", "1h"]);

// ---- Interfaces ----
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

// ---- OHLCV Hover Data ----
interface OHLCVData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
}

// ---- Cache ----
const CACHE = new Map<string, { data: ChartResponse; ts: number }>();
const CACHE_TTL = 60_000;

function cacheKey(mint: string, interval: string, limit: number) {
  return `${mint}:${interval}:${limit}`;
}

async function fetchChartData(
  mint: string,
  interval: string,
  limit: number
): Promise<ChartResponse> {
  const key = cacheKey(mint, interval, limit);
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  // Try local candles endpoint first for supported intervals
  if (LOCAL_INTERVALS.has(interval)) {
    try {
      const candlesRes = await api.raw(
        `/api/tokens/${mint}/candles?interval=${interval}&limit=${limit}`
      );
      if (candlesRes.ok) {
        const json: ChartResponse = await candlesRes.json();
        if (json.candles && json.candles.length >= 2) {
          CACHE.set(key, { data: json, ts: Date.now() });
          return json;
        }
      }
    } catch {
      // Fall through to legacy endpoint
    }
  }

  const res = await api.raw(
    `/api/tokens/${mint}/chart?interval=${interval}&limit=${limit}`
  );
  if (!res.ok) throw new Error("Failed to fetch chart data");
  const json: ChartResponse = await res.json();
  CACHE.set(key, { data: json, ts: Date.now() });
  return json;
}

// ---- Helpers ----
function detectPricePrecision(price: number): number {
  if (price === 0) return 8;
  if (price < 0.00000001) return 12;
  if (price < 0.000001) return 10;
  if (price < 0.0001) return 8;
  if (price < 0.01) return 6;
  if (price < 1) return 4;
  if (price < 100) return 2;
  return 0;
}

function formatPriceCompact(price: number): string {
  const precision = detectPricePrecision(price);
  if (price < 0.0001) {
    return price.toExponential(2);
  }
  return price.toFixed(precision);
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(2) + "M";
  if (vol >= 1_000) return (vol / 1_000).toFixed(2) + "K";
  return vol.toFixed(2);
}

// ---- Loading Skeleton ----
function ChartSkeleton({ height }: { height: number }) {
  return (
    <div
      className="w-full rounded-lg overflow-hidden"
      style={{ height, background: "#04060b" }}
    >
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-6 rounded animate-pulse"
            style={{
              width: 32 + Math.random() * 8,
              background: "#1a1f2e",
            }}
          />
        ))}
      </div>
      {/* Chart area skeleton */}
      <div className="px-3 pb-3" style={{ height: height - 48 }}>
        <div
          className="w-full h-full rounded animate-pulse relative overflow-hidden"
          style={{ background: "#0a0d14" }}
        >
          {/* Fake candle bars */}
          <div className="absolute inset-0 flex items-end justify-around px-4 pb-8 gap-1">
            {Array.from({ length: 24 }).map((_, i) => {
              const h = 20 + Math.random() * 50;
              const isUp = Math.random() > 0.45;
              return (
                <div
                  key={i}
                  className="rounded-sm animate-pulse"
                  style={{
                    width: 4,
                    height: `${h}%`,
                    background: isUp
                      ? "rgba(0, 214, 114, 0.15)"
                      : "rgba(242, 54, 69, 0.15)",
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              );
            })}
          </div>
          {/* Shimmer overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(26, 31, 46, 0.15) 50%, transparent 100%)",
              animation: "shimmer 2s ease-in-out infinite",
            }}
          />
        </div>
      </div>
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

// ---- Error State ----
function ChartError({ height }: { height: number }) {
  return (
    <div
      className="w-full rounded-lg flex flex-col items-center justify-center gap-2"
      style={{ height, background: "#04060b" }}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        style={{ color: "#5c6380" }}
      >
        <path
          d="M3 17L9 11L13 15L21 7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="4 4"
        />
        <circle cx="21" cy="7" r="1.5" fill="currentColor" opacity="0.5" />
      </svg>
      <p
        className="font-mono text-xs"
        style={{ color: "#5c6380" }}
      >
        Chart data unavailable
      </p>
      <p
        className="font-mono"
        style={{ color: "#363d54", fontSize: 10 }}
      >
        Try again later or switch timeframe
      </p>
    </div>
  );
}

// ---- OHLCV Tooltip Overlay ----
function OHLCVOverlay({ data }: { data: OHLCVData | null }) {
  if (!data) return null;

  const isUp = data.close >= data.open;
  const changePercent =
    data.open !== 0 ? ((data.close - data.open) / data.open) * 100 : 0;

  return (
    <div
      className="absolute top-1.5 left-2 z-10 flex items-center gap-3 pointer-events-none select-none font-mono"
      style={{ fontSize: 10 }}
    >
      <span style={{ color: "#5c6380" }}>
        O{" "}
        <span style={{ color: isUp ? "#00d672" : "#f23645" }}>
          {formatPriceCompact(data.open)}
        </span>
      </span>
      <span style={{ color: "#5c6380" }}>
        H{" "}
        <span style={{ color: isUp ? "#00d672" : "#f23645" }}>
          {formatPriceCompact(data.high)}
        </span>
      </span>
      <span style={{ color: "#5c6380" }}>
        L{" "}
        <span style={{ color: isUp ? "#00d672" : "#f23645" }}>
          {formatPriceCompact(data.low)}
        </span>
      </span>
      <span style={{ color: "#5c6380" }}>
        C{" "}
        <span style={{ color: isUp ? "#00d672" : "#f23645" }}>
          {formatPriceCompact(data.close)}
        </span>
      </span>
      <span style={{ color: "#5c6380" }}>
        V{" "}
        <span style={{ color: "#9ca3b8" }}>
          {formatVolume(data.volume)}
        </span>
      </span>
      <span
        className="font-semibold"
        style={{ color: isUp ? "#00d672" : "#f23645" }}
      >
        {changePercent > 0 ? "+" : ""}
        {changePercent.toFixed(2)}%
      </span>
    </div>
  );
}

// ---- Time Range Selector ----
function TimeRangeSelector({
  active,
  onChange,
}: {
  active: Timeframe;
  onChange: (tf: Timeframe) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {TIMEFRAME_KEYS.map((tf) => {
        const isActive = active === tf;
        return (
          <button
            key={tf}
            onClick={() => onChange(tf)}
            className="relative font-mono font-bold transition-all duration-150"
            style={{
              padding: "4px 8px",
              fontSize: 11,
              borderRadius: 4,
              color: isActive ? "#00d672" : "#5c6380",
              background: isActive ? "rgba(0, 214, 114, 0.08)" : "transparent",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "#9ca3b8";
                e.currentTarget.style.background = "rgba(92, 99, 128, 0.08)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "#5c6380";
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            {TIMEFRAMES[tf].label}
            {isActive && (
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2"
                style={{
                  width: 12,
                  height: 1.5,
                  borderRadius: 1,
                  background: "#00d672",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---- Series Refs for live updates ----
interface SeriesRefs {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  candlestickSeries: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  volumeSeries: any;
}

// ---- Candlestick Chart ----
function CandlestickChart({
  candles,
  height,
  timeframe,
  onCrosshairMove,
  onSeriesReady,
}: {
  candles: CandleData[];
  height: number;
  timeframe: Timeframe;
  onCrosshairMove: (data: OHLCVData | null) => void;
  onSeriesReady?: (refs: SeriesRefs) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<
    typeof import("lightweight-charts").createChart
  > | null>(null);

  const tfConfig = TIMEFRAMES[timeframe];

  const initChart = useCallback(async () => {
    if (!containerRef.current) return;

    const {
      createChart,
      CandlestickSeries,
      HistogramSeries,
      ColorType,
      CrosshairMode,
      LineStyle,
    } = await import("lightweight-charts");

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const medianPrice =
      candles.length > 0
        ? candles[Math.floor(candles.length / 2)].close
        : 0.001;
    const pricePrecision = detectPricePrecision(medianPrice);

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: CHART_THEME.background },
        textColor: CHART_THEME.textColor,
        fontFamily: "var(--font-jetbrains-mono), monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: CHART_THEME.gridColor, style: LineStyle.Dotted },
        horzLines: { color: CHART_THEME.gridColor, style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: CHART_THEME.crosshairColor,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: CHART_THEME.labelBg,
        },
        horzLine: {
          color: CHART_THEME.crosshairColor,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: CHART_THEME.labelBg,
        },
      },
      rightPriceScale: {
        borderColor: CHART_THEME.borderColor,
        scaleMargins: {
          top: 0.08,
          bottom: 0.22,
        },
        borderVisible: false,
      },
      timeScale: {
        borderColor: CHART_THEME.borderColor,
        timeVisible: true,
        secondsVisible: tfConfig.secondsVisible,
        borderVisible: false,
      },
      localization: {
        priceFormatter: (price: number) => {
          if (price < 0.0001) return price.toExponential(2);
          return price.toFixed(pricePrecision);
        },
      },
    });

    chartRef.current = chart;

    // Candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: CHART_THEME.upColor,
      downColor: CHART_THEME.downColor,
      borderVisible: false,
      wickUpColor: CHART_THEME.upColor,
      wickDownColor: CHART_THEME.downColor,
    });

    const candleChartData = candles.map((c) => ({
      time: c.timestamp as import("lightweight-charts").UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candlestickSeries.setData(candleChartData);

    // Current price line (dashed)
    const lastCandle = candles[candles.length - 1];
    if (lastCandle) {
      const isUp = lastCandle.close >= lastCandle.open;
      candlestickSeries.createPriceLine({
        price: lastCandle.close,
        color: isUp ? "#00d672" : "#f23645",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "",
        lineVisible: true,
      });
    }

    // Volume histogram
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" as const },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0,
      },
    });

    const volumeData = candles.map((c) => ({
      time: c.timestamp as import("lightweight-charts").UTCTimestamp,
      value: c.volume > 0 ? c.volume : Math.abs(c.close - c.open) * 1000,
      color:
        c.close >= c.open
          ? CHART_THEME.volumeUpColor
          : CHART_THEME.volumeDownColor,
    }));

    volumeSeries.setData(volumeData);

    // Expose series refs for live updates
    if (onSeriesReady) {
      onSeriesReady({ candlestickSeries, volumeSeries });
    }

    // Crosshair move handler for OHLCV tooltip
    const candleMap = new Map<number, CandleData>();
    for (const c of candles) {
      candleMap.set(c.timestamp, c);
    }

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        onCrosshairMove(null);
        return;
      }
      const candle = candleMap.get(param.time as number);
      if (candle) {
        onCrosshairMove({
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          time: candle.timestamp,
        });
      }
    });

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
  }, [candles, height, tfConfig.secondsVisible, onCrosshairMove, onSeriesReady]);

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

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}

// ---- Main TokenChart Component ----
export function TokenChart({ mintAddress, height }: TokenChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [chartData, setChartData] = useState<ChartResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hoverData, setHoverData] = useState<OHLCVData | null>(null);
  const mountedRef = useRef(true);
  const seriesRefsRef = useRef<SeriesRefs | null>(null);

  const handleCrosshairMove = useCallback((data: OHLCVData | null) => {
    setHoverData(data);
  }, []);

  const handleSeriesReady = useCallback((refs: SeriesRefs) => {
    seriesRefsRef.current = refs;
  }, []);

  // Live candle updates via WebSocket (only for local intervals)
  const tfConfig = TIMEFRAMES[timeframe];
  const isLiveCapable = LOCAL_INTERVALS.has(tfConfig.interval);
  const { lastCandle } = useLiveCandles({
    mintAddress,
    interval: tfConfig.interval,
    enabled: isLiveCapable,
  });

  // Apply live candle updates to the chart series
  useEffect(() => {
    if (!lastCandle || !seriesRefsRef.current) return;

    const { candlestickSeries, volumeSeries } = seriesRefsRef.current;
    const time = lastCandle.t as import("lightweight-charts").UTCTimestamp;

    try {
      candlestickSeries.update({
        time,
        open: lastCandle.o,
        high: lastCandle.h,
        low: lastCandle.l,
        close: lastCandle.c,
      });

      const isUp = lastCandle.c >= lastCandle.o;
      volumeSeries.update({
        time,
        value: lastCandle.v,
        color: isUp
          ? CHART_THEME.volumeUpColor
          : CHART_THEME.volumeDownColor,
      });

      // Update OHLCV overlay with live data when not hovering
      if (!hoverData) {
        setHoverData(null); // triggers defaultOHLCV recalc on next render
      }
    } catch {
      // Series may have been disposed
    }
  }, [lastCandle, hoverData]);

  // Responsive height: mobile 200px min, desktop 300px min (or prop override)
  const [responsiveHeight, setResponsiveHeight] = useState(height ?? 380);

  useEffect(() => {
    if (height != null) return;
    function handleResize() {
      setResponsiveHeight(window.innerWidth < 768 ? 240 : 380);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [height]);

  // Fetch data on mint or timeframe change
  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setError(false);

    const tf = TIMEFRAMES[timeframe];
    fetchChartData(mintAddress, tf.interval, tf.limit)
      .then((data) => {
        if (mountedRef.current) {
          setChartData(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      mountedRef.current = false;
    };
  }, [mintAddress, timeframe]);

  // Default OHLCV from latest candle when not hovering
  const defaultOHLCV = useMemo<OHLCVData | null>(() => {
    if (!chartData?.candles?.length) return null;
    const last = chartData.candles[chartData.candles.length - 1];
    return {
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
      volume: last.volume,
      time: last.timestamp,
    };
  }, [chartData]);

  const hasCandles = chartData && chartData.candles.length >= 2;

  // Loading skeleton
  if (loading && chartData === null) {
    return <ChartSkeleton height={responsiveHeight + 40} />;
  }

  // Error state
  if (error) {
    return <ChartError height={responsiveHeight + 40} />;
  }

  // Too new
  if (chartData?.tooNew) {
    return (
      <div
        className="w-full rounded-lg flex flex-col items-center justify-center gap-1.5"
        style={{ height: responsiveHeight + 40, background: "#04060b" }}
      >
        <div
          className="w-5 h-5 rounded-full border-2 animate-spin"
          style={{ borderColor: "#1a1f2e", borderTopColor: "#5c6380" }}
        />
        <p className="font-mono text-xs" style={{ color: "#5c6380" }}>
          Chart available after ~2 min
        </p>
        <p className="font-mono" style={{ color: "#363d54", fontSize: 10 }}>
          Token was just created
        </p>
      </div>
    );
  }

  // No data
  if (!hasCandles) {
    return <ChartError height={responsiveHeight + 40} />;
  }

  return (
    <div
      className="w-full rounded-lg overflow-hidden"
      style={{
        background: "#04060b",
        minHeight: 200,
      }}
    >
      {/* Toolbar: time range selector + loading indicator */}
      <div className="flex items-center justify-between px-2 pt-2 pb-0.5">
        <TimeRangeSelector active={timeframe} onChange={setTimeframe} />
        <div className="flex items-center gap-2">
          {loading && (
            <div
              className="w-3 h-3 rounded-full border animate-spin"
              style={{ borderColor: "#1a1f2e", borderTopColor: "#5c6380" }}
            />
          )}
          {isLiveCapable && (
            <span
              className="flex items-center gap-1 font-mono"
              style={{ fontSize: 9, color: "#00d672" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "#00d672" }}
              />
              LIVE
            </span>
          )}
          <span
            className="font-mono"
            style={{ fontSize: 10, color: "#363d54" }}
          >
            {TIMEFRAMES[timeframe].label}
          </span>
        </div>
      </div>

      {/* OHLCV overlay */}
      <div className="relative">
        <OHLCVOverlay data={hoverData ?? defaultOHLCV} />

        {/* Chart */}
        <div className="pt-4">
          <CandlestickChart
            candles={chartData!.candles}
            height={responsiveHeight}
            timeframe={timeframe}
            onCrosshairMove={handleCrosshairMove}
            onSeriesReady={handleSeriesReady}
          />
        </div>
      </div>
    </div>
  );
}
