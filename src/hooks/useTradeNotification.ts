"use client";

import { useCallback } from "react";
import { useNotifications } from "@/components/providers/NotificationProvider";

export function useTradeNotification() {
  const { addNotification } = useNotifications();

  const notifyBuy = useCallback(
    (tokenName: string, amount: number, mintAddress?: string) => {
      addNotification({
        type: "trade-confirmed",
        title: `Bought ${tokenName}`,
        message: `Purchased ${amount} SOL worth of ${tokenName}`,
        mintAddress,
      });
    },
    [addNotification]
  );

  const notifySell = useCallback(
    (tokenName: string, amount: number, pnl?: number, mintAddress?: string) => {
      const pnlStr =
        pnl !== undefined
          ? ` (${pnl >= 0 ? "+" : ""}${pnl.toFixed(1)}%)`
          : "";
      addNotification({
        type: "trade-confirmed",
        title: `Sold ${tokenName}`,
        message: `Sold ${amount} SOL worth of ${tokenName}${pnlStr}`,
        mintAddress,
      });
    },
    [addNotification]
  );

  const notifyPriceAlert = useCallback(
    (tokenName: string, change: number, mintAddress?: string) => {
      const direction = change >= 0 ? "up" : "down";
      addNotification({
        type: "price-alert",
        title: `${tokenName} Price Alert`,
        message: `${tokenName} is ${direction} ${Math.abs(change).toFixed(1)}% in the last hour`,
        mintAddress,
      });
    },
    [addNotification]
  );

  return { notifyBuy, notifySell, notifyPriceAlert };
}
