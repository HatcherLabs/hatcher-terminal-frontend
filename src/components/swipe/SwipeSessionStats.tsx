"use client";

interface SwipeSessionStatsProps {
  seen: number;
  bought: number;
  passed: number;
  totalMarketCapSol: number;
}

export function SwipeSessionStats({ seen, bought, passed, totalMarketCapSol }: SwipeSessionStatsProps) {
  const passRate = seen > 0 ? Math.round((passed / seen) * 100) : 0;
  const avgMCap = seen > 0 ? (totalMarketCapSol / seen).toFixed(1) : "0";

  if (seen === 0) return null;

  return (
    <div className="w-full max-w-[360px] mx-auto px-4 sm:px-0 mb-2">
      <div className="flex items-center justify-center gap-3 px-3 py-1.5 rounded-lg backdrop-blur text-[10px] font-mono" style={{ background: "rgba(10,13,20,0.5)", color: "#5c6380" }}>
        <span>
          Seen: <span className="font-medium" style={{ color: "#8890a4" }}>{seen}</span>
        </span>
        <span style={{ color: "#1c2030" }}>|</span>
        <span>
          Bought: <span className="font-medium" style={{ color: "#22c55e" }}>{bought}</span>
        </span>
        <span style={{ color: "#1c2030" }}>|</span>
        <span>
          Pass: <span className="font-medium" style={{ color: "#8890a4" }}>{passRate}%</span>
        </span>
        <span style={{ color: "#1c2030" }}>|</span>
        <span>
          Avg MCap: <span className="font-medium" style={{ color: "#8890a4" }}>{avgMCap} SOL</span>
        </span>
      </div>
    </div>
  );
}
