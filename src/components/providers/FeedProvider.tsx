"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { api } from "@/lib/api";
import type { TokenData } from "@/types/token";

export type FeedCategory = "new" | "closeToBond" | "migrated";

interface FeedContextType {
  tokens: TokenData[];
  connected: boolean;
  currentIndex: number;
  currentToken: TokenData | null;
  nextToken: () => void;
  removeToken: (mintAddress: string) => void;
  getFilteredTokens: (category: FeedCategory) => TokenData[];
}

const FeedContext = createContext<FeedContextType | null>(null);

export function FeedProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [connected, setConnected] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

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

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = api.stream("/api/tokens/feed");
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

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

    es.onerror = () => {
      setConnected(false);
      es.close();
      // Reconnect with backoff
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    // Load existing tokens from DB immediately
    loadUnswipedTokens();
    // Then connect to SSE for real-time updates
    connect();
    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
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
      value={{ tokens, connected, currentIndex, currentToken, nextToken, removeToken, getFilteredTokens }}
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
