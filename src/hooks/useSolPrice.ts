"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const DEFAULT_SOL_PRICE = 150;
const REFRESH_INTERVAL = 60_000;
const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";

// Module-level cache so all consumers share the same value
let cachedPrice: number = DEFAULT_SOL_PRICE;
let lastFetchedAt = 0;

export function useSolPrice(): { solPrice: number; loading: boolean } {
  const [solPrice, setSolPrice] = useState<number>(cachedPrice);
  const [loading, setLoading] = useState<boolean>(lastFetchedAt === 0);
  const mountedRef = useRef(true);

  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch(COINGECKO_URL);
      if (!res.ok) return;
      const data = await res.json();
      const price = data?.solana?.usd;
      if (typeof price === "number" && price > 0) {
        cachedPrice = price;
        lastFetchedAt = Date.now();
        if (mountedRef.current) {
          setSolPrice(price);
          setLoading(false);
        }
      }
    } catch {
      // Keep using cached/default price on failure
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // If cache is fresh (< 60s), use it; otherwise fetch immediately
    const age = Date.now() - lastFetchedAt;
    if (age >= REFRESH_INTERVAL || lastFetchedAt === 0) {
      fetchPrice();
    } else {
      setSolPrice(cachedPrice);
      setLoading(false);
    }

    const interval = setInterval(fetchPrice, REFRESH_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchPrice]);

  return { solPrice, loading };
}
