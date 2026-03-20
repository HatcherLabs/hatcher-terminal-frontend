"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedPriceProps {
  value: number | null;
  format: "sol" | "usd" | "percent";
  className?: string;
  showArrow?: boolean;
}

function formatValue(value: number | null, format: "sol" | "usd" | "percent"): string {
  if (value === null || value === undefined) return "\u2014";

  switch (format) {
    case "sol": {
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M SOL`;
      if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K SOL`;
      return `${value.toFixed(value < 10 ? 2 : 1)} SOL`;
    }
    case "usd": {
      if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
      if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
      return `$${value.toFixed(0)}`;
    }
    case "percent": {
      const prefix = value > 0 ? "+" : "";
      return `${prefix}${value.toFixed(1)}%`;
    }
  }
}

export function AnimatedPrice({ value, format, className = "", showArrow = false }: AnimatedPriceProps) {
  const prevValueRef = useRef<number | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prev = prevValueRef.current;
    if (prev !== null && value !== null && prev !== value) {
      const direction = value > prev ? "up" : "down";
      setFlash(direction);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setFlash(null), 600);
    }
    prevValueRef.current = value;

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value]);

  const flashBg =
    flash === "up"
      ? "bg-green/10"
      : flash === "down"
        ? "bg-red/10"
        : "bg-transparent";

  const flashText =
    flash === "up"
      ? "text-green"
      : flash === "down"
        ? "text-red"
        : "";

  // For percent format, color is always based on value sign
  const percentColor =
    format === "percent" && value !== null
      ? value > 0
        ? "text-green"
        : value < 0
          ? "text-red"
          : "text-text-muted"
      : "";

  const arrow =
    showArrow && flash === "up"
      ? "\u25B2 "
      : showArrow && flash === "down"
        ? "\u25BC "
        : "";

  return (
    <span
      className={`
        inline-flex items-center font-mono transition-colors duration-600 rounded px-0.5
        ${flashBg} ${flashText || percentColor} ${className}
      `.trim()}
    >
      {arrow && (
        <span className="text-[8px] mr-0.5">{arrow.trim()}</span>
      )}
      {formatValue(value, format)}
    </span>
  );
}
