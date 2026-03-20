"use client";

import { useEffect, useRef } from "react";
import { useNotifications } from "@/components/providers/NotificationProvider";
import { useToast } from "@/components/ui/Toast";
import { useFeed } from "@/components/providers/FeedProvider";

/**
 * Bridge component that listens to the FeedProvider SSE connection
 * and creates persistent notifications + toasts for alert events.
 *
 * Must be rendered inside both <FeedProvider> and <NotificationProvider>.
 */
export function SSENotificationBridge() {
  const { addNotification } = useNotifications();
  const addToast = useToast((s) => s.add);
  const { connected } = useFeed();

  // Use refs to avoid stale closures in the SSE event listeners
  const addNotificationRef = useRef(addNotification);
  const addToastRef = useRef(addToast);
  useEffect(() => {
    addNotificationRef.current = addNotification;
  }, [addNotification]);
  useEffect(() => {
    addToastRef.current = addToast;
  }, [addToast]);

  useEffect(() => {
    if (!connected) return;

    // We need access to the underlying EventSource. Since FeedProvider
    // doesn't expose it directly, we attach listeners on the window-level
    // custom events dispatched by a patched FeedProvider. Instead, we
    // listen to the same SSE endpoint via a lightweight secondary connection
    // that only cares about alert events.
    //
    // However, to avoid a duplicate SSE connection, we instead patch into
    // the existing FeedProvider by having it dispatch CustomEvents.
    // See the updated FeedProvider which dispatches these events.

    function handleAutoSell(e: Event) {
      const detail = (e as CustomEvent).detail;
      const label =
        detail.reason === "take-profit" ? "Take-Profit" : "Stop-Loss";
      addNotificationRef.current({
        type: "auto-sell",
        title: `${label} Triggered`,
        message: `${label} triggered for $${detail.tokenTicker} (${detail.pnlPercent >= 0 ? "+" : ""}${detail.pnlPercent.toFixed(1)}%)`,
        mintAddress: detail.mintAddress,
      });
    }

    function handlePriceAlert(e: Event) {
      const detail = (e as CustomEvent).detail;
      addToastRef.current(
        `Price alert: $${detail.tokenTicker ?? detail.mintAddress?.slice(0, 6)} hit target`,
        "info"
      );
      addNotificationRef.current({
        type: "price-alert",
        title: "Price Alert Triggered",
        message: detail.message ?? `$${detail.tokenTicker ?? "Token"} hit your price target`,
        mintAddress: detail.mintAddress,
      });
    }

    function handleLimitOrder(e: Event) {
      const detail = (e as CustomEvent).detail;
      addToastRef.current(
        `Limit order triggered for $${detail.tokenTicker ?? detail.mintAddress?.slice(0, 6)}`,
        "success"
      );
      addNotificationRef.current({
        type: "order-triggered",
        title: "Limit Order Triggered",
        message: detail.message ?? `Limit order filled for $${detail.tokenTicker ?? "Token"}`,
        mintAddress: detail.mintAddress,
      });
    }

    window.addEventListener("sse:auto-sell-alert", handleAutoSell);
    window.addEventListener("sse:price-alert-triggered", handlePriceAlert);
    window.addEventListener("sse:limit-order-triggered", handleLimitOrder);

    return () => {
      window.removeEventListener("sse:auto-sell-alert", handleAutoSell);
      window.removeEventListener("sse:price-alert-triggered", handlePriceAlert);
      window.removeEventListener("sse:limit-order-triggered", handleLimitOrder);
    };
  }, [connected]);

  return null;
}
