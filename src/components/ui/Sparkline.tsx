"use client";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function Sparkline({
  data,
  width = 100,
  height = 28,
  color,
  className,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const mn = Math.min(...data);
  const mx = Math.max(...data);
  const rng = mx - mn || 1;
  const c = color || (data[data.length - 1] >= data[0] ? "#00d672" : "#f23645");
  const gradId = `spark-${c.replace("#", "")}`;

  const pts = data
    .map(
      (v, i) =>
        `${(i / (data.length - 1)) * width},${height - ((v - mn) / rng) * height}`
    )
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      className={className}
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity={0.25} />
          <stop offset="100%" stopColor={c} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${pts} ${width},${height}`}
        fill={`url(#${gradId})`}
      />
      <polyline
        points={pts}
        fill="none"
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
