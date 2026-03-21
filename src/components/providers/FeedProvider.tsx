"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { api } from "@/lib/api";
import type { TokenData } from "@/types/token";
import { useToast } from "@/components/ui/Toast";

export type FeedCategory = "new" | "closeToBond" | "migrated";
export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";
export type TransportType = "sse" | "ws";

interface FeedContextType {
  tokens: TokenData[];
  connected: boolean;
  connectionStatus: ConnectionStatus;
  transport: TransportType;
  currentIndex: number;
  currentToken: TokenData | null;
  nextToken: () => void;
  removeToken: (mintAddress: string) => void;
  getFilteredTokens: (category: FeedCategory) => TokenData[];
  reconnect: () => void;
}

const FeedContext = createContext<FeedContextType | null>(null);

// Exponential backoff constants
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;
const JITTER_FACTOR = 0.25; // ±25%

function getBackoffDelay(attempt: number): number {
  const exponential = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  const jitter = exponential * JITTER_FACTOR * (2 * Math.random() - 1); // range: [-25%, +25%]
  return Math.max(0, exponential + jitter);
}

function devLog(...args: unknown[]) {
  if (process.env.NODE_ENV === "development") {
    console.log("[FeedProvider]", ...args);
  }
}

const WS_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3011")
  .replace(/^http/, "ws");

function getUseWebSocketPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("hatcher_use_websocket") === "true";
  } catch {
    return false;
  }
}

/** Fetch a short-lived WS auth token from the backend (uses cookie auth). */
async function fetchWsToken(): Promise<string> {
  const res = await api.raw("/api/auth/ws-token");
  if (!res.ok) throw new Error("Failed to fetch WS token");
  const { data } = await res.json();
  return data.token as string;
}

interface FeedProviderProps {
  children: ReactNode;
  /** Force WebSocket transport. When unset, falls back to localStorage preference. */
  useWebSocket?: boolean;
}

