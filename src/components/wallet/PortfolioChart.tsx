"use client";

import { useEffect, useRef } from "react";
import { createChart, AreaSeries, type IChartApi } from "lightweight-charts";

interface PortfolioChartProps {
  data: { time: string; value: number }[];
}

export function PortfolioChart({ data }: PortfolioChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: "#555568",
        fontFamily: "var(--font-jetbrains-mono), monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1a1a2a30" },
        horzLines: { color: "#1a1a2a30" },
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
      priceFormat: {
        type: "price",
        precision: 4,
        minMove: 0.0001,
      },
    });

    areaSeries.setData(data as { time: string; value: number }[]);
    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-text-muted text-xs">
        No portfolio data available
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-[200px]"
    />
  );
}
