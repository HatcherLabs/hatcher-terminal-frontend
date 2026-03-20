"use client";

import { useState } from "react";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { PositionTriggers } from "./PositionTriggers";

interface PositionCardProps {
  position: {
    id: string;
    mintAddress: string;
    entrySol: number;
    entryTokenAmount: number;
    entryPricePerToken: number;
    entryTimestamp?: string;
    currentPriceSol: number | null;
    pnlPercent: number | null;
    pnlSol: number | null;
    status: string;
    token: {
      name: string;
      ticker: string;
      imageUri: string | null;
    };
  };
  onClose: (id: string, percent: number) => void;
  takeProfitPct?: number | null;
  stopLossPct?: number | null;
}

function formatTimeHeld(entryTimestamp: string | undefined): string {
  if (!entryTimestamp) return "--";
  const entryDate = new Date(entryTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - entryDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "< 1m";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ${diffHours % 24}h`;
}

const SELL_PERCENTS = [25, 50, 75, 100] as const;

export function PositionCard({ position, onClose, takeProfitPct, stopLossPct }: PositionCardProps) {
  const [sellingPercent, setSellingPercent] = useState<number | null>(null);
  const isPending = position.status === "pending";

  let pnlPercent = position.pnlPercent;
  let pnlSol = position.pnlSol;

  if (
    pnlPercent === null &&
    position.entryPricePerToken > 0 &&
    position.currentPriceSol !== null
  ) {
    pnlPercent =
      ((position.currentPriceSol - position.entryPricePerToken) /
        position.entryPricePerToken) *
      100;
  }

  if (pnlSol === null && pnlPercent !== null) {
    pnlSol = position.entrySol * (pnlPercent / 100);
  }

  const pnl = pnlPercent ?? 0;
  const isPositive = pnl >= 0;
  const unrealizedSol = pnlSol ?? 0;
  const currentValueSol = position.entrySol + unrealizedSol;

  const handleSell = async (percent: number) => {
    setSellingPercent(percent);
    try {
      await onClose(position.id, percent);
    } finally {
      setSellingPercent(null);
    }
  };

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <TokenAvatar
          mintAddress={position.mintAddress}
          imageUri={position.token.imageUri}
          size={44}
          ticker={position.token.ticker}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-text-primary">
              ${position.token.ticker}
            </span>
            {isPending && (
              <span className="text-[10px] text-amber animate-pulse font-medium">
                BUYING...
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted truncate">
            {position.token.name}
          </p>
        </div>

        <div className="text-right">
          <p
            className={`text-sm font-mono font-bold ${
              isPositive ? "text-green" : "text-red"
            }`}
          >
            {isPositive ? "+" : ""}
            {pnl.toFixed(1)}%
          </p>
          <p
            className={`text-[10px] font-mono ${
              isPositive ? "text-green/70" : "text-red/70"
            }`}
          >
            {unrealizedSol >= 0 ? "+" : ""}
            {unrealizedSol.toFixed(4)} SOL
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
        <div>
          <p className="text-text-muted">Entry</p>
          <p className="text-text-secondary">{position.entrySol.toFixed(4)} SOL</p>
        </div>
        <div>
          <p className="text-text-muted">Value</p>
          <p className="text-text-secondary">{currentValueSol.toFixed(4)} SOL</p>
        </div>
        <div>
          <p className="text-text-muted">Held</p>
          <p className="text-text-secondary">
            {formatTimeHeld(position.entryTimestamp)}
          </p>
        </div>
      </div>

      {/* Auto-sell trigger indicators */}
      {position.status === "open" &&
        (takeProfitPct || stopLossPct) && (
          <PositionTriggers
            pnlPercent={pnl}
            takeProfitPct={takeProfitPct ?? null}
            stopLossPct={stopLossPct ?? null}
          />
        )}

      {position.status === "open" && (
        <div className="flex gap-2 pt-1">
          {SELL_PERCENTS.map((pct) => (
            <button
              key={pct}
              disabled={sellingPercent !== null}
              onClick={() => handleSell(pct)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                pct === 100
                  ? "border-red/40 text-red hover:bg-red/10"
                  : "border-border text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
              }`}
            >
              {sellingPercent === pct ? (
                <span className="animate-pulse">...</span>
              ) : pct === 100 ? (
                "Sell All"
              ) : (
                `${pct}%`
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
