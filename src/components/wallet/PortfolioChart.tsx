"use client";

import { useEffect, useRef, useCallback } from "react";

interface PortfolioChartProps {
  data: { time: string; value: number }[];
}

export function PortfolioChart({ data }: PortfolioChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<
    typeof import("lightweight-charts").createChart
  > | null>(null);

  const initChart = useCallback(async () => {
    if (!containerRef.current || data.length === 0) return;

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
        background: { type: ColorType.Solid, color: "#0d0d14" },
        textColor: "#555568",
        fontFamily: "var(--font-jetbrains-mono), monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(26, 26, 46, 0.4)" },
        horzLines: { color: "rgba(26, 26, 46, 0.4)" },
      },
      crosshair: {
        vertLine: {
          color: "#555568",
          width: 1,
          style: 3,
          labelBackgroundColor: "#14141f",
        },
        horzLine: {
          color: "#555568",
          width: 1,
          style: 3,
          labelBackgroundColor: "#14141f",
        },
      },
      rightPriceScale: {
        borderColor: "#1a1a2a",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "#1a1a2a",
        timeVisible: false,
      },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: "#00ff88",
      lineWidth: 2,
      topColor: "rgba(0, 255, 136, 0.28)",
      bottomColor: "rgba(0, 255, 136, 0.02)",
      crosshairMarkerBackgroundColor: "#00ff88",
      crosshairMarkerBorderColor: "#00ff88",
      crosshairMarkerRadius: 4,
      priceFormat: {
        type: "price",
        precision: 4,
        minMove: 0.0001,
      },
    });

    areaSeries.setData(data as { time: string; value: number }[]);
    chart.timeScale().fitContent();

    // Resize observer for responsive behavior
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
  }, [data]);

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

  if (data.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-[200px] gap-1.5"
        style={{ background: "#0d0d14", borderRadius: 12 }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          style={{ color: "#333340" }}
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
        <span className="text-xs font-mono" style={{ color: "#555568" }}>
          No portfolio data available
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-[200px]"
      style={{ borderRadius: 8, overflow: "hidden" }}
    />
  );
}
