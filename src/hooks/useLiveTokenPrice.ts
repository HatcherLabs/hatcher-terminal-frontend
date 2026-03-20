"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useWebSocketSubscription } from "./useWebSocketSubscription";
import { api } from "@/lib/api";
import type { LiveTokenData } from "./useTokenPrice";

interface UseLiveTokenPriceOptions {
  mintAddress: string | null;
  enabled?: boolean;
}

/**
 * Real-time token price via WebSocket with HTTP fallback.
 * Subscribes to `price:{mintAddress}` channel for instant updates.
 * Falls back to polling if WS data doesn't arrive within 8s.
 */
export function useLiveTokenPrice({
  mintAddress,
  enabled = true,
}: UseLiveTokenPriceOptions): LiveTokenData | null {
  const [data, setData] = useState<LiveTokenData | null>(null);
  const lastWsUpdate = useRef(0);
  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const channels = useMemo(
    () => (mintAddress && enabled ? [`price:${mintAddress}`] : []),
    [mintAddress, enabled],
  );

  const onMessage = useCallback((_channel: string, raw: unknown) => {
    if (!raw || typeof raw !== "object") return;
    const d = raw as Record<string, unknown>;

    lastWsUpdate.current = Date.now();

    setData({
      priceSol: d.priceSol != null ? Number(d.priceSol) : null,
      priceUsd: d.priceUsd != null ? Number(d.priceUsd) : null,
      marketCapSol: d.marketCapSol != null ? Number(d.marketCapSol) : null,
      marketCapUsd: d.marketCapUsd != null ? Number(d.marketCapUsd) : null,
      bondingProgress: d.bondingProgress != null ? Number(d.bondingProgress) : null,
      complete: Boolean(d.complete),
      volume1h: d.volume1h != null ? Number(d.volume1h) : null,
      priceChange5m: d.priceChange5m != null ? Number(d.priceChange5m) : null,
      priceChange1h: d.priceChange1h != null ? Number(d.priceChange1h) : null,
      priceChange6h: d.priceChange6h != null ? Number(d.priceChange6h) : null,
      priceChange24h: d.priceChange24h != null ? Number(d.priceChange24h) : null,
      buyCount1h: d.buyCount1h != null ? Number(d.buyCount1h) : null,
      sellCount1h: d.sellCount1h != null ? Number(d.sellCount1h) : null,
      liquidity: d.liquidity != null ? Number(d.liquidity) : null,
      source: String(d.source ?? "ws"),
      lastUpdated: Number(d.lastUpdated ?? Date.now()),
    });
  }, []);

  const { connected } = useWebSocketSubscription({
    channels,
    onMessage,
    enabled: enabled && !!mintAddress,
  });

  // Fallback: if WS isn't delivering data, poll HTTP every 8s
  useEffect(() => {
    if (!mintAddress || !enabled) {
      setData(null);
      return;
    }

    // Initial fetch (before WS connects)
    async function fetchOnce() {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await api.raw(`/api/tokens/${mintAddress}/live`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setData({
              priceSol: json.data.priceSol,
              priceUsd: json.data.priceUsd,
              marketCapSol: json.data.marketCapSol,
              marketCapUsd: json.data.marketCapUsd,
              bondingProgress: json.data.bondingProgress,
              complete: json.data.complete ?? false,
              volume1h: json.data.volume1h,
              priceChange5m: json.data.priceChange5m,
              priceChange1h: json.data.priceChange1h,
              priceChange6h: json.data.priceChange6h ?? null,
              priceChange24h: json.data.priceChange24h ?? null,
              buyCount1h: json.data.buyCount1h,
              sellCount1h: json.data.sellCount1h,
              liquidity: json.data.liquidity,
              source: json.data.source ?? "http",
              lastUpdated: json.data.lastUpdated ?? Date.now(),
            });
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    fetchOnce();

    // Fallback polling — only fires if WS hasn't updated recently
    fallbackRef.current = setInterval(() => {
      const sinceLastWs = Date.now() - lastWsUpdate.current;
      if (sinceLastWs > 8000) {
        fetchOnce();
      }
    }, 8000);

    return () => {
      if (fallbackRef.current) clearInterval(fallbackRef.current);
      abortRef.current?.abort();
    };
  }, [mintAddress, enabled]);

  return data;
}
