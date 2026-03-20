"use client";

import { useCallback, useMemo, useRef } from "react";
import { useWebSocketSubscription } from "./useWebSocketSubscription";
import { useWatchlist } from "@/components/providers/WatchlistProvider";
import { useTradeNotification } from "./useTradeNotification";

interface PriceSnapshot {
  priceSol: number;
  timestamp: number;
}

/**
 * Subscribes to price updates for all watchlisted tokens.
 * Fires a notification when a token moves more than the threshold
 * (default 10%) within a short window, preventing alert spam.
 */
export function useWatchlistAlerts({
  enabled = true,
  thresholdPct = 10,
  cooldownMs = 300_000, // 5 min cooldown per token
}: {
  enabled?: boolean;
  thresholdPct?: number;
  cooldownMs?: number;
} = {}) {
  const { watchlist } = useWatchlist();
  const { notifyPriceAlert } = useTradeNotification();

  const snapshotsRef = useRef<Map<string, PriceSnapshot>>(new Map());
  const cooldownRef = useRef<Map<string, number>>(new Map());

  const channels = useMemo(
    () =>
      enabled
        ? watchlist.map((item) => `price:${item.mintAddress}`)
        : [],
    [watchlist, enabled],
  );

  const onMessage = useCallback(
    (channel: string, raw: unknown) => {
      if (!raw || typeof raw !== "object") return;
      const d = raw as Record<string, unknown>;
      const priceSol = d.priceSol != null ? Number(d.priceSol) : null;
      if (priceSol == null || priceSol <= 0) return;

      // Extract mint from channel name "price:MINT_ADDRESS"
      const mint = channel.replace("price:", "");
      const now = Date.now();

      // Check cooldown
      const lastAlert = cooldownRef.current.get(mint) ?? 0;
      if (now - lastAlert < cooldownMs) return;

      const prev = snapshotsRef.current.get(mint);
      if (!prev) {
        snapshotsRef.current.set(mint, { priceSol, timestamp: now });
        return;
      }

      const changePct = ((priceSol - prev.priceSol) / prev.priceSol) * 100;

      if (Math.abs(changePct) >= thresholdPct) {
        // Find token info from watchlist
        const token = watchlist.find((w) => w.mintAddress === mint);
        if (token) {
          notifyPriceAlert(token.ticker, changePct, mint);
          cooldownRef.current.set(mint, now);
        }
        // Reset snapshot after alert
        snapshotsRef.current.set(mint, { priceSol, timestamp: now });
      } else {
        // Update snapshot if enough time has passed (sliding window)
        if (now - prev.timestamp > 60_000) {
          snapshotsRef.current.set(mint, { priceSol, timestamp: now });
        }
      }
    },
    [watchlist, thresholdPct, cooldownMs, notifyPriceAlert],
  );

  useWebSocketSubscription({
    channels,
    onMessage,
    enabled: enabled && channels.length > 0,
  });
}
