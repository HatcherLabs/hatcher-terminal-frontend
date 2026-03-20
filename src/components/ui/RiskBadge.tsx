interface RiskBadgeProps {
  level: "LOW" | "MED" | "HIGH" | "EXTREME" | null;
}

const riskStyles: Record<string, React.CSSProperties> = {
  LOW: { background: "rgba(0,214,114,0.08)", color: "#00d672", borderColor: "rgba(0,214,114,0.2)" },
  MED: { background: "rgba(240,160,0,0.08)", color: "#f0a000", borderColor: "rgba(240,160,0,0.2)" },
  HIGH: { background: "rgba(242,54,69,0.08)", color: "#f23645", borderColor: "rgba(242,54,69,0.2)" },
  EXTREME: { background: "#f23645", color: "#04060b", borderColor: "#f23645" },
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