export function FeedProvider({ children, useWebSocket: useWebSocketProp }: FeedProviderProps) {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [transport, setTransport] = useState<TransportType>("sse");
  const [currentIndex, setCurrentIndex] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retryCountRef = useRef(0);
  /** Whether we already fell back from WS to SSE in the current session. */
  const wsFallbackRef = useRef(false);
  /** Resolved preference: prop > localStorage > default (false). */
  const preferWs = useWebSocketProp ?? getUseWebSocketPreference();

  // Load unswiped tokens from DB as fallback
  const loadUnswipedTokens = useCallback(async () => {
    try {
      const res = await api.raw("/api/tokens/unswiped");
      if (res.ok) {
        const { data } = await res.json();
        if (data.length > 0) {
          setTokens((prev) => {
            const existingMints = new Set(prev.map((t) => t.mintAddress));
            const newTokens = data.filter((t: TokenData) => !existingMints.has(t.mintAddress));
            return [...prev, ...newTokens];
          });
        }
      }
    } catch {
      // Will retry via SSE/WS or next poll
    }
  }, []);

  const addToast = useToast.getState().add;

  // ─── Shared event handlers ────────────────────────────────────────────
  // These process an event (type + JSON payload) regardless of transport.

  const handleEvent = useCallback(
    (eventType: string, data: string) => {
      switch (eventType) {
        case "new-token": {
          const token = JSON.parse(data) as TokenData;
          setTokens((prev) => {
            if (prev.some((t) => t.mintAddress === token.mintAddress)) return prev;
            return [...prev, token];
          });
          break;
        }
        case "token-enriched": {
          const update = JSON.parse(data);
          setTokens((prev) =>
            prev.map((t) =>
              t.mintAddress === update.mintAddress ? { ...t, ...update } : t
            )
          );
          break;
        }
        case "price-update": {
          const update = JSON.parse(data);
          setTokens((prev) =>
            prev.map((t) => {
              if (t.mintAddress !== update.mintAddress) return t;
              const patch: Partial<TokenData> = { marketCapSol: update.marketCapSol };
              if (update.marketCapUsd != null) patch.marketCapUsd = update.marketCapUsd;
              if (update.bondingProgress != null) patch.bondingProgress = update.bondingProgress;
              if (update.volume1h != null) patch.volume1h = update.volume1h;
              if (update.buyCount != null) patch.buyCount = update.buyCount;
              if (update.sellCount != null) patch.sellCount = update.sellCount;
              if (update.priceChange5m != null) patch.priceChange5m = update.priceChange5m;
              if (update.priceChange1h != null) patch.priceChange1h = update.priceChange1h;
              return { ...t, ...patch };
            })
          );
          break;
        }
        case "auto-sell-alert": {
          const alert = JSON.parse(data);
          const label = alert.reason === "take-profit" ? "Take-profit" : "Stop-loss";
          addToast(
            `${label} triggered for $${alert.tokenTicker} (${alert.pnlPercent >= 0 ? "+" : ""}${alert.pnlPercent.toFixed(1)}%)`,
            alert.reason === "take-profit" ? "success" : "error"
          );
          break;
        }
        case "price-alert-triggered": {
          const payload = JSON.parse(data);
          window.dispatchEvent(
            new CustomEvent("sse:price-alert-triggered", { detail: payload })
          );
          break;
        }
        case "limit-order-triggered": {
          const payload = JSON.parse(data);
          window.dispatchEvent(
            new CustomEvent("sse:limit-order-triggered", { detail: payload })
          );
          break;
        }
        default:
          devLog("Unhandled event type:", eventType);
      }
    },
    [addToast]
  );

  // ─── Teardown helpers ─────────────────────────────────────────────────

  const closeAll = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (webSocketRef.current) {
      webSocketRef.current.close();
      webSocketRef.current = null;
    }
  }, []);

  // ─── SSE connection ───────────────────────────────────────────────────

  const connectSSE = useCallback(() => {
    closeAll();
    setConnectionStatus("connecting");
    setTransport("sse");
    devLog("Connecting to SSE feed...");

    const es = api.stream("/api/tokens/feed");
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setConnectionStatus("connected");
      retryCountRef.current = 0;
      devLog("SSE connected.");
    };

    const SSE_EVENTS = [
      "new-token",
      "token-enriched",
      "price-update",
      "auto-sell-alert",
      "price-alert-triggered",
      "limit-order-triggered",
    ] as const;

    for (const eventName of SSE_EVENTS) {
      es.addEventListener(eventName, (e) => {
        handleEvent(eventName, (e as MessageEvent).data);
      });
    }

    es.onerror = () => {
      setConnected(false);
      setConnectionStatus("error");
      es.close();
      eventSourceRef.current = null;
      const delay = getBackoffDelay(retryCountRef.current);
      devLog(`SSE lost. Reconnecting in ${Math.round(delay)}ms (attempt ${retryCountRef.current + 1})...`);
      retryCountRef.current += 1;
      reconnectTimeoutRef.current = setTimeout(connectSSE, delay);
    };
  }, [closeAll, handleEvent]);

  // ─── WebSocket connection ─────────────────────────────────────────────

  const connectWS = useCallback(() => {
    closeAll();
    setConnectionStatus("connecting");
    setTransport("ws");
    devLog("Connecting to WebSocket feed...");

    fetchWsToken()
      .then((token) => {
        const ws = new WebSocket(`${WS_BASE_URL}/ws?token=${encodeURIComponent(token)}`);
        webSocketRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          setConnectionStatus("connected");
          retryCountRef.current = 0;
          devLog("WebSocket connected.");
        };

        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data as string) as { event: string; data: unknown };
            handleEvent(msg.event, JSON.stringify(msg.data));
          } catch (err) {
            devLog("Failed to parse WS message:", err);
          }
        };

        ws.onerror = () => {
          devLog("WebSocket error.");
        };

        ws.onclose = () => {
          setConnected(false);
          webSocketRef.current = null;

          // If we haven't fallen back yet, switch to SSE
          if (!wsFallbackRef.current) {
            wsFallbackRef.current = true;
            devLog("WebSocket closed unexpectedly. Falling back to SSE.");
            setConnectionStatus("error");
            retryCountRef.current = 0;
            connectSSE();
            return;
          }

          // Otherwise, reconnect WS with backoff
          setConnectionStatus("error");
          const delay = getBackoffDelay(retryCountRef.current);
          devLog(`WebSocket closed. Reconnecting in ${Math.round(delay)}ms (attempt ${retryCountRef.current + 1})...`);
          retryCountRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(connectWS, delay);
        };
      })
      .catch((err) => {
        devLog("Failed to fetch WS token, falling back to SSE:", err);
        wsFallbackRef.current = true;
        connectSSE();
      });
  }, [closeAll, handleEvent, connectSSE]);

  // ─── Top-level connect (picks transport) ──────────────────────────────

  const connect = useCallback(() => {
    wsFallbackRef.current = false;
    if (preferWs) {
      connectWS();
    } else {
      connectSSE();
    }
  }, [preferWs, connectWS, connectSSE]);

  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    retryCountRef.current = 0;
    devLog("Manual reconnect triggered.");
    connect();
  }, [connect]);

  useEffect(() => {
    // Load existing tokens from DB immediately
    loadUnswipedTokens();
    // Then connect for real-time updates
    connect();
    return () => {
      closeAll();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      setConnectionStatus("disconnected");
    };
  }, [connect, loadUnswipedTokens, closeAll]);

  const nextToken = useCallback(() => {
    setCurrentIndex((prev) => prev + 1);
  }, []);

  // Compact buffer periodically to prevent memory leak
  useEffect(() => {
    if (currentIndex > 50) {
      setTokens((prev) => prev.slice(currentIndex));
      setCurrentIndex(0);
    }
  }, [currentIndex]);

  const removeToken = useCallback((mintAddress: string) => {
    setTokens((prev) => {
      const idx = prev.findIndex((t) => t.mintAddress === mintAddress);
      if (idx === -1) return prev;
      if (idx < currentIndex) {
        setCurrentIndex((i) => Math.max(0, i - 1));
      }
      return prev.filter((t) => t.mintAddress !== mintAddress);
    });
  }, [currentIndex]);

  const currentToken = tokens[currentIndex] ?? null;

  const getFilteredTokens = useCallback(
    (category: FeedCategory): TokenData[] => {
      switch (category) {
        case "new":
          return tokens.filter(
            (t) => !t.isGraduated && (t.bondingProgress === null || t.bondingProgress < 50)
          );
        case "closeToBond":
          return tokens.filter(
            (t) => !t.isGraduated && t.bondingProgress !== null && t.bondingProgress >= 50
          );
        case "migrated":
          return tokens.filter((t) => t.isGraduated);
        default:
          return tokens;
      }
    },
    [tokens]
  );

  return (
    <FeedContext.Provider
      value={{ tokens, connected, connectionStatus, transport, currentIndex, currentToken, nextToken, removeToken, getFilteredTokens, reconnect }}
    >
      {children}
    </FeedContext.Provider>
  );
}

export function useFeed() {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error("useFeed must be used within FeedProvider");
  return ctx;
}
