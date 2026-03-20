"use client";

import { useEffect, useRef, useCallback, useState } from "react";

const WS_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3011")
  .replace(/^http/, "ws");

interface UseWebSocketSubscriptionOptions {
  /** Channels to subscribe to, e.g. ["token:ABC123", "prices"] */
  channels: string[];
  /** Called when a message arrives on a subscribed channel */
  onMessage: (channel: string, data: unknown) => void;
  /** Whether the hook is enabled (default true) */
  enabled?: boolean;
}

/**
 * Hook for subscribing to specific WebSocket channels.
 * Works with the enhanced WS server that supports subscribe/unsubscribe protocol.
 */
export function useWebSocketSubscription({
  channels,
  onMessage,
  enabled = true,
}: UseWebSocketSubscriptionOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const [connected, setConnected] = useState(false);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retryRef = useRef(0);

  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!enabled || channels.length === 0) return;

    try {
      const ws = new WebSocket(`${WS_BASE_URL}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        retryRef.current = 0;
        // Subscribe to all channels
        for (const channel of channels) {
          ws.send(JSON.stringify({ type: "subscribe", channel }));
        }
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string);
          if (msg.type === "pong" || msg.type === "subscribed" || msg.type === "unsubscribed") {
            return; // control messages
          }
          if (msg.channel && msg.data !== undefined) {
            onMessageRef.current(msg.channel, msg.data);
          } else if (msg.event) {
            // Backward-compat with old broadcast format
            onMessageRef.current(msg.event, msg.data);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        // Reconnect with backoff
        const delay = Math.min(1000 * 2 ** retryRef.current, 30000);
        retryRef.current += 1;
        reconnectRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // Connection failed, will retry via onclose
    }
  }, [enabled, channels]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  // Handle channel changes — subscribe/unsubscribe as needed
  const prevChannelsRef = useRef<string[]>([]);
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      prevChannelsRef.current = channels;
      return;
    }

    const prev = new Set(prevChannelsRef.current);
    const next = new Set(channels);

    // Subscribe to new channels
    for (const ch of channels) {
      if (!prev.has(ch)) {
        ws.send(JSON.stringify({ type: "subscribe", channel: ch }));
      }
    }
    // Unsubscribe from removed channels
    for (const ch of prevChannelsRef.current) {
      if (!next.has(ch)) {
        ws.send(JSON.stringify({ type: "unsubscribe", channel: ch }));
      }
    }

    prevChannelsRef.current = channels;
  }, [channels]);

  return { connected };
}
