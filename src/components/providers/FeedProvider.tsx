"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { api } from "@/lib/api";
import type { TokenData } from "@/types/token";
import { useAutoSellAlertStore, type AutoSellAlertData } from "@/components/trade/AutoSellAlert";
import { useToast } from "@/components/ui/Toast";

export type FeedCategory = "new" | "closeToBond" | "migrated";
export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface FeedContextType {
  tokens: TokenData[];
  connected: boolean;
  connectionStatus: ConnectionStatus;
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

export function FeedProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [currentIndex, setCurrentIndex] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retryCountRef = useRef(0);

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
      // Will retry via SSE or next poll
    }
  }, []);

  const addToast = useToast.getState().add;
  const pushAutoSellAlert = useAutoSellAlertStore.getState().push;

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionStatus("connecting");
    devLog("Connecting to SSE feed...");

    const es = api.stream("/api/tokens/feed");
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setConnectionStatus("connected");
      retryCountRef.current = 0;
      devLog("Connected.");
    };

    es.addEventListener("new-token", (e) => {
      const token = JSON.parse(e.data) as TokenData;
      setTokens((prev) => {
        // Deduplicate — token may already exist from initial load
        if (prev.some((t) => t.mintAddress === token.mintAddress)) return prev;
        return [...prev, token];
      });
    });

    es.addEventListener("token-enriched", (e) => {
      const update = JSON.parse(e.data);
      setTokens((prev) =>
        prev.map((t) =>
          t.mintAddress === update.mintAddress ? { ...t, ...update } : t
        )
      );
    });

    es.addEventListener("price-update", (e) => {
      const update = JSON.parse(e.data);
      setTokens((prev) =>
        prev.map((t) =>
          t.mintAddress === update.mintAddress
            ? { ...t, marketCapSol: update.marketCapSol }
            : t
        )
      );
    });

    es.addEventListener("auto-sell-alert", (e) => {
      const alert = JSON.parse(e.data) as AutoSellAlertData;
      // Show a brief toast notification
      const label = alert.reason === "take-profit" ? "Take-profit" : "Stop-loss";
      addToast(
        `${label} triggered for $${alert.tokenTicker} (${alert.pnlPercent >= 0 ? "+" : ""}${alert.pnlPercent.toFixed(1)}%)`,
        alert.reason === "take-profit" ? "success" : "error"
      );
      // Push to the modal alert store
      pushAutoSellAlert(alert);
    });

    es.onerror = () => {
      setConnected(false);
      setConnectionStatus("error");
      es.close();
      const delay = getBackoffDelay(retryCountRef.current);
      devLog(`Connection lost. Reconnecting in ${Math.round(delay)}ms (attempt ${retryCountRef.current + 1})...`);
      retryCountRef.current += 1;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };
  }, []);

  const reconnect = useCallback(() => {
    // Clear any pending automatic reconnect
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    retryCountRef.current = 0;
    devLog("Manual reconnect triggered.");
    connect();
  }, [connect]);

  useEffect(() => {
    // Load existing tokens from DB immediately
    loadUnswipedTokens();
    // Then connect to SSE for real-time updates
    connect();
    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      setConnectionStatus("disconnected");
    };
  }, [connect, loadUnswipedTokens]);

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
      value={{ tokens, connected, connectionStatus, currentIndex, currentToken, nextToken, removeToken, getFilteredTokens, reconnect }}
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
