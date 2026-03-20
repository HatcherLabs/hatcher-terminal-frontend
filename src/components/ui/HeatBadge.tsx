"use client";

interface HeatBadgeProps {
  heat: number;
  size?: "sm" | "md";
}

export function HeatBadge({ heat, size = "sm" }: HeatBadgeProps) {
  const c = heat > 70 ? "#00d672" : heat > 40 ? "#f0a000" : "#5c6380";
  const fontSize = size === "sm" ? 9 : 11;
  const padding = size === "sm" ? "1px 6px" : "2px 8px";

  return (
    <span
      style={{
        background: `${c}15`,
        color: c,
        border: `1px solid ${c}25`,
        padding,
        borderRadius: 3,
        fontSize,
        fontWeight: 700,
        letterSpacing: ".03em",
        whiteSpace: "nowrap",
      }}
      className="font-mono"
    >
      {heat}
    </span>
  );
}
