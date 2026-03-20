"use client";

interface PositionTriggersProps {
  entryPrice: number;
  currentPrice: number;
  takeProfitPct?: number;
  stopLossPct?: number;
}

export function PositionTriggers({
  entryPrice,
  currentPrice,
  takeProfitPct,
  stopLossPct,
}: PositionTriggersProps) {
  const hasTP = takeProfitPct !== undefined && takeProfitPct > 0;
  const hasSL = stopLossPct !== undefined && stopLossPct > 0;

  if (!hasTP && !hasSL) return null;

  const tpPrice = hasTP ? entryPrice * (1 + takeProfitPct / 100) : null;
  const slPrice = hasSL ? entryPrice * (1 - stopLossPct / 100) : null;

  const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;

  // Build the price range for the bar.
  // We want SL on the left, entry in the middle, TP on the right.
  // Use symmetric fallback when only one side is set.
  const slRange = hasSL ? stopLossPct : hasTP ? takeProfitPct : 10;
  const tpRange = hasTP ? takeProfitPct : hasSL ? stopLossPct : 10;

  // Add 20% padding beyond TP/SL so the markers don't sit at the very edge.
  const lowerBound = -(slRange * 1.2);
  const upperBound = tpRange * 1.2;
  const totalSpan = upperBound - lowerBound;

  // Convert a % value (relative to entry) to an x position in [0, 1].
  const pctToX = (pct: number) =>
    Math.max(0, Math.min(1, (pct - lowerBound) / totalSpan));

  const entryX = pctToX(0);
  const currentX = pctToX(pnlPct);
  const tpX = hasTP ? pctToX(takeProfitPct) : null;
  const slX = hasSL ? pctToX(-stopLossPct) : null;

  const W = 200;
  const H = 50;
  const barY = 24;
  const barH = 4;
  const pad = 6; // horizontal padding so markers don't clip

  const toSvgX = (ratio: number) => pad + ratio * (W - pad * 2);

  const entrySvgX = toSvgX(entryX);
  const currentSvgX = toSvgX(currentX);
  const tpSvgX = tpX !== null ? toSvgX(tpX) : null;
  const slSvgX = slX !== null ? toSvgX(slX) : null;

  const formatPrice = (p: number) =>
    p >= 1 ? p.toFixed(2) : p.toPrecision(4);

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: "block" }}
    >
      {/* Bar background */}
      <rect
        x={pad}
        y={barY}
        width={W - pad * 2}
        height={barH}
        rx={2}
        fill="#1e2030"
      />

      {/* Colored fill from entry to current price */}
      {(() => {
        const x1 = Math.min(entrySvgX, currentSvgX);
        const x2 = Math.max(entrySvgX, currentSvgX);
        const fillColor = pnlPct >= 0 ? "#22c55e" : "#ef4444";
        return (
          <rect
            x={x1}
            y={barY}
            width={Math.max(0, x2 - x1)}
            height={barH}
            rx={2}
            fill={fillColor}
            opacity={0.35}
          />
        );
      })()}

      {/* Stop loss dashed line */}
      {slSvgX !== null && (
        <>
          <line
            x1={slSvgX}
            y1={barY - 6}
            x2={slSvgX}
            y2={barY + barH + 2}
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="2 2"
          />
          <text
            x={slSvgX}
            y={barY - 9}
            textAnchor="middle"
            fill="#ef4444"
            fontSize={9}
            fontFamily="monospace"
          >
            {slPrice !== null ? formatPrice(slPrice) : ""}
          </text>
          <text
            x={slSvgX}
            y={barY + barH + 12}
            textAnchor="middle"
            fill="#ef4444"
            fontSize={8}
            fontFamily="monospace"
            opacity={0.7}
          >
            -{stopLossPct}%
          </text>
        </>
      )}

      {/* Take profit dashed line */}
      {tpSvgX !== null && (
        <>
          <line
            x1={tpSvgX}
            y1={barY - 6}
            x2={tpSvgX}
            y2={barY + barH + 2}
            stroke="#22c55e"
            strokeWidth={1.5}
            strokeDasharray="2 2"
          />
          <text
            x={tpSvgX}
            y={barY - 9}
            textAnchor="middle"
            fill="#22c55e"
            fontSize={9}
            fontFamily="monospace"
          >
            {tpPrice !== null ? formatPrice(tpPrice) : ""}
          </text>
          <text
            x={tpSvgX}
            y={barY + barH + 12}
            textAnchor="middle"
            fill="#22c55e"
            fontSize={8}
            fontFamily="monospace"
            opacity={0.7}
          >
            +{takeProfitPct}%
          </text>
        </>
      )}

      {/* Entry price line */}
      <line
        x1={entrySvgX}
        y1={barY - 4}
        x2={entrySvgX}
        y2={barY + barH + 2}
        stroke="#5c6380"
        strokeWidth={1}
      />
      <text
        x={entrySvgX}
        y={barY + barH + 12}
        textAnchor="middle"
        fill="#5c6380"
        fontSize={8}
        fontFamily="monospace"
      >
        Entry
      </text>

      {/* Current price dot */}
      <circle
        cx={currentSvgX}
        cy={barY + barH / 2}
        r={3.5}
        fill={pnlPct >= 0 ? "#22c55e" : "#ef4444"}
        stroke="#f0f2f7"
        strokeWidth={1}
      />
      <text
        x={currentSvgX}
        y={barY - 9}
        textAnchor="middle"
        fill="#f0f2f7"
        fontSize={9}
        fontFamily="monospace"
        fontWeight="bold"
      >
        {formatPrice(currentPrice)}
      </text>
    </svg>
  );
}
