"use client";

import { AnimatedPrice } from "@/components/ui/AnimatedPrice";
import { useSolPriceContext } from "@/components/providers/SolPriceProvider";
const BONDING_GRADUATION_SOL = 85;

interface TokenStatsProps {
  marketCapSol: number | null;
  holders: number | null;
  volume1h: number | null;
  buyCount: number | null;
  sellCount: number | null;
  devHoldPct: number | null;
  priceChange5m: number | null;
  priceChange1h: number | null;
  bondingProgress: number | null;
  isGraduated: boolean;
  createdAt: string;
  liveMarketCapUsd?: number | null;
  livePriceChange5m?: number | null;
  livePriceChange1h?: number | null;
  liveVolume1h?: number | null;
  liveBuyCount?: number | null;
  liveSellCount?: number | null;
}

function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return "\u2014";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(n < 10 ? 1 : 0);
}

function tokenAge(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

/* ---------- Bonding Curve Progress Bar ---------- */
function BondingCurveBar({
  progress,
  isGraduated,
}: {
  progress: number | null;
  isGraduated: boolean;
}) {
  if (isGraduated) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-bg-elevated overflow-hidden">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-green to-amber" />
        </div>
        <span className="text-[10px] font-bold text-amber tracking-wider whitespace-nowrap">
          MIGRATED
        </span>
      </div>
    );
  }

  const pct = progress != null ? Math.min(Math.max(progress, 0), 100) : 0;
  const solInCurve = (pct / 100) * BONDING_GRADUATION_SOL;

  // Color logic: gray < 30%, green 30-70%, gold > 70%
  let barColor = "bg-text-muted";
  if (pct >= 70) barColor = "bg-amber";
  else if (pct >= 30) barColor = "bg-green";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-text-muted uppercase tracking-wider">
          Bonding Curve
        </span>
        <span className="text-text-secondary font-mono">
          {solInCurve.toFixed(1)} / {BONDING_GRADUATION_SOL} SOL
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-bg-elevated overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-text-muted text-right font-mono">
        {pct.toFixed(1)}% to Raydium
      </p>
    </div>
  );
}

/* ---------- Buy / Sell Pressure Bar ---------- */
function BuySellBar({
  buyCount,
  sellCount,
}: {
  buyCount: number | null;
  sellCount: number | null;
}) {
  const buys = buyCount ?? 0;
  const sells = sellCount ?? 0;
  const total = buys + sells;

  if (total === 0) return null;

  const buyPct = (buys / total) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-text-muted uppercase tracking-wider">
          Buy / Sell
        </span>
        <span className="text-text-secondary font-mono">
          <span className="text-green">{buys}</span>
          {" / "}
          <span className="text-red">{sells}</span>
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden flex">
        <div
          className="h-full bg-green rounded-l-full"
          style={{ width: `${buyPct}%` }}
        />
        <div
          className="h-full bg-red rounded-r-full"
          style={{ width: `${100 - buyPct}%` }}
        />
      </div>
    </div>
  );
}

/* ---------- Main Stats Component ---------- */
export function TokenStats({
  marketCapSol,
  holders,
  volume1h,
  buyCount,
  sellCount,
  devHoldPct,
  priceChange5m,
  priceChange1h,
  bondingProgress,
  isGraduated,
  createdAt,
  liveMarketCapUsd,
  livePriceChange5m,
  livePriceChange1h,
  liveVolume1h,
  liveBuyCount,
  liveSellCount,
}: TokenStatsProps) {
  const { solPrice } = useSolPriceContext();
  const staticMcapUsd = marketCapSol != null ? marketCapSol * solPrice : null;
  const mcapUsd = liveMarketCapUsd != null ? liveMarketCapUsd : staticMcapUsd;
  const effectivePriceChange5m = livePriceChange5m != null ? livePriceChange5m : priceChange5m;
  const effectivePriceChange1h = livePriceChange1h != null ? livePriceChange1h : priceChange1h;
  const effectiveVolume1h = liveVolume1h != null ? liveVolume1h : volume1h;
  const effectiveBuyCount = liveBuyCount != null ? liveBuyCount : buyCount;
  const effectiveSellCount = liveSellCount != null ? liveSellCount : sellCount;
  const devWarn = devHoldPct !== null && devHoldPct > 10;

  return (
    <div className="space-y-3">
      {/* Market cap - prominent with animated price */}
      <div className="text-center">
        <p className="text-[10px] text-text-muted uppercase tracking-wider">
          Market Cap
        </p>
        <AnimatedPrice
          value={mcapUsd}
          format="usd"
          showArrow
          className="text-2xl font-bold text-text-primary leading-tight"
        />
        {mcapUsd != null && marketCapSol != null && (
          <p className="text-[10px] text-text-muted font-mono">
            {formatNumber(marketCapSol)} SOL
          </p>
        )}
      </div>

      {/* Price change indicators with animated flash */}
      {(effectivePriceChange5m !== null || effectivePriceChange1h !== null) && (
        <div className="flex items-center justify-center gap-3 text-xs">
          {effectivePriceChange5m !== null && (
            <span className="inline-flex items-center gap-1">
              <span className="text-text-muted text-[10px]">5m:</span>
              <AnimatedPrice
                value={effectivePriceChange5m}
                format="percent"
                showArrow
                className="text-xs"
              />
            </span>
          )}
          {effectivePriceChange1h !== null && (
            <span className="inline-flex items-center gap-1">
              <span className="text-text-muted text-[10px]">1h:</span>
              <AnimatedPrice
                value={effectivePriceChange1h}
                format="percent"
                showArrow
                className="text-xs"
              />
            </span>
          )}
        </div>
      )}

      {/* Stats grid - 4 columns */}
      <div className="grid grid-cols-4 gap-px bg-border rounded-lg overflow-hidden">
        <div className="bg-bg-elevated px-2 py-2 text-center">
          <p className="text-[10px] text-text-muted uppercase tracking-wider">
            Holders
          </p>
          <p className="text-sm font-mono font-medium text-text-primary mt-0.5">
            {holders !== null ? formatNumber(holders) : "\u2014"}
          </p>
        </div>
        <div className="bg-bg-elevated px-2 py-2 text-center">
          <p className="text-[10px] text-text-muted uppercase tracking-wider">
            Vol 1h
          </p>
          <p className="text-sm font-mono font-medium text-text-primary mt-0.5">
            {effectiveVolume1h ? `$${formatNumber(effectiveVolume1h)}` : "\u2014"}
          </p>
        </div>
        <div className="bg-bg-elevated px-2 py-2 text-center">
          <p className="text-[10px] text-text-muted uppercase tracking-wider">
            Dev %
          </p>
          <p
            className={`text-sm font-mono font-medium mt-0.5 ${
              devWarn ? "text-red" : "text-text-primary"
            }`}
          >
            {devHoldPct !== null ? `${devHoldPct.toFixed(1)}%` : "\u2014"}
          </p>
        </div>
        <div className="bg-bg-elevated px-2 py-2 text-center">
          <p className="text-[10px] text-text-muted uppercase tracking-wider">
            Age
          </p>
          <p className="text-sm font-mono font-medium text-text-primary mt-0.5">
            {tokenAge(createdAt)}
          </p>
        </div>
      </div>

      {/* Bonding curve progress */}
      <BondingCurveBar
        progress={bondingProgress}
        isGraduated={isGraduated}
      />

      {/* Buy/Sell pressure */}
      <BuySellBar buyCount={effectiveBuyCount} sellCount={effectiveSellCount} />
    </div>
  );
}
