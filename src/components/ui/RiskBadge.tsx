interface RiskBadgeProps {
  level: "LOW" | "MED" | "HIGH" | "EXTREME" | null;
}

const riskStyles: Record<string, React.CSSProperties> = {
  LOW: { background: "rgba(34,197,94,0.08)", color: "#22c55e", borderColor: "rgba(34,197,94,0.2)" },
  MED: { background: "rgba(245,158,11,0.08)", color: "#f59e0b", borderColor: "rgba(245,158,11,0.2)" },
  HIGH: { background: "rgba(239,68,68,0.08)", color: "#ef4444", borderColor: "rgba(239,68,68,0.2)" },
  EXTREME: { background: "#ef4444", color: "#06080e", borderColor: "#ef4444" },
};

const riskLabels = {
  LOW: "SAFE",
  MED: "MED",
  HIGH: "HIGH",
  EXTREME: "RUG",
};

export function RiskBadge({ level }: RiskBadgeProps) {
  if (!level) return null;

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
      style={{ ...riskStyles[level], border: `1px solid ${riskStyles[level].borderColor}` }}
    >
      {riskLabels[level]}
    </span>
  );
}
