"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useWebSocketSubscription } from "./useWebSocketSubscription";

export interface LiveTrade {
  id: string;
  type: "buy" | "sell";
  amountSol: number;
  priceUsd: number;
  maker: string;
  timestamp: string;
}

interface UseLiveTradesOptions {
  mintAddress: string | null;
  enabled?: boolean;
  maxTrades?: number;
}

/**
 * Subscribes to real-time trade feed for a specific token via WebSocket.
 * New trades are prepended to the list. Deduplication by trade ID.
 */
export function useLiveTrades({
  mintAddress,
  enabled = true,
  maxTrades = 50,
}: UseLiveTradesOptions) {
  const [trades, setTrades] = useState<LiveTrade[]>([]);
  const seenIds = useRef(new Set<string>());

  const channels = useMemo(
    () => (mintAddress && enabled ? [`trades:${mintAddress}`] : []),
    [mintAddress, enabled],
  );

  const onMessage = useCallback(
    (_channel: string, data: unknown) => {
      if (!data || typeof data !== "object") return;

      const raw = data as Record<string, unknown>;

      // Handle single trade
      if (raw.id || raw.txHash) {
        const id = String(raw.id ?? raw.txHash ?? `${Date.now()}`);
        if (seenIds.current.has(id)) return;
        seenIds.current.add(id);

        const trade: LiveTrade = {
          id,
          type: (raw.side as string)?.toLowerCase() === "sell" ? "sell" : "buy",
          amountSol: Number(raw.amountSol ?? raw.amount ?? 0),
          priceUsd: Number(raw.priceUsd ?? raw.price ?? 0),
          maker: String(raw.maker ?? raw.wallet ?? ""),
          timestamp: String(raw.timestamp ?? raw.createdAt ?? new Date().toISOString()),
        };

        setTrades((prev) => [trade, ...prev].slice(0, maxTrades));
      }

      // Handle batch of trades
      if (Array.isArray(raw.trades)) {
        const newTrades: LiveTrade[] = [];
        for (const t of raw.trades as Record<string, unknown>[]) {
          const id = String(t.id ?? t.txHash ?? `${Date.now()}-${Math.random()}`);
          if (seenIds.current.has(id)) continue;
          seenIds.current.add(id);
          newTrades.push({
            id,
            type: (t.side as string)?.toLowerCase() === "sell" ? "sell" : "buy",
            amountSol: Number(t.amountSol ?? t.amount ?? 0),
            priceUsd: Number(t.priceUsd ?? t.price ?? 0),
            maker: String(t.maker ?? t.wallet ?? ""),
            timestamp: String(t.timestamp ?? t.createdAt ?? new Date().toISOString()),
          });
        }
        if (newTrades.length > 0) {
          setTrades((prev) => [...newTrades, ...prev].slice(0, maxTrades));
        }
      }
    },
    [maxTrades],
  );

  const { connected } = useWebSocketSubscription({
    channels,
    onMessage,
    enabled: enabled && !!mintAddress,
  });

  const clearTrades = useCallback(() => {
    setTrades([]);
    seenIds.current.clear();
  }, []);

  return { trades, connected, clearTrades };
}
