"use client";

import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { MiniChart } from "@/components/token/MiniChart";
import { TokenStats } from "./TokenStats";
import { SecuritySignals } from "./SecuritySignals";
import { TokenLinks } from "./TokenLinks";
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
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function SwipeCard({ token, onInfoTap }: SwipeCardProps) {
  const liveData = useTokenPrice(token.mintAddress);

  return (
    <div
      className="relative rounded-card p-3.5 sm:p-5 w-full space-y-3 no-select"
      style={{
        background: "linear-gradient(145deg, rgba(13,13,26,0.95) 0%, rgba(13,13,26,0.85) 100%)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(26,26,46,0.9)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,255,136,0.03), inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      {/* Compare + Watchlist — top right */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <CompareButton
          mintAddress={token.mintAddress}
          size={20}
        />
        <WatchlistButton
          token={{
            mintAddress: token.mintAddress,
            name: token.name,
            ticker: token.ticker,
            imageUri: token.imageUri,
          }}
          size={22}
        />
      </div>

      {/* Header — horizontal layout for compactness */}
      <div className="flex items-center gap-3">
        <TokenAvatar
          mintAddress={token.mintAddress}
          imageUri={token.imageUri}
          size={48}
          ticker={token.ticker}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2
              className="text-lg font-bold truncate"
              style={{
                background: "linear-gradient(135deg, #ffffff 0%, #b0b0c0 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              ${token.ticker}
            </h2>
            <RiskBadge level={token.riskLevel} />
          </div>
          <p className="text-xs text-text-secondary truncate">{token.name}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-text-muted whitespace-nowrap">
            {timeAgo(token.detectedAt)}
          </span>
          {onInfoTap && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInfoTap(token);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-6 h-6 flex items-center justify-center rounded-full text-text-muted hover:text-green transition-all duration-200 text-[10px] font-semibold"
              style={{
                background: "rgba(13,13,26,0.8)",
                border: "1px solid rgba(26,26,46,0.9)",
                backdropFilter: "blur(8px)",
              }}
              aria-label={`View details for ${token.name}`}
            >
              i
            </button>
          )}
        </div>
      </div>

      {/* Mini price chart */}
      <MiniChart mintAddress={token.mintAddress} />

      {/* Stats — market cap, grid, bonding curve, buy/sell */}
      <div className="relative">
        {liveData && (
          <div className="absolute top-0 right-0 flex items-center gap-1 z-10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green" />
            </span>
            <span className="text-[9px] font-bold text-green uppercase tracking-wider">
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

      {/* Description */}
      {token.description && (
        <p className="text-xs text-text-secondary text-center italic line-clamp-2">
          &quot;{token.description}&quot;
        </p>
      )}

      {/* Token links */}
      <TokenLinks mintAddress={token.mintAddress} />
    </div>
  );
}
