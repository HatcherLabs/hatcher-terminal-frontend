"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useSolPriceContext } from "@/components/providers/SolPriceProvider";

interface TrendingToken {
  mintAddress: string;
  name: string;
  ticker: string;
  imageUri: string | null;
  priceSol: number | null;
  priceChangePercent24h: number | null;
  marketCapSol: number | null;
  heatScore: number;
}

function formatMcap(n: number | null | undefined): string {
  if (n === null || n === undefined) return "\u2014";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function TrendingBar() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const [trending, setTrending] = useState<TrendingToken[]>([]);
  const { solPrice } = useSolPriceContext();

  const fetchTrending = useCallback(async () => {
    try {
      const res = await api.raw("/api/tokens/trending?limit=8");
      if (res.ok) {
        const { data } = await res.json();
        setTrending(data);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchTrending();
    const interval = setInterval(fetchTrending, 30_000);
    return () => clearInterval(interval);
  }, [fetchTrending]);

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
            const change = token.priceChangePercent24h;
            const changeColor = change !== null && change >= 0 ? "#00d672" : "#f23645";
            const changeText =
              change !== null
                ? `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`
                : "\u2014";
            const mcapUsd =
              token.marketCapSol != null ? token.marketCapSol * solPrice : null;
            const letter = (token.ticker || token.name || "?")[0].toUpperCase();

            return (
              <Link
                key={`${token.mintAddress}-${i}`}
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
