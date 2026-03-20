"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import Link from "next/link";

interface TrendingToken {
  id: string;
  mintAddress: string;
  name: string;
  ticker: string;
  imageUri: string | null;
  marketCapSol: number | null;
  marketCapUsd: number | null;
  holders: number | null;
  buyCount: number | null;
  sellCount: number | null;
  volume1h?: number | null;
  priceChange5m?: number | null;
  priceChange1h?: number | null;
  bondingProgress?: number | null;
  heatScore?: number | null;
}

function computeTrendingHeat(t: TrendingToken): number {
  const buys = t.buyCount ?? 0;
  const holders = t.holders ?? 0;
  const volume = t.volume1h ?? 0;
  return buys * 2 + holders * 1.5 + volume * 0.001;
}

function formatMcap(n: number | null | undefined): string {
  if (n === null || n === undefined) return "\u2014";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

const SOL_PRICE_USD = Number(process.env.NEXT_PUBLIC_SOL_PRICE_USD || 150);

export function TrendingBar({ tokens }: { tokens: TrendingToken[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const trending = useMemo(() => {
    if (tokens.length === 0) return [];
    return [...tokens]
      .sort((a, b) => computeTrendingHeat(b) - computeTrendingHeat(a))
      .slice(0, 8);
  }, [tokens]);

  // Marquee auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || trending.length === 0) return;

    const speed = 0.4; // px per frame at 60fps

    const step = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (!paused && el) {
        el.scrollLeft += speed * (delta / 16.67);
        // Loop: when scrolled past half (duplicated content), reset
        const halfWidth = el.scrollWidth / 2;
        if (halfWidth > 0 && el.scrollLeft >= halfWidth) {
          el.scrollLeft -= halfWidth;
        }
      }
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [paused, trending.length]);

  if (trending.length === 0) return null;

  // Duplicate items for seamless loop
  const items = [...trending, ...trending];

  return (
    <div
      className="flex items-center gap-0 overflow-hidden"
      style={{
        height: 44,
        background: "#0a0d14",
        borderBottom: "1px solid #1a1f2e",
        borderRadius: 8,
        marginBottom: 8,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Label */}
      <div
        className="flex items-center gap-1.5 shrink-0 px-3"
        style={{
          height: "100%",
          borderRight: "1px solid #1a1f2e",
          background: "#04060b",
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>{"\uD83D\uDD25"}</span>
        <span
          className="font-bold uppercase tracking-wider"
          style={{
            fontFamily: "Lexend, sans-serif",
            fontSize: 10,
            color: "#f0a000",
            letterSpacing: "0.08em",
          }}
        >
          TRENDING
        </span>
      </div>

      {/* Scrollable strip */}
      <div
        ref={scrollRef}
        className="flex items-center gap-0 overflow-x-auto"
        style={{
          height: "100%",
          flex: 1,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style>{`[data-trending-scroll]::-webkit-scrollbar { display: none; }`}</style>
        <div
          data-trending-scroll=""
          className="flex items-center gap-0"
          style={{ width: "max-content" }}
        >
          {items.map((token, i) => {
            const change = token.priceChange5m ?? token.priceChange1h ?? null;
            const changeColor = change !== null && change >= 0 ? "#00d672" : "#f23645";
            const changeText =
              change !== null
                ? `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`
                : "\u2014";
            const mcapUsd =
              token.marketCapUsd ?? (token.marketCapSol != null ? token.marketCapSol * SOL_PRICE_USD : null);
            const letter = (token.ticker || token.name || "?")[0].toUpperCase();

            return (
              <Link
                key={`${token.id}-${i}`}
                href={`/token/${token.mintAddress}`}
                className="flex items-center gap-2 shrink-0 px-3 transition-colors"
                style={{
                  height: "100%",
                  borderRight: "1px solid #1a1f2e10",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#181c28";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                {/* Avatar */}
                <div
                  className="flex items-center justify-center shrink-0 rounded-full font-bold"
                  style={{
                    width: 24,
                    height: 24,
                    background: "#181c28",
                    color: "#9ca3b8",
                    fontSize: 11,
                    fontFamily: "JetBrains Mono, monospace",
                    border: "1px solid #1a1f2e",
                  }}
                >
                  {letter}
                </div>

                {/* Ticker */}
                <span
                  className="font-bold"
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 11,
                    color: "#eef0f6",
                    whiteSpace: "nowrap",
                  }}
                >
                  ${token.ticker}
                </span>

                {/* Price change */}
                <span
                  className="font-bold"
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 10,
                    color: changeColor,
                    whiteSpace: "nowrap",
                  }}
                >
                  {changeText}
                </span>

                {/* Mcap */}
                <span
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 10,
                    color: "#5c6380",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatMcap(mcapUsd)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
