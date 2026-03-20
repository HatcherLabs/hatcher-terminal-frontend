"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFeed } from "@/components/providers/FeedProvider";
import { api } from "@/lib/api";

const SOL_PRICE_USD = Number(process.env.NEXT_PUBLIC_SOL_PRICE_USD || 150);
const TICKER_REFRESH_INTERVAL = 30_000;
const MAX_TRENDING = 12;

interface TickerItem {
  mintAddress: string;
  ticker: string;
  priceChange: number | null;
  isPosition: boolean;
}

interface PositionResponse {
  id: string;
  mintAddress: string;
  pnlPercent: number | null;
  token: {
    ticker: string;
  };
}

interface TrendingToken {
  mintAddress: string;
  ticker: string;
  priceChange5m: number | null;
  marketCapSol: number | null;
}

function formatChangePercent(value: number | null | undefined): string {
  if (value == null) return "";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

interface PriceTickerProps {
  dismissable?: boolean;
  onDismiss?: () => void;
}

export function PriceTicker({ dismissable = false, onDismiss }: PriceTickerProps) {
  const router = useRouter();
  const { tokens: feedTokens } = useFeed();
  const [items, setItems] = useState<TickerItem[]>([]);
  const [solPrice] = useState<number>(SOL_PRICE_USD);
  const [paused, setPaused] = useState(false);
  const mountedRef = useRef(true);

  const buildTickerData = useCallback(async () => {
    const positionItems: TickerItem[] = [];
    const trendingItems: TickerItem[] = [];
    const seenMints = new Set<string>();

    // 1. Fetch open positions
    try {
      const res = await api.raw("/api/positions?status=open");
      if (res.ok) {
        const { data } = await res.json();
        if (data && data.length > 0) {
          for (const p of data as PositionResponse[]) {
            positionItems.push({
              mintAddress: p.mintAddress,
              ticker: p.token.ticker,
              priceChange: p.pnlPercent,
              isPosition: true,
            });
            seenMints.add(p.mintAddress);
          }
        }
      }
    } catch {
      // Non-critical — continue
    }

    // 2. Build trending from feed tokens or explore API
    if (feedTokens.length >= 5) {
      const sorted = [...feedTokens]
        .filter((t) => t.marketCapSol !== null && !seenMints.has(t.mintAddress))
        .sort((a, b) => (b.marketCapSol ?? 0) - (a.marketCapSol ?? 0))
        .slice(0, MAX_TRENDING);

      for (const t of sorted) {
        trendingItems.push({
          mintAddress: t.mintAddress,
          ticker: t.ticker,
          priceChange: t.priceChange5m,
          isPosition: false,
        });
      }
    } else {
      try {
        const res = await api.raw(`/api/tokens/explore?category=new&limit=${MAX_TRENDING}&offset=0`);
        const json = await res.json();
        if (json.success && json.data.length > 0) {
          for (const t of json.data as TrendingToken[]) {
            if (!seenMints.has(t.mintAddress)) {
              trendingItems.push({
                mintAddress: t.mintAddress,
                ticker: t.ticker,
                priceChange: t.priceChange5m ?? null,
                isPosition: false,
              });
            }
          }
        }
      } catch {
        // Non-critical
      }
    }

    if (!mountedRef.current) return;

    const combined = [...positionItems, ...trendingItems];
    setItems(combined);
  }, [feedTokens]);

  // Initial fetch + periodic refresh every 30s
  useEffect(() => {
    buildTickerData();
    const interval = setInterval(buildTickerData, TICKER_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [buildTickerData]);

  // Live-update price changes from feed
  useEffect(() => {
    if (feedTokens.length === 0) return;

    setItems((prev) =>
      prev.map((item) => {
        if (item.isPosition) return item; // positions use pnlPercent, not feed data
        const feedToken = feedTokens.find((t) => t.mintAddress === item.mintAddress);
        if (feedToken && feedToken.priceChange5m !== undefined) {
          return { ...item, priceChange: feedToken.priceChange5m };
        }
        return item;
      })
    );
  }, [feedTokens]);

  // Cleanup ref
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleItemClick = useCallback(
    (mintAddress: string) => {
      router.push(`/token/${mintAddress}`);
    },
    [router]
  );

  // Fallback: show SOL price if no data
  const showFallback = items.length === 0;

  // Duplicate items for seamless infinite scroll
  const scrollItems = showFallback ? [] : [...items, ...items];

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

      {showFallback ? (
        /* Static SOL price fallback */
        <div className="flex items-center justify-center h-full">
          <span className="text-[11px] font-mono text-text-secondary">
            <span className="font-semibold">SOL</span>{" "}
            <span className="text-text-primary">${solPrice.toLocaleString()}</span>
          </span>
        </div>
      ) : (
        /* Scrolling ticker */
        <div
          className="flex items-center h-full whitespace-nowrap ticker-scroll"
          style={{
            animationPlayState: paused ? "paused" : "running",
          }}
        >
          {scrollItems.map((item, i) => (
            <TickerItemButton
              key={`${item.mintAddress}-${i}`}
              item={item}
              onClick={handleItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TickerItemButton({
  item,
  onClick,
}: {
  item: TickerItem;
  onClick: (mint: string) => void;
}) {
  const change = item.priceChange;
  const isUp = change !== null && change > 0;
  const isDown = change !== null && change < 0;
  const changeColor = isUp ? "text-green" : isDown ? "text-red" : "text-text-muted";

  return (
    <button
      onClick={() => onClick(item.mintAddress)}
      className="inline-flex items-center gap-1 px-3 text-[11px] font-mono shrink-0 h-full hover:bg-bg-hover/50 transition-colors cursor-pointer"
    >
      <span className="text-text-secondary font-semibold">${item.ticker}</span>
      {change !== null && (
        <span className={changeColor}>
          {formatChangePercent(change)}
        </span>
      )}
      {item.isPosition && (
        <span className="text-accent/60 text-[9px] ml-0.5">POS</span>
      )}
      <span className="text-border mx-1">|</span>
    </button>
  );
}
