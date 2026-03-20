"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "./AuthProvider";

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
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const hasFetchedRef = useRef(false);

  // Fetch watchlist from backend when authenticated, fall back to localStorage
  useEffect(() => {
    if (!user) {
      hasFetchedRef.current = false;
      setWatchlist(loadWatchlist());
      return;
    }

    if (hasFetchedRef.current) return;

    let cancelled = false;

    async function fetchWatchlist() {
      setIsLoading(true);
      try {
        const res = await api.get<{ success: boolean; data: WatchlistItem[] }>("/api/watchlist");
        if (!cancelled && res.success) {
          hasFetchedRef.current = true;
          const items = res.data.map((item) => ({
            mintAddress: item.mintAddress,
            addedAt: item.addedAt,
            name: item.name ?? "",
            ticker: item.ticker ?? "",
            imageUri: item.imageUri ?? null,
          }));
          setWatchlist(items);
          saveWatchlist(items);
        }
      } catch (err) {
        // On auth error or network failure, fall back to localStorage cache
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 401) {
            // Not authenticated — use local cache
          }
          setWatchlist(loadWatchlist());
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchWatchlist();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const addToWatchlist = useCallback(
    (token: { mintAddress: string; name: string; ticker: string; imageUri?: string | null }) => {
      setWatchlist((prev) => {
        if (prev.some((item) => item.mintAddress === token.mintAddress)) return prev;
        const newItem: WatchlistItem = {
          mintAddress: token.mintAddress,
          addedAt: new Date().toISOString(),
          name: token.name,
          ticker: token.ticker,
          imageUri: token.imageUri ?? null,
        };
        const next = [newItem, ...prev];
        saveWatchlist(next);
        return next;
      });

      // Persist to backend (fire-and-forget)
      if (user) {
        api.post("/api/watchlist", { mintAddress: token.mintAddress }).catch((err) => {
          console.warn("Failed to sync watchlist add to backend:", err);
        });
      }
    },
    [user]
  );

  const removeFromWatchlist = useCallback(
    (mintAddress: string) => {
      setWatchlist((prev) => {
        const next = prev.filter((item) => item.mintAddress !== mintAddress);
        saveWatchlist(next);
        return next;
      });

      // Persist to backend (fire-and-forget)
      if (user) {
        api.delete(`/api/watchlist/${encodeURIComponent(mintAddress)}`).catch((err) => {
          console.warn("Failed to sync watchlist remove to backend:", err);
        });
      }
    },
    [user]
  );

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
        isLoading,
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
