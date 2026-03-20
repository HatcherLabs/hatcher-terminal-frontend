"use client";

import { useMemo } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 28,
  color,
  className,
}: SparklineProps) {
  const render = useMemo(() => {
    if (!data || data.length < 2) return null;

    const mn = Math.min(...data);
    const mx = Math.max(...data);
    const rng = mx - mn || 1;

    // Pad slightly so peaks/valleys don't clip the stroke
    const pad = 1.5;
    const innerH = height - pad * 2;

    const isUp = data[data.length - 1] >= data[0];
    const c = color ?? (isUp ? "#00d672" : "#f23645");

    // Build SVG path from data points
    const points = data.map((v, i) => ({
      x: (i / (data.length - 1)) * width,
      y: pad + innerH - ((v - mn) / rng) * innerH,
    }));

    // Line path (M...L...)
    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(" ");

    // Closed area path for the gradient fill
    const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

    // Unique gradient ID per color to avoid collisions when multiple sparklines render
    const gradId = `spark-grad-${c.replace("#", "")}`;

    return { c, linePath, areaPath, gradId };
  }, [data, width, height, color]);

  if (!render) return null;

  const { c, linePath, areaPath, gradId } = render;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity={0.15} />
          <stop offset="100%" stopColor={c} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
