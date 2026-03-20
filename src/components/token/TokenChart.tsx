"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { api } from "@/lib/api";

// ---- Chart Theme Constants ----
const CHART_THEME = {
  background: "transparent",
  gridColor: "#1a1a2e",
  upColor: "#00ff88",
  downColor: "#ff3b5c",
  crosshairColor: "#666",
  textColor: "#8888aa",
  labelBg: "#1a1a2e",
  borderColor: "rgba(255,255,255,0.06)",
  volumeUpColor: "rgba(0, 255, 136, 0.25)",
  volumeDownColor: "rgba(255, 59, 92, 0.25)",
} as const;

// ---- Timeframe Config ----
type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h";

interface TimeframeConfig {
  label: string;
  interval: string;
  limit: number;
  secondsVisible: boolean;
}

const TIMEFRAMES: Record<Timeframe, TimeframeConfig> = {
  "1m": { label: "1m", interval: "1m", limit: 60, secondsVisible: true },
  "5m": { label: "5m", interval: "5m", limit: 60, secondsVisible: false },
  "15m": { label: "15m", interval: "15m", limit: 60, secondsVisible: false },
  "1h": { label: "1h", interval: "1h", limit: 48, secondsVisible: false },
  "4h": { label: "4h", interval: "4h", limit: 48, secondsVisible: false },
};

const TIMEFRAME_KEYS: Timeframe[] = ["1m", "5m", "15m", "1h", "4h"];

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

function formatPriceSOL(price: number): string {
  const precision = detectPricePrecision(price);
  if (price < 0.0001) {
    return `${price.toExponential(2)} SOL`;
  }
  return `${price.toFixed(precision)} SOL`;
}

// ---- Placeholder ----
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
    <div
      className="w-full rounded-xl bg-bg-elevated border border-border flex flex-col items-center justify-center gap-1.5"
      style={{ height }}
    >
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

// ---- Chart Header Overlay ----
function ChartHeaderOverlay({ candles }: { candles: CandleData[] }) {
  const stats = useMemo(() => {
    if (candles.length === 0) return null;
    const current = candles[candles.length - 1].close;
    const open = candles[0].open;
    const change = open !== 0 ? ((current - open) / open) * 100 : 0;
    let high = -Infinity;
    let low = Infinity;
    for (const c of candles) {
      if (c.high > high) high = c.high;
      if (c.low < low) low = c.low;
    }
    return { current, change, high, low };
  }, [candles]);

  if (!stats) return null;

  const changeColor =
    stats.change > 0
      ? "text-[#00ff88]"
      : stats.change < 0
        ? "text-[#ff3b5c]"
        : "text-[#8888aa]";

  return (
    <div className="absolute top-2 left-2 z-10 flex flex-col gap-0.5 pointer-events-none select-none">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-bold font-mono text-text-primary">
          {formatPriceSOL(stats.current)}
        </span>
        <span className={`text-xs font-mono font-semibold ${changeColor}`}>
          {stats.change > 0 ? "+" : ""}
          {stats.change.toFixed(2)}%
        </span>
      </div>
      <div className="flex items-center gap-3 text-[10px] font-mono text-[#8888aa]">
        <span>
          H: {formatPriceSOL(stats.high)}
        </span>
        <span>
          L: {formatPriceSOL(stats.low)}
        </span>
      </div>
    </div>
  );
}

