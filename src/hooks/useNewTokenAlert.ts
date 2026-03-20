"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useWebSocketSubscription } from "./useWebSocketSubscription";

export interface NewTokenInfo {
  mintAddress: string;
  name: string;
  ticker: string;
  imageUri?: string | null;
  detectedAt: string;
}

/**
 * Subscribes to the "new-tokens" WebSocket channel.
 * Returns a queue of recently detected tokens for banner/alert display.
 * Automatically expires entries after `maxAgeMs` (default 30s).
 */
export function useNewTokenAlert({
  enabled = true,
  maxQueue = 5,
  maxAgeMs = 30_000,
}: {
  enabled?: boolean;
  maxQueue?: number;
  maxAgeMs?: number;
} = {}) {
  const [queue, setQueue] = useState<NewTokenInfo[]>([]);
  const seenRef = useRef(new Set<string>());

  const channels = useMemo(
    () => (enabled ? ["new-tokens"] : []),
    [enabled],
  );

  const onMessage = useCallback(
    (_channel: string, raw: unknown) => {
      if (!raw || typeof raw !== "object") return;
      const d = raw as Record<string, unknown>;

      const mint = String(d.mintAddress ?? d.mint ?? "");
      if (!mint || seenRef.current.has(mint)) return;
      seenRef.current.add(mint);

      // Keep seen set bounded
      if (seenRef.current.size > 200) {
        const entries = [...seenRef.current];
        seenRef.current = new Set(entries.slice(-100));
      }

      const token: NewTokenInfo = {
        mintAddress: mint,
        name: String(d.name ?? "Unknown"),
        ticker: String(d.ticker ?? d.symbol ?? "???"),
        imageUri: d.imageUri != null ? String(d.imageUri) : null,
        detectedAt: String(d.detectedAt ?? d.createdAt ?? new Date().toISOString()),
      };

      setQueue((prev) => [token, ...prev].slice(0, maxQueue));

      // Auto-remove after maxAgeMs
      setTimeout(() => {
        setQueue((prev) => prev.filter((t) => t.mintAddress !== mint));
      }, maxAgeMs);
    },
    [maxQueue, maxAgeMs],
  );

  useWebSocketSubscription({
    channels,
    onMessage,
    enabled,
  });

  const dismiss = useCallback((mintAddress: string) => {
    setQueue((prev) => prev.filter((t) => t.mintAddress !== mintAddress));
  }, []);

  const dismissAll = useCallback(() => {
    setQueue([]);
  }, []);

  return { newTokens: queue, dismiss, dismissAll };
}
