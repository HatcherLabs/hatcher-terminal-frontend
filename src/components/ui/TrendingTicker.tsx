"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFeed } from "@/components/providers/FeedProvider";
import { useSolPriceContext } from "@/components/providers/SolPriceProvider";

const MAX_TRENDING = 20;

function formatMcap(mcapSol: number | null, solPrice: number): string {
  if (mcapSol === null) return "--";
  const usd = mcapSol * solPrice;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
}

function formatChange(value: number | null): string {
  if (value == null) return "";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function TrendingTicker() {
  const router = useRouter();
  const { tokens } = useFeed();
  const { solPrice } = useSolPriceContext();
  const [paused, setPaused] = useState(false);

  const trendingItems = useMemo(() => {
    return [...tokens]
      .filter((t) => t.marketCapSol !== null)
      .sort((a, b) => (b.marketCapSol ?? 0) - (a.marketCapSol ?? 0))
      .slice(0, MAX_TRENDING);
  }, [tokens]);

  const handleClick = useCallback(
    (mintAddress: string) => {
      router.push(`/token/${mintAddress}`);
    },
    [router]
  );

  if (trendingItems.length === 0) return null;

  // Duplicate for seamless loop
  const scrollItems = [...trendingItems, ...trendingItems];

  return (
    <div
      className="relative overflow-hidden select-none shrink-0"
      style={{
        height: 28,
        background: "#04060b",
        borderBottom: "1px solid #1a1f2e",
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Gradient fade edges */}
      <div
        className="absolute left-0 top-0 bottom-0 w-6 z-[1] pointer-events-none"
        style={{
          background: "linear-gradient(to right, #04060b, transparent)",
        }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-6 z-[1] pointer-events-none"
        style={{
          background: "linear-gradient(to left, #04060b, transparent)",
        }}
      />

      <div
        className="flex items-center h-full whitespace-nowrap ticker-scroll"
        style={{ animationPlayState: paused ? "paused" : "running" }}
      >
        {scrollItems.map((token, i) => {
          const change = token.priceChange5m;
          const isUp = change !== null && change > 0;
          const isDown = change !== null && change < 0;

          return (
            <button
              key={`${token.mintAddress}-${i}`}
              onClick={() => handleClick(token.mintAddress)}
              className="inline-flex items-center gap-1.5 shrink-0 h-full px-2.5 hover:bg-white/[0.03] transition-colors cursor-pointer"
              style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
            >
              {/* Ticker */}
              <span
                style={{
                  fontSize: 10,
                  color: "#9ca3b8",
                  fontWeight: 600,
                }}
              >
                ${token.ticker}
              </span>

              {/* Market cap */}
              <span
                style={{
                  fontSize: 10,
                  color: "#5c6380",
                }}
              >
                {formatMcap(token.marketCapSol, solPrice)}
              </span>

              {/* Price change */}
              {change !== null && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: isUp ? "#00d672" : isDown ? "#f23645" : "#5c6380",
                  }}
                >
                  {formatChange(change)}
                </span>
              )}

              {/* Separator dot */}
              <span
                style={{
                  fontSize: 8,
                  color: "#363d54",
                  marginLeft: 4,
                  marginRight: 2,
                }}
              >
                &bull;
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
