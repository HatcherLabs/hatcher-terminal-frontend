"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { api } from "@/lib/api";

interface MobileSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchToken {
  id: string;
  mintAddress: string;
  name: string;
  ticker: string;
  imageUri: string | null;
  marketCapSol: number | null;
  marketCapUsd: number | null;
  priceUsd?: number | null;
  priceChange24h?: number | null;
}

const RECENT_SEARCHES_KEY = "hatcher_recent_searches";
const MAX_RECENT_SEARCHES = 10;

function getRecentSearches(): Array<{ mint: string; name: string; ticker: string; imageUri: string | null }> {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(item: { mint: string; name: string; ticker: string; imageUri: string | null }) {
  try {
    const recent = getRecentSearches().filter((r) => r.mint !== item.mint);
    recent.unshift(item);
    localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT_SEARCHES))
    );
  } catch {
    // Ignore storage errors
  }
}

function formatMarketCap(n: number | null | undefined): string {
  if (n === null || n === undefined) return "\u2014";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function formatPrice(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  if (n < 0.0001) return `$${n.toExponential(2)}`;
  if (n < 1) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(2)}`;
}

export function MobileSearch({ isOpen, onClose }: MobileSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<
    Array<{ mint: string; name: string; ticker: string; imageUri: string | null }>
  >([]);
  const [trending, setTrending] = useState<SearchToken[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);

  // Load recents and trending on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setRecentSearches(getRecentSearches());

      // Fetch trending
      setTrendingLoading(true);
      api
        .raw("/api/tokens/explore?category=new&limit=5&offset=0")
        .then(async (res) => {
          const json = await res.json();
          if (json.success) {
            setTrending(json.data);
          }
        })
        .catch(() => {
          // Ignore
        })
        .finally(() => setTrendingLoading(false));

      // Focus input
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.raw(
          `/api/tokens/search?q=${encodeURIComponent(query.trim())}&limit=8`
        );
        const json = await res.json();
        if (json.success) {
          setResults(json.data);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isOpen]);

  const handleSelect = useCallback(
    (token: { mintAddress: string; name: string; ticker: string; imageUri: string | null }) => {
      saveRecentSearch({
        mint: token.mintAddress,
        name: token.name,
        ticker: token.ticker,
        imageUri: token.imageUri,
      });
      onClose();
      router.push(`/token/${token.mintAddress}`);
    },
    [onClose, router]
  );

  const handleRecentSelect = useCallback(
    (item: { mint: string; name: string; ticker: string; imageUri: string | null }) => {
      onClose();
      router.push(`/token/${item.mint}`);
    },
    [onClose, router]
  );

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmedQuery = query.trim();
  const showResults = trimmedQuery.length >= 2;
  const showInitialState = trimmedQuery.length < 2;

  return (
    <div className="fixed inset-0 z-[110] bg-bg-primary pt-safe-area animate-fade-in">
      {/* Header with search input */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button
          onClick={onClose}
          className="shrink-0 w-8 h-8 flex items-center justify-center text-text-muted"
          aria-label="Close search"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 relative">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tokens, addresses..."
            className="w-full h-9 bg-bg-elevated border border-border rounded-lg text-sm text-text-primary placeholder:text-text-faint pl-9 pr-3 focus:outline-none focus:border-accent/40 transition-colors font-mono"
          />
          {query.length > 0 && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto terminal-scrollbar">
        {/* Initial state: recents + trending */}
        {showInitialState && (
          <div className="px-4 py-3">
            {/* Recent searches */}
            {recentSearches.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-text-faint uppercase tracking-wider">
                    Recent Searches
                  </span>
                  <button
                    onClick={() => {
                      localStorage.removeItem(RECENT_SEARCHES_KEY);
                      setRecentSearches([]);
                    }}
                    className="text-[10px] text-text-muted hover:text-text-secondary transition-colors"
                  >
                    Clear
                  </button>
                </div>
                {recentSearches.map((item) => (
                  <button
                    key={item.mint}
                    onClick={() => handleRecentSelect(item)}
                    className="w-full flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-bg-elevated transition-colors text-left"
                  >
                    <TokenAvatar
                      mintAddress={item.mint}
                      imageUri={item.imageUri}
                      size={28}
                      ticker={item.ticker}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-text-primary truncate block">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-text-secondary font-mono">
                        ${item.ticker}
                      </span>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="w-3.5 h-3.5 text-text-faint shrink-0"
                    >
                      <path d="M12 8v4l3 3" />
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  </button>
                ))}
              </div>
            )}

            {/* Trending tokens */}
            <div>
              <span className="text-[10px] font-bold text-text-faint uppercase tracking-wider block mb-2">
                Trending
              </span>
              {trendingLoading && (
                <div className="py-4 text-center">
                  <div className="inline-block w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                </div>
              )}
              {!trendingLoading &&
                trending.map((token) => (
                  <button
                    key={token.mintAddress}
                    onClick={() => handleSelect(token)}
                    className="w-full flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-bg-elevated transition-colors text-left"
                  >
                    <TokenAvatar
                      mintAddress={token.mintAddress}
                      imageUri={token.imageUri}
                      size={28}
                      ticker={token.ticker}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-text-primary truncate">
                          {token.name}
                        </span>
                        <span className="text-[10px] text-text-secondary font-mono shrink-0">
                          ${token.ticker}
                        </span>
                      </div>
                      {token.marketCapUsd != null && (
                        <span className="text-[10px] text-text-faint font-mono">
                          MC {formatMarketCap(token.marketCapUsd)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              {!trendingLoading && trending.length === 0 && (
                <p className="text-xs text-text-muted text-center py-4 font-mono">
                  No trending tokens available
                </p>
              )}
            </div>

            {/* Hint */}
            <p className="text-[10px] text-text-faint text-center mt-6 font-mono">
              Type at least 2 characters to search
            </p>
          </div>
        )}

        {/* Search results */}
        {showResults && (
          <div className="px-4 py-3">
            {loading && (
              <div className="py-8 text-center">
                <div className="inline-block w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                <p className="text-xs text-text-muted mt-2 font-mono">
                  Searching...
                </p>
              </div>
            )}

            {!loading && results.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-xs text-text-muted font-mono">
                  No tokens found for &ldquo;{trimmedQuery}&rdquo;
                </p>
              </div>
            )}

            {!loading &&
              results.map((token) => (
                <button
                  key={token.mintAddress}
                  onClick={() => handleSelect(token)}
                  className="w-full flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-bg-elevated transition-colors text-left"
                >
                  <TokenAvatar
                    mintAddress={token.mintAddress}
                    imageUri={token.imageUri}
                    size={32}
                    ticker={token.ticker}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary truncate">
                        {token.name}
                      </span>
                      <span className="text-[11px] text-text-secondary font-mono shrink-0">
                        ${token.ticker}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {token.priceUsd != null && (
                        <span className="text-[11px] text-text-secondary font-mono">
                          {formatPrice(token.priceUsd)}
                        </span>
                      )}
                      {token.priceChange24h != null && (
                        <span
                          className={`text-[11px] font-mono ${
                            token.priceChange24h >= 0
                              ? "text-green"
                              : "text-red"
                          }`}
                        >
                          {token.priceChange24h >= 0 ? "+" : ""}
                          {token.priceChange24h.toFixed(1)}%
                        </span>
                      )}
                      {token.marketCapUsd != null && (
                        <span className="text-[10px] text-text-faint font-mono">
                          MC {formatMarketCap(token.marketCapUsd)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
