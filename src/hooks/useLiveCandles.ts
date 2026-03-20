"use client";

import { useCallback, useMemo, useState } from "react";
import { useWebSocketSubscription } from "./useWebSocketSubscription";

export interface LiveCandle {
  t: number; // open timestamp (seconds)
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

interface UseLiveCandlesOptions {
  mintAddress: string | null;
  interval: string;
  enabled?: boolean;
}

/**
 * Subscribes to real-time candle updates for a specific token and interval.
 */
export function useLiveCandles({
  mintAddress,
  interval,
  enabled = true,
}: UseLiveCandlesOptions) {
  const [lastCandle, setLastCandle] = useState<LiveCandle | null>(null);

  const channels = useMemo(
    () =>
      mintAddress && enabled ? [`candles:${mintAddress}:${interval}`] : [],
    [mintAddress, interval, enabled],
  );

  const onMessage = useCallback(
    (_channel: string, data: unknown) => {
      if (!data || typeof data !== "object") return;
      const raw = data as Record<string, unknown>;

      // The candle data comes in raw.candle from the backend candle-update event
      const candle = (raw.candle ?? raw) as Record<string, unknown>;
      if (candle.t == null && candle.o == null) return;

      setLastCandle({
        t: Number(candle.t ?? 0),
        o: Number(candle.o ?? 0),
        h: Number(candle.h ?? 0),
        l: Number(candle.l ?? 0),
        c: Number(candle.c ?? 0),
        v: Number(candle.v ?? 0),
      });
    },
    [],
  );

  const { connected } = useWebSocketSubscription({
    channels,
    onMessage,
    enabled: enabled && !!mintAddress,
  });

  return { lastCandle, connected };
}
