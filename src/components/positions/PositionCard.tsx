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

function SellSpinner() {
  return (
    <svg
      className="animate-spin h-3.5 w-3.5 mx-auto"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

const SELL_PERCENTS = [25, 50, 75, 100] as const;

export function PositionCard({ position, onClose, takeProfitPct, stopLossPct }: PositionCardProps) {
  const [sellingPercent, setSellingPercent] = useState<number | null>(null);
  const [showSellButtons, setShowSellButtons] = useState(false);
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

  // Compute gradient intensity based on P&L magnitude (capped at 50%)
  const gradientIntensity = Math.min(Math.abs(pnl) / 50, 1);
  const gradientColor = isPositive
    ? `rgba(0, 214, 114, ${0.15 + gradientIntensity * 0.45})`
    : `rgba(242, 54, 69, ${0.15 + gradientIntensity * 0.45})`;

  const handleSell = async (percent: number) => {
    setSellingPercent(percent);
    try {
      await onClose(position.id, percent);
    } finally {
      setSellingPercent(null);
    }
  };

  return (
    <div
      className="group relative bg-bg-card border border-border rounded-xl overflow-hidden"
      onMouseEnter={() => setShowSellButtons(true)}
      onMouseLeave={() => {
        if (sellingPercent === null) setShowSellButtons(false);
      }}
    >
      {/* P&L gradient left edge */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{
          background: `linear-gradient(to bottom, ${gradientColor}, ${
            isPositive ? "rgba(0, 214, 114, 0.05)" : "rgba(242, 54, 69, 0.05)"
          })`,
        }}
      />

      <div className="p-4 pl-5 space-y-3">
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

        {/* Quick Sell buttons - visible on hover (desktop) or tap toggle (mobile) */}
        {position.status === "open" && (
          <>
            {/* Mobile tap toggle */}
            <button
              onClick={() => setShowSellButtons((prev) => !prev)}
              className="md:hidden w-full py-1.5 text-[11px] font-medium text-text-muted hover:text-text-secondary transition-colors"
            >
              {showSellButtons ? "Hide sell options" : "Quick Sell..."}
            </button>

            <div
              className={`grid grid-cols-4 gap-2 pt-1 transition-all duration-200 ease-in-out overflow-hidden ${
                showSellButtons
                  ? "max-h-20 opacity-100"
                  : "max-h-0 opacity-0 md:group-hover:max-h-20 md:group-hover:opacity-100"
              }`}
            >
              {SELL_PERCENTS.map((pct) => (
                <button
                  key={pct}
                  disabled={sellingPercent !== null}
                  onClick={() => handleSell(pct)}
                  className={`py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    pct === 100
                      ? "border-red/40 text-red hover:bg-red/10"
                      : "border-border text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                  }`}
                >
                  {sellingPercent === pct ? (
                    <SellSpinner />
                  ) : pct === 100 ? (
                    "Sell All"
                  ) : (
                    `${pct}%`
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