// ---- Timeframe Buttons ----
function TimeframeButtons({
  active,
  onChange,
}: {
  active: Timeframe;
  onChange: (tf: Timeframe) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {TIMEFRAME_KEYS.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
            active === tf
              ? "bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30"
              : "text-[#8888aa] hover:text-text-secondary border border-transparent hover:border-border"
          }`}
        >
          {TIMEFRAMES[tf].label}
        </button>
      ))}
    </div>
  );
}

// ---- TradingView Chart (native) ----
function TradingViewChart({
  candles,
  height = 400,
  timeframe,
}: {
  candles: CandleData[];
  height?: number;
  timeframe: Timeframe;
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
    } = await import("lightweight-charts");

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // Auto-detect price precision from median price
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
        fontSize: 11,
      },
      grid: {
        vertLines: { color: CHART_THEME.gridColor },
        horzLines: { color: CHART_THEME.gridColor },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: CHART_THEME.crosshairColor,
          labelBackgroundColor: CHART_THEME.labelBg,
        },
        horzLine: {
          color: CHART_THEME.crosshairColor,
          labelBackgroundColor: CHART_THEME.labelBg,
        },
      },
      rightPriceScale: {
        borderColor: CHART_THEME.borderColor,
        scaleMargins: {
          top: 0.05,
          bottom: 0.22,
        },
      },
      timeScale: {
        borderColor: CHART_THEME.borderColor,
        timeVisible: true,
        secondsVisible: tfConfig.secondsVisible,
      },
      localization: {
        priceFormatter: (price: number) => {
          if (price < 0.0001) return price.toExponential(2) + " SOL";
          return price.toFixed(pricePrecision) + " SOL";
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

    // Volume histogram series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" as const },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: {
        top: 0.8,
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
  }, [candles, height, tfConfig.secondsVisible]);

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

  return (
    <div className="relative">
      <ChartHeaderOverlay candles={candles} />
      <div ref={containerRef} className="w-full" style={{ height }} />
    </div>
  );
}

// ---- DexScreener Embed with Loading Skeleton ----
function DexScreenerEmbed({
  pairAddress,
  height = 400,
  onSwitchNative,
}: {
  pairAddress: string;
  height?: number;
  onSwitchNative?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="bg-bg-elevated rounded-xl overflow-hidden border border-border relative">
      <div className="flex items-center justify-between px-3 pt-3 mb-1.5">
        <p className="text-xs text-text-secondary font-medium">Price</p>
        <div className="flex items-center gap-2">
          {onSwitchNative && (
            <button
              onClick={onSwitchNative}
              className="text-[10px] font-mono text-[#00ff88] hover:text-[#00ff88]/80 transition-colors"
            >
              Native Chart
            </button>
          )}
          <p className="text-[10px] text-text-muted font-mono">DexScreener</p>
        </div>
      </div>

      {/* Loading skeleton */}
      {!loaded && (
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center gap-2 bg-bg-elevated"
          style={{ height }}
        >
          <div className="w-8 h-8 border-2 border-[#8888aa]/30 border-t-[#8888aa] rounded-full animate-spin" />
          <p className="text-[11px] text-text-muted font-mono">
            Loading chart data...
          </p>
        </div>
      )}

      <iframe
        src={`https://dexscreener.com/solana/${pairAddress}?embed=1&theme=dark&trades=0&info=0`}
        className={`w-full border-0 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        style={{ height }}
        title="DexScreener chart"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

// ---- Main TokenChart Component ----
export function TokenChart({ mintAddress, height }: TokenChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("5m");
  const [chartData, setChartData] = useState<ChartResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState<"native" | "dexscreener">(
    "native"
  );
  const mountedRef = useRef(true);

  // Responsive height: mobile 280px, desktop 400px (or prop override)
  const [responsiveHeight, setResponsiveHeight] = useState(height ?? 400);

  useEffect(() => {
    if (height != null) return; // prop override, skip responsive
    function handleResize() {
      setResponsiveHeight(window.innerWidth < 768 ? 280 : 400);
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

  // Determine what to render
  const hasCandles = chartData && chartData.candles.length >= 2;
  const hasDexScreener = !!chartData?.pairAddress;

  // Loading skeleton
  if (loading && chartData === null) {
    return (
      <div
        className="w-full rounded-xl bg-bg-elevated animate-pulse"
        style={{ height: responsiveHeight + 52 }}
      />
    );
  }

  if (error) {
    return (
      <ChartPlaceholder
        title="Chart unavailable"
        subtitle="Try again later"
        height={responsiveHeight}
      />
    );
  }

  if (chartData?.tooNew) {
    return (
      <ChartPlaceholder
        title="Chart available after ~2 min"
        subtitle="Token was just created"
        height={responsiveHeight}
      />
    );
  }

  // No data at all
  if (!hasCandles && !hasDexScreener) {
    return (
      <ChartPlaceholder
        title="Chart data loading..."
        subtitle="Data appears after first trades"
        height={responsiveHeight}
      />
    );
  }

  return (
    <div className="bg-bg-elevated rounded-xl border border-border overflow-hidden">
      {/* Chart toolbar */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <TimeframeButtons active={timeframe} onChange={setTimeframe} />
        <div className="flex items-center gap-2">
          {hasDexScreener && hasCandles && (
            <button
              onClick={() =>
                setChartMode((m) =>
                  m === "native" ? "dexscreener" : "native"
                )
              }
              className="text-[10px] font-mono text-text-muted hover:text-text-secondary transition-colors border border-border rounded px-1.5 py-0.5"
            >
              {chartMode === "native" ? "DexScreener" : "Native"}
            </button>
          )}
          <p className="text-[10px] text-text-muted font-mono">
            {TIMEFRAMES[timeframe].label} candles
          </p>
          {loading && (
            <span className="w-3 h-3 border border-[#8888aa]/30 border-t-[#8888aa] rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* Chart content */}
      {chartMode === "native" && hasCandles ? (
        <div className="px-1">
          <TradingViewChart
            candles={chartData.candles}
            height={responsiveHeight}
            timeframe={timeframe}
          />
        </div>
      ) : hasDexScreener ? (
        <DexScreenerEmbed
          pairAddress={chartData!.pairAddress!}
          height={responsiveHeight}
          onSwitchNative={
            hasCandles ? () => setChartMode("native") : undefined
          }
        />
      ) : (
        <div className="px-3 pb-3">
          <ChartPlaceholder
            title="No chart data available"
            height={responsiveHeight}
          />
        </div>
      )}
    </div>
  );
}
