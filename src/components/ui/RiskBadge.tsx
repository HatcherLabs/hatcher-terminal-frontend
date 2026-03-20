interface RiskBadgeProps {
  level: "LOW" | "MED" | "HIGH" | "EXTREME" | null;
}

const riskColors = {
  LOW: "bg-green-dim text-green border-green/20",
  MED: "bg-amber-dim text-amber border-amber/20",
  HIGH: "bg-red-dim text-red border-red/20",
  EXTREME: "bg-red text-bg-primary border-red",
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
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${riskColors[level]}`}
    >
      {riskLabels[level]}
    </span>
  );
}
