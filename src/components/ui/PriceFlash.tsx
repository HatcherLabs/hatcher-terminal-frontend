"use client";

import { useRef, useEffect, useState, memo } from "react";

interface PriceFlashProps {
  value: number | null | undefined;
  format?: (v: number) => string;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Displays a numeric value that briefly flashes green/red when it changes.
 * Standard trading terminal behavior for live price feeds.
 */
export const PriceFlash = memo(function PriceFlash({
  value,
  format,
  prefix = "",
  suffix = "",
  className = "",
  style,
}: PriceFlashProps) {
  const prevRef = useRef<number | null | undefined>(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value == null || prevRef.current == null) {
      prevRef.current = value;
      return;
    }

    if (value !== prevRef.current) {
      const direction = value > prevRef.current ? "up" : "down";
      setFlash(direction);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setFlash(null), 600);

      prevRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const formatted = value != null
    ? `${prefix}${format ? format(value) : String(value)}${suffix}`
    : "—";

  const flashStyle: React.CSSProperties = flash
    ? {
        transition: "background-color 0.15s ease-out, color 0.15s ease-out",
        backgroundColor: flash === "up" ? "rgba(0,214,114,0.15)" : "rgba(242,54,69,0.15)",
        color: flash === "up" ? "#00d672" : "#f23645",
        borderRadius: 3,
        padding: "0 2px",
        margin: "0 -2px",
      }
    : {
        transition: "background-color 0.6s ease-out, color 0.6s ease-out",
        backgroundColor: "transparent",
      };

  return (
    <span
      className={className}
      style={{ ...style, ...flashStyle, display: "inline-block" }}
    >
      {formatted}
    </span>
  );
});
