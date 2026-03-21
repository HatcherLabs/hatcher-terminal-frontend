"use client";

import { useSolPriceContext } from "@/components/providers/SolPriceProvider";

interface SolAmountProps {
  amount: number;
  showUsd?: boolean;
  size?: "sm" | "md";
}

export function SolAmount({ amount, showUsd = true, size = "sm" }: SolAmountProps) {
  const { solPrice } = useSolPriceContext();

  const isPositive = amount > 0;
  const isNegative = amount < 0;
  const color = isPositive ? "#22c55e" : isNegative ? "#ff4a6e" : "#e0e2eb";
  const glow = isPositive
    ? "0 0 6px rgba(34,197,94,0.2)"
    : isNegative
      ? "0 0 6px rgba(239,68,68,0.2)"
      : "none";

  const fontSize = size === "sm" ? 12 : 14;
  const usdFontSize = size === "sm" ? 10 : 12;
  const iconSize = size === "sm" ? 12 : 15;
  const gap = size === "sm" ? 3 : 4;

  const formatted = Math.abs(amount) < 0.001
    ? amount.toExponential(2)
    : amount.toLocaleString(undefined, { maximumFractionDigits: 4 });

  const usdValue = Math.abs(amount * solPrice);
  const usdFormatted = usdValue < 0.01
    ? "<$0.01"
    : `$${usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap,
        color,
        whiteSpace: "nowrap",
      }}
      className="font-mono"
    >
      {/* SOL icon */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        style={{ flexShrink: 0, filter: "drop-shadow(0 0 3px rgba(34,197,94,0.3))" }}
      >
        <circle cx="12" cy="12" r="11" stroke={color} strokeWidth="1.5" />
        <text
          x="12"
          y="16"
          textAnchor="middle"
          fill={color}
          fontSize="12"
          fontWeight="700"
          fontFamily="monospace"
        >
          S
        </text>
      </svg>

      <span style={{ fontSize, fontWeight: 600, textShadow: glow }}>
        {isPositive && "+"}
        {formatted}
      </span>

      {showUsd && (
        <span style={{ fontSize: usdFontSize, color: "#5c6380", fontWeight: 400 }}>
          {usdFormatted}
        </span>
      )}
    </span>
  );
}
