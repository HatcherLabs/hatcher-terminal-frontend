"use client";

import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { HeatBadge } from "@/components/ui/HeatBadge";
import { SecurityDots } from "@/components/ui/SecurityDots";
import { MiniChart } from "@/components/token/MiniChart";
import { TokenStats } from "./TokenStats";
import { SecuritySignals } from "./SecuritySignals";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { WatchlistButton } from "@/components/ui/WatchlistButton";
import { CompareButton } from "@/components/ui/CompareButton";
import type { TokenData } from "@/types/token";

interface SwipeCardProps {
  token: TokenData;
  onInfoTap?: (token: TokenData) => void;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function SwipeCard({ token, onInfoTap }: SwipeCardProps) {
  const liveData = useTokenPrice(token.mintAddress);
  const heat = ((token as unknown as Record<string, unknown>).heatScore as number | undefined) ?? 50;
  const riskFactors = token.riskFactors ?? {};

  return (
    <div
      className="relative rounded-[14px] w-full no-select overflow-hidden"
      style={{
        background: "#0a0d14",
        border: "1px solid #1a1f2e",
        boxShadow: "0 8px 32px #04060bcc",
      }}
    >
      {/* Compare + Watchlist — top right */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <CompareButton mintAddress={token.mintAddress} size={20} />
        <WatchlistButton
          token={{ mintAddress: token.mintAddress, name: token.name, ticker: token.ticker, imageUri: token.imageUri }}
          size={22}
        />
      </div>

      {/* Header — avatar + name + risk + heat */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2.5">
        <TokenAvatar
          mintAddress={token.mintAddress}
          imageUri={token.imageUri}
          size={44}
          ticker={token.ticker}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-extrabold truncate" style={{ color: "#eef0f6" }}>
              ${token.ticker}
            </span>
            <SecurityDots
              lpBurned={!!riskFactors.lpBurned}
              mintRevoked={!!riskFactors.mintRevoked}
              devHoldPct={token.devHoldPct ?? undefined}
            />
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] font-mono" style={{ color: "#363d54" }}>
              {token.mintAddress.slice(0, 6)}...{token.mintAddress.slice(-4)}
            </span>
            <span
              className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{ background: "#5c638015", color: "#5c6380", border: "1px solid #5c638025" }}
            >
              {timeAgo(token.detectedAt)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <RiskBadge level={token.riskLevel} />
          <HeatBadge heat={heat} size="md" />
        </div>
      </div>

      {/* Mini price chart */}
      <div className="px-4 py-1">
        <MiniChart mintAddress={token.mintAddress} />
      </div>

      {/* Stats grid — matching ui-demo.jsx 3-column layout */}
      <div className="relative">
        {liveData && (
          <div className="absolute top-1 right-3 flex items-center gap-1 z-10">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#00d672" }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "#00d672" }} />
            </span>
            <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: "#00d672" }}>
              Live
            </span>
          </div>
        )}
        <TokenStats
          marketCapSol={token.marketCapSol}
          holders={token.holders}
          volume1h={token.volume1h}
          buyCount={token.buyCount}
          sellCount={token.sellCount}
          devHoldPct={token.devHoldPct}
          priceChange5m={token.priceChange5m ?? null}
          priceChange1h={token.priceChange1h ?? null}
          bondingProgress={token.bondingProgress ?? null}
          isGraduated={token.isGraduated}
          createdAt={token.createdAt}
          liveMarketCapUsd={liveData?.marketCapUsd}
          livePriceChange5m={liveData?.priceChange5m}
          livePriceChange1h={liveData?.priceChange1h}
          liveVolume1h={liveData?.volume1h}
          liveBuyCount={liveData?.buyCount1h}
          liveSellCount={liveData?.sellCount1h}
        />
      </div>

      {/* Security signals */}
      <SecuritySignals
        riskLevel={token.riskLevel}
        riskFactors={token.riskFactors}
        devHoldPct={token.devHoldPct}
      />

      {/* Bottom bar — security badges + Terminal button */}
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{ borderTop: "1px solid #1a1f2e" }}
      >
        <div className="flex items-center gap-1">
          {[
            { ok: !!riskFactors.lpBurned, label: "LP" },
            { ok: !!riskFactors.mintRevoked, label: "Mint" },
            { ok: !(riskFactors.isDevBundled as boolean | undefined), label: "Clean" },
          ].map((x) => (
            <span
              key={x.label}
              className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded"
              style={{
                background: `${x.ok ? "#00d672" : "#f23645"}15`,
                color: x.ok ? "#00d672" : "#f23645",
                border: `1px solid ${x.ok ? "#00d672" : "#f23645"}25`,
              }}
            >
              {x.ok ? "✓" : "✗"} {x.label}
            </span>
          ))}
        </div>

        {onInfoTap && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInfoTap(token);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-[10px] font-semibold px-2.5 py-1 rounded-[5px] transition-colors"
            style={{
              background: "#1f2435",
              border: "1px solid #1a1f2e",
              color: "#9ca3b8",
            }}
            aria-label={`View details for ${token.name}`}
          >
            Terminal →
          </button>
        )}
      </div>
    </div>
  );
}
