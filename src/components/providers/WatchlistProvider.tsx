"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

export interface WatchlistItem {
  mintAddress: string;
  addedAt: string;
  name: string;
  ticker: string;
  imageUri: string | null;
}

interface WatchlistContextType {
  watchlist: WatchlistItem[];
  addToWatchlist: (token: { mintAddress: string; name: string; ticker: string; imageUri?: string | null }) => void;
  removeFromWatchlist: (mintAddress: string) => void;
  isWatchlisted: (mintAddress: string) => boolean;
  watchlistCount: number;
}

const STORAGE_KEY = "hatcher_watchlist";

const WatchlistContext = createContext<WatchlistContextType | null>(null);

function loadWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveWatchlist(items: WatchlistItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    setWatchlist(loadWatchlist());
  }, []);

  const addToWatchlist = useCallback(
    (token: { mintAddress: string; name: string; ticker: string; imageUri?: string | null }) => {
      setWatchlist((prev) => {
        if (prev.some((item) => item.mintAddress === token.mintAddress)) return prev;
        const next = [
          {
            mintAddress: token.mintAddress,
            addedAt: new Date().toISOString(),
            name: token.name,
            ticker: token.ticker,
            imageUri: token.imageUri ?? null,
          },
          ...prev,
        ];
        saveWatchlist(next);
        return next;
      });
    },
    []
  );

  const removeFromWatchlist = useCallback((mintAddress: string) => {
    setWatchlist((prev) => {
      const next = prev.filter((item) => item.mintAddress !== mintAddress);
      saveWatchlist(next);
      return next;
    });
  }, []);

  const isWatchlisted = useCallback(
    (mintAddress: string) => watchlist.some((item) => item.mintAddress === mintAddress),
    [watchlist]
  );

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
        isWatchlisted,
        watchlistCount: watchlist.length,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error("useWatchlist must be used within WatchlistProvider");
  return ctx;
}
