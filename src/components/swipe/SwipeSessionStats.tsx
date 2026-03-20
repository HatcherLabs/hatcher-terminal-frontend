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
      <div className="flex items-center justify-center gap-3 px-3 py-1.5 rounded-lg bg-bg-card/50 backdrop-blur text-[10px] text-text-muted font-mono">
        <span>
          Seen: <span className="text-text-secondary font-medium">{seen}</span>
        </span>
        <span className="text-border">|</span>
        <span>
          Bought: <span className="text-green font-medium">{bought}</span>
        </span>
        <span className="text-border">|</span>
        <span>
          Pass: <span className="text-text-secondary font-medium">{passRate}%</span>
        </span>
        <span className="text-border">|</span>
        <span>
          Avg MCap: <span className="text-text-secondary font-medium">{avgMCap} SOL</span>
        </span>
      </div>
    </div>
  );
}
