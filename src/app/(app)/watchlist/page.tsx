"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWatchlist, WatchlistItem } from "@/components/providers/WatchlistProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";

// ---- helpers ----

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---- types ----

interface LivePrice {
  priceSol?: number;
  priceUsd?: number;
  marketCapUsd?: number;
  priceChange1h?: number;
}

// ---- component ----

export default function WatchlistPage() {
  const router = useRouter();
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const [livePrices, setLivePrices] = useState<Record<string, LivePrice>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLivePrices = useCallback(async (items: WatchlistItem[]) => {
    if (items.length === 0) return;
    setLoadingPrices(true);
    const prices: Record<string, LivePrice> = {};

    await Promise.allSettled(
      items.map(async (item) => {
        try {
          const res = await api.raw(`/api/tokens/${item.mintAddress}/live`);
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.data) {
              prices[item.mintAddress] = json.data;
            }
          }
        } catch {
          // Silently ignore individual fetch failures
        }
      })
    );

    setLivePrices(prices);
    setLoadingPrices(false);
  }, []);

  // Fetch prices on mount and every 15s
  useEffect(() => {
    fetchLivePrices(watchlist);

    intervalRef.current = setInterval(() => {
      fetchLivePrices(watchlist);
    }, 15_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [watchlist, fetchLivePrices]);

  return (
    <div className="flex flex-col pt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-bold text-text-primary tracking-tight">
          Watchlist
        </h1>
        {watchlist.length > 0 && (
          <span className="text-xs text-text-muted">
            {watchlist.length} token{watchlist.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Empty state */}
      {watchlist.length === 0 ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" width={48} height={48} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          }
          title="No tokens watchlisted"
          description="Swipe up on tokens to save them here, or tap the star icon on any token card."
          action={{
            label: "Go to Discover",
            onClick: () => router.push("/swipe"),
          }}
        />
      ) : (
        <div className="flex flex-col gap-[1px]">
          {watchlist.map((item) => {
            const live = livePrices[item.mintAddress];
            const change1h = live?.priceChange1h ?? null;

            return (
              <div
                key={item.mintAddress}
                className="w-full flex items-center gap-3 px-3 py-3 bg-bg-card border border-border rounded-xl hover:bg-bg-elevated hover:border-border-hover transition-all duration-200 cursor-pointer group"
                onClick={() => router.push(`/token/${item.mintAddress}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") router.push(`/token/${item.mintAddress}`);
                }}
              >
                {/* Avatar */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-bg-elevated overflow-hidden">
                  {item.imageUri ? (
                    <img
                      src={item.imageUri}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted text-sm font-bold">
                      {item.ticker.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Name + ticker + time added */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-text-primary truncate">
                      {item.name}
                    </span>
                    <span className="text-xs text-text-muted flex-shrink-0">
                      ${item.ticker}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px]">
                    <span className="text-text-muted">
                      Added {relativeTime(item.addedAt)}
                    </span>
                    {live?.marketCapUsd != null && (
                      <>
                        <span className="text-text-faint">|</span>
                        <span className="text-green font-mono">
                          {formatUsd(live.marketCapUsd)}
                        </span>
                      </>
                    )}
                    {change1h !== null && (
                      <>
                        <span className="text-text-faint">|</span>
                        <span
                          className={`font-mono ${
                            change1h > 0
                              ? "text-green"
                              : change1h < 0
                                ? "text-red"
                                : "text-text-muted"
                          }`}
                        >
                          {change1h > 0 ? "+" : ""}
                          {change1h.toFixed(1)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Price + remove */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {live?.priceUsd != null && (
                    <span className="text-xs font-mono text-text-secondary">
                      ${live.priceUsd < 0.01
                        ? live.priceUsd.toExponential(1)
                        : live.priceUsd.toFixed(4)}
                    </span>
                  )}
                  {loadingPrices && !live && (
                    <span className="w-3 h-3 border border-text-faint/30 border-t-text-faint rounded-full animate-spin" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromWatchlist(item.mintAddress);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-text-faint hover:text-red hover:bg-red/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    aria-label={`Remove ${item.name} from watchlist`}
                  >
                    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
