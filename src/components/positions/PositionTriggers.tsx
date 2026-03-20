"use client";

interface PositionTriggersProps {
  pnlPercent: number;
  takeProfitPct: number | null;
  stopLossPct: number | null;
}

export function PositionTriggers({
  pnlPercent,
  takeProfitPct,
  stopLossPct,
}: PositionTriggersProps) {
  const hasTP = takeProfitPct !== null && takeProfitPct > 0;
  const hasSL = stopLossPct !== null && stopLossPct > 0;

  if (!hasTP && !hasSL) return null;

  // Progress bar: map pnlPercent between -stopLossPct and +takeProfitPct
  const slVal = hasSL ? stopLossPct : 100;
  const tpVal = hasTP ? takeProfitPct : 100;
  const totalRange = slVal + tpVal;
  // Normalize current P&L: 0% means at -SL, 100% means at +TP
  const normalizedPnl = ((pnlPercent + slVal) / totalRange) * 100;
  const clampedPnl = Math.max(0, Math.min(100, normalizedPnl));

  // Check if close to triggering (within 10% of trigger value)
  const closeToTP = hasTP && pnlPercent >= takeProfitPct * 0.9;
  const closeToSL = hasSL && pnlPercent <= -(stopLossPct * 0.9);

  return (
    <div className="space-y-1.5">
      {/* Trigger badges */}
      <div className="flex items-center gap-2">
        {hasSL && (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
              closeToSL
                ? "bg-red/20 border-red/50 text-red animate-pulse"
                : "bg-red/10 border-red/20 text-red/80"
            }`}
          >
            SL: -{stopLossPct}%
          </span>
        )}
        {hasTP && (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
              closeToTP
                ? "bg-green/20 border-green/50 text-green animate-pulse"
                : "bg-green/10 border-green/20 text-green/80"
            }`}
          >
            TP: +{takeProfitPct}%
          </span>
        )}
      </div>

      {/* Progress bar showing P&L relative to SL and TP */}
      <div className="relative w-full h-1.5 bg-bg-elevated rounded-full overflow-hidden">
        {/* SL zone (left red) */}
        {hasSL && (
          <div
            className="absolute left-0 top-0 h-full bg-red/20 rounded-l-full"
            style={{ width: `${(slVal / totalRange) * 100 * 0.15}%` }}
          />
        )}
        {/* TP zone (right green) */}
        {hasTP && (
          <div
            className="absolute right-0 top-0 h-full bg-green/20 rounded-r-full"
            style={{ width: `${(tpVal / totalRange) * 100 * 0.15}%` }}
          />
        )}
        {/* Current position indicator */}
        <div
          className={`absolute top-0 h-full w-1 rounded-full transition-all duration-500 ${
            pnlPercent >= 0 ? "bg-green" : "bg-red"
          }`}
          style={{ left: `${clampedPnl}%` }}
        />
        {/* Center line (entry point) */}
        <div
          className="absolute top-0 h-full w-px bg-text-muted/30"
          style={{ left: `${(slVal / totalRange) * 100}%` }}
        />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between text-[9px] font-mono text-text-muted">
        {hasSL && <span className="text-red/60">-{stopLossPct}%</span>}
        {!hasSL && <span />}
        <span className="text-text-muted/50">Entry</span>
        {hasTP && <span className="text-green/60">+{takeProfitPct}%</span>}
        {!hasTP && <span />}
      </div>
    </div>
  );
}
