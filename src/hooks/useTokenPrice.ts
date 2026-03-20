import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";

export interface LiveTokenData {
  priceSol: number | null;
  priceUsd: number | null;
  marketCapSol: number | null;
  marketCapUsd: number | null;
  bondingProgress: number | null;
  complete: boolean;
  volume1h: number | null;
  priceChange5m: number | null;
  priceChange1h: number | null;
  buyCount1h: number | null;
  sellCount1h: number | null;
  liquidity: number | null;
  source: string;
  lastUpdated: number;
}

const POLL_INTERVAL = 5_000; // 5 seconds

export function useTokenPrice(
  mintAddress: string | null,
  enabled = true
): LiveTokenData | null {
  const [data, setData] = useState<LiveTokenData | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPrice = useCallback(async (mint: string) => {
    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await api.raw(`/api/tokens/${mint}/live`, {
        signal: controller.signal,
      });
      if (!res.ok) return;
      const json = await res.json();
      if (!json.success) return;

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
        buyCount1h: json.data.buyCount1h,
        sellCount1h: json.data.sellCount1h,
        liquidity: json.data.liquidity,
        source: json.data.source ?? "unknown",
        lastUpdated: json.data.lastUpdated ?? Date.now(),
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Silently ignore fetch errors — stale data is fine
    }
  }, []);

  useEffect(() => {
    if (!mintAddress || !enabled) {
      setData(null);
      return;
    }

    // Fetch immediately
    fetchPrice(mintAddress);

    // Then poll
    intervalRef.current = setInterval(() => {
      fetchPrice(mintAddress);
    }, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      abortRef.current?.abort();
    };
  }, [mintAddress, enabled, fetchPrice]);

  return data;
}
