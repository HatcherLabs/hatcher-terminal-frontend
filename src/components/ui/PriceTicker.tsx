"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useFeed } from "@/components/providers/FeedProvider";
import { api } from "@/lib/api";

const SOL_PRICE_USD = Number(process.env.NEXT_PUBLIC_SOL_PRICE_USD || 150);
const TICKER_FETCH_INTERVAL = 15_000;
const MAX_ITEMS = 15;

interface TickerToken {
  mintAddress: string;
  ticker: string;
  marketCapSol: number | null;
  priceChange5m: number | null;
}

function formatPrice(solValue: number | null): string {
  if (solValue === null) return "\u2014";
  const usd = solValue * SOL_PRICE_USD;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${usd.toFixed(0)}`;
}

interface PriceTickerProps {
  dismissable?: boolean;
  onDismiss?: () => void;
}

export function PriceTicker({ dismissable = false, onDismiss }: PriceTickerProps) {
  const { tokens: feedTokens } = useFeed();
  const [tickerTokens, setTickerTokens] = useState<TickerToken[]>([]);
  const [paused, setPaused] = useState(false);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build ticker data from feed tokens or fetch from explore API
  const buildTickerData = useCallback(async () => {
    // First try to use feed tokens if we have enough
    if (feedTokens.length >= 5) {
      const sorted = [...feedTokens]
        .filter((t) => t.marketCapSol !== null)
        .sort((a, b) => (b.marketCapSol ?? 0) - (a.marketCapSol ?? 0))
        .slice(0, MAX_ITEMS);

      setTickerTokens(
        sorted.map((t) => ({
          mintAddress: t.mintAddress,
          ticker: t.ticker,
          marketCapSol: t.marketCapSol,
          priceChange5m: t.priceChange5m,
        }))
      );
      return;
    }

    // Fallback: fetch from explore API
    try {
      const res = await api.raw(`/api/tokens/explore?category=new&limit=${MAX_ITEMS}&offset=0`);
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setTickerTokens(
          json.data.slice(0, MAX_ITEMS).map((t: TickerToken) => ({
            mintAddress: t.mintAddress,
            ticker: t.ticker,
            marketCapSol: t.marketCapSol,
            priceChange5m: t.priceChange5m ?? null,
          }))
        );
      }
    } catch {
      // Silently fail — ticker is non-critical
    }
  }, [feedTokens]);

  useEffect(() => {
    buildTickerData();

    // Periodically refresh
    const interval = setInterval(buildTickerData, TICKER_FETCH_INTERVAL);
    const timeoutRef = fetchTimeoutRef;
    return () => {
      clearInterval(interval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [buildTickerData]);

  // Update prices from feed in real time
  useEffect(() => {
    if (feedTokens.length === 0) return;

    setTickerTokens((prev) =>
      prev.map((item) => {
        const feedToken = feedTokens.find((t) => t.mintAddress === item.mintAddress);
        if (feedToken && feedToken.marketCapSol !== null) {
          return {
            ...item,
            marketCapSol: feedToken.marketCapSol,
            priceChange5m: feedToken.priceChange5m,
          };
        }
        return item;
      })
    );
  }, [feedTokens]);

  if (tickerTokens.length === 0) return null;

  // Duplicate the items for seamless loop
  const items = [...tickerTokens, ...tickerTokens];

  return (
    <div
      className="relative h-7 bg-bg-primary border-y border-border overflow-hidden select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Dismiss button */}
      {dismissable && (
        <button
          onClick={onDismiss}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-4 h-4 flex items-center justify-center rounded bg-bg-elevated/80 text-text-faint hover:text-text-muted transition-colors text-[10px] leading-none"
          aria-label="Dismiss ticker"
        >
          &times;
        </button>
      )}

      {/* Gradient fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-bg-primary to-transparent z-[1] pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-bg-primary to-transparent z-[1] pointer-events-none" />

      {/* Scrolling content */}
      <div
        className="flex items-center h-full whitespace-nowrap ticker-scroll"
        style={{
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {items.map((token, i) => (
          <TickerItem key={`${token.mintAddress}-${i}`} token={token} />
        ))}
      </div>
    </div>
  );
}

function TickerItem({ token }: { token: TickerToken }) {
  const change = token.priceChange5m;
  const isUp = change !== null && change > 0;
  const isDown = change !== null && change < 0;

  return (
    <span className="inline-flex items-center gap-1.5 px-3 text-[11px] font-mono shrink-0">
      <span className="text-text-secondary font-semibold">${token.ticker}</span>
      <span className="text-text-primary">{formatPrice(token.marketCapSol)}</span>
      {change !== null && (
        <span
          className={`${isUp ? "text-green" : isDown ? "text-red" : "text-text-muted"}`}
        >
          {isUp ? "\u25B2" : isDown ? "\u25BC" : ""}{" "}
          {change > 0 ? "+" : ""}
          {change.toFixed(1)}%
        </span>
      )}
      <span className="text-border mx-1">|</span>
    </span>
  );
}
