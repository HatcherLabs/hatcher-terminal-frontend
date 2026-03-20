"use client";

import Link from "next/link";
import { usePositions } from "@/hooks/usePositions";

function PositionChip({
  mint,
  ticker,
  pnlPercent,
  currentPriceSol,
}: {
  mint: string;
  ticker: string;
  pnlPercent: number | null;
  currentPriceSol: number | null;
}) {
  const pnl = pnlPercent ?? 0;
  const isProfit = pnl >= 0;

  return (
    <Link
      href={`/token/${mint}`}
      className="flex items-center gap-2 px-3 h-8 bg-bg-elevated hover:bg-bg-hover border border-border rounded transition-colors shrink-0 group"
    >
      <span className="text-[11px] font-mono font-medium text-text-secondary group-hover:text-text-primary transition-colors">
        {ticker}
      </span>
      <span
        className={`text-[11px] font-mono font-semibold ${
          isProfit ? "text-green" : "text-red"
        }`}
      >
        {isProfit ? "+" : ""}
        {pnl.toFixed(1)}%
      </span>
      {currentPriceSol !== null && (
        <span className="text-[10px] font-mono text-text-muted">
          {currentPriceSol.toFixed(4)} SOL
        </span>
      )}
    </Link>
  );
}

export function PositionsBar() {
  const { positions, loading } = usePositions("open");

  if (loading) {
    return (
      <div className="h-10 bg-bg-card border-t border-border flex items-center px-3 gap-2 shrink-0">
        <span className="text-[10px] text-text-faint font-mono uppercase tracking-wider shrink-0">
          Positions
        </span>
        <div className="w-px h-5 bg-border shrink-0" />
        <span className="text-[10px] text-text-muted font-mono animate-pulse">
          Loading...
        </span>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="h-10 bg-bg-card border-t border-border flex items-center px-3 gap-2 shrink-0">
        <span className="text-[10px] text-text-faint font-mono uppercase tracking-wider shrink-0">
          Positions
        </span>
        <div className="w-px h-5 bg-border shrink-0" />
        <span className="text-[10px] text-text-muted font-mono">
          No open positions
        </span>
      </div>
    );
  }

  return (
    <div className="h-10 bg-bg-card border-t border-border flex items-center px-3 gap-2 shrink-0 overflow-hidden">
      <span className="text-[10px] text-text-faint font-mono uppercase tracking-wider shrink-0">
        Positions
      </span>
      <div className="w-px h-5 bg-border shrink-0" />
      <div className="flex items-center gap-1.5 overflow-x-auto terminal-scrollbar-x">
        {positions.map((pos) => (
          <PositionChip
            key={pos.id}
            mint={pos.mintAddress}
            ticker={pos.token.ticker}
            pnlPercent={pos.pnlPercent}
            currentPriceSol={pos.currentPriceSol}
          />
        ))}
      </div>
    </div>
  );
}
