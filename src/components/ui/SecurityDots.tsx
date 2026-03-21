"use client";

interface SecurityDotsProps {
  lpBurned?: boolean;
  mintRevoked?: boolean;
  devHoldPct?: number;
}

export function SecurityDots({ lpBurned, mintRevoked, devHoldPct }: SecurityDotsProps) {
  const dots = [
    { ok: !!lpBurned, label: "LP" },
    { ok: !!mintRevoked, label: "MR" },
    { ok: (devHoldPct ?? 100) < 10, label: "DV" },
  ];

  return (
    <div className="flex items-center gap-[3px]">
      {dots.map((d) => (
        <span
          key={d.label}
          title={`${d.label}: ${d.ok ? "✓" : "✗"}`}
          className="block w-[5px] h-[5px] rounded-full opacity-70"
          style={{
            background: d.ok ? "#22c55e" : "#ef4444",
            boxShadow: d.ok
              ? "0 0 6px rgba(34,197,94,0.4)"
              : "0 0 6px rgba(239,68,68,0.4)",
          }}
        />
      ))}
    </div>
  );
}
