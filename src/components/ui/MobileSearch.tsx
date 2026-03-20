"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { RiskBadge } from "@/components/ui/RiskBadge";
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
  riskLevel?: "LOW" | "MED" | "HIGH" | "EXTREME" | null;
}

interface RecentSearch {
  mint: string;
  name: string;
  ticker: string;
  imageUri: string | null;
}

const RECENT_SEARCHES_KEY = "hatcher_recent_searches";
const MAX_RECENT_SEARCHES = 8;

function getRecentSearches(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(item: RecentSearch) {
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

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Ignore
  }
}

function formatMarketCap(n: number | null | undefined): string {
  if (n === null || n === undefined) return "\u2014";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
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
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [trending, setTrending] = useState<SearchToken[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);

  // Load recents and trending on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setSelectedIndex(-1);
      setRecentSearches(getRecentSearches());

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

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Debounced search - 300ms
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

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(results.length > 0 ? 0 : -1);
  }, [results]);

  const trimmedQuery = query.trim();
  const showResults = trimmedQuery.length >= 2;
  const showInitialState = trimmedQuery.length < 2;

  // Total navigable items for keyboard nav
  const totalItems = showResults
    ? results.length
    : recentSearches.length + trending.length;

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "Escape": {
          e.preventDefault();
          onClose();
          break;
        }
        case "ArrowDown": {
          if (totalItems === 0) return;
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < totalItems - 1 ? prev + 1 : 0
          );
          break;
        }
        case "ArrowUp": {
          if (totalItems === 0) return;
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : totalItems - 1
          );
          break;
        }
        case "Enter": {
          e.preventDefault();
          if (showResults && results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          } else if (showInitialState) {
            // Navigate recents first, then trending
            if (selectedIndex < recentSearches.length) {
              handleRecentSelect(recentSearches[selectedIndex]);
            } else {
              const trendingIdx = selectedIndex - recentSearches.length;
              if (trending[trendingIdx]) {
                handleSelect(trending[trendingIdx]);
              }
            }
          }
          break;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, totalItems, selectedIndex, showResults, showInitialState, results, recentSearches, trending, onClose]);

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector(
      `[data-token-index="${selectedIndex}"]`
    );
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

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
    (item: RecentSearch) => {
      onClose();
      router.push(`/token/${item.mint}`);
    },
    [onClose, router]
  );

  const handleClearRecents = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] pt-safe-area"
      style={{
        backgroundColor: "#0a0d14",
        animation: "mobileSearchSlideDown 200ms ease-out",
      }}
    >
      <style>{`
        @keyframes mobileSearchSlideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header with search input */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: "1px solid #1a1f2e" }}
      >
        <button
          onClick={onClose}
          className="shrink-0 w-8 h-8 flex items-center justify-center"
          style={{ color: "#5a6478" }}
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
            className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: "#5a6478" }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search by name, ticker, or mint address"
            style={{
              backgroundColor: "#1f2435",
              borderColor: "#4ade80",
              color: "#e2e8f0",
            }}
            className="w-full h-9 border rounded-lg text-sm placeholder:text-[#5a6478] pl-9 pr-9 focus:outline-none transition-colors font-mono"
          />
          {query.length > 0 && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
                setSelectedIndex(-1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ color: "#5a6478" }}
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
      <div ref={listRef} className="flex-1 overflow-y-auto terminal-scrollbar">
        {/* Initial state: recents + trending */}
        {showInitialState && (
          <div className="px-4 py-3">
            {/* Recent searches */}
            {recentSearches.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "#5a6478" }}
                  >
                    Recent Searches
                  </span>
                  <button
                    onClick={handleClearRecents}
                    className="text-[10px] transition-colors"
                    style={{ color: "#5a6478" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#8b95a5")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#5a6478")
                    }
                  >
                    Clear
                  </button>
                </div>
                {recentSearches.map((item, index) => (
                  <button
                    key={item.mint}
                    data-token-index={index}
                    onClick={() => handleRecentSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    style={{
                      backgroundColor:
                        selectedIndex === index ? "#1a1f2e" : "transparent",
                    }}
                    className="w-full flex items-center gap-3 py-2 px-2 rounded-lg transition-colors text-left"
                  >
                    <TokenAvatar
                      mintAddress={item.mint}
                      imageUri={item.imageUri}
                      size={28}
                      ticker={item.ticker}
                    />
                    <div className="flex-1 min-w-0">
                      <span
                        className="text-xs font-medium truncate block"
                        style={{ color: "#e2e8f0" }}
                      >
                        {item.name}
                      </span>
                      <span
                        className="text-[10px] font-mono"
                        style={{ color: "#8b95a5" }}
                      >
                        ${item.ticker}
                      </span>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: "#5a6478" }}
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
              <span
                className="text-[10px] font-bold uppercase tracking-wider block mb-2"
                style={{ color: "#5a6478" }}
              >
                Trending
              </span>
              {trendingLoading && (
                <div className="py-4 text-center">
                  <div
                    className="inline-block w-4 h-4 border-2 rounded-full animate-spin"
                    style={{
                      borderColor: "rgba(74, 222, 128, 0.3)",
                      borderTopColor: "#4ade80",
                    }}
                  />
                </div>
              )}
              {!trendingLoading &&
                trending.map((token, idx) => {
                  const navIndex = recentSearches.length + idx;
                  return (
                    <button
                      key={token.mintAddress}
                      data-token-index={navIndex}
                      onClick={() => handleSelect(token)}
                      onMouseEnter={() => setSelectedIndex(navIndex)}
                      style={{
                        backgroundColor:
                          selectedIndex === navIndex
                            ? "#1a1f2e"
                            : "transparent",
                      }}
                      className="w-full flex items-center gap-3 py-2 px-2 rounded-lg transition-colors text-left"
                    >
                      <TokenAvatar
                        mintAddress={token.mintAddress}
                        imageUri={token.imageUri}
                        size={28}
                        ticker={token.ticker}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-medium truncate"
                            style={{ color: "#e2e8f0" }}
                          >
                            {token.name}
                          </span>
                          <span
                            className="text-[10px] font-mono shrink-0"
                            style={{ color: "#8b95a5" }}
                          >
                            ${token.ticker}
                          </span>
                          {token.riskLevel && (
                            <RiskBadge level={token.riskLevel} />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {token.marketCapUsd != null && (
                            <span
                              className="text-[10px] font-mono"
                              style={{ color: "#5a6478" }}
                            >
                              MC {formatMarketCap(token.marketCapUsd)}
                            </span>
                          )}
                          {token.priceChange24h != null && (
                            <span
                              className="text-[10px] font-mono"
                              style={{
                                color:
                                  token.priceChange24h >= 0
                                    ? "#4ade80"
                                    : "#f87171",
                              }}
                            >
                              {token.priceChange24h >= 0 ? "+" : ""}
                              {token.priceChange24h.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              {!trendingLoading && trending.length === 0 && (
                <p
                  className="text-xs text-center py-4 font-mono"
                  style={{ color: "#5a6478" }}
                >
                  No trending tokens available
                </p>
              )}
            </div>

            {/* Hint */}
            {recentSearches.length === 0 && (
              <p
                className="text-[10px] text-center mt-6 font-mono"
                style={{ color: "#5a6478" }}
              >
                Search by name, ticker, or mint address
              </p>
            )}
          </div>
        )}

        {/* Search results */}
        {showResults && (
          <div className="px-4 py-3">
            {loading && (
              <div className="py-8 text-center">
                <div
                  className="inline-block w-5 h-5 border-2 rounded-full animate-spin"
                  style={{
                    borderColor: "rgba(74, 222, 128, 0.3)",
                    borderTopColor: "#4ade80",
                  }}
                />
                <p
                  className="text-xs font-mono mt-2"
                  style={{ color: "#5a6478" }}
                >
                  Searching...
                </p>
              </div>
            )}

            {!loading && results.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-xs font-mono" style={{ color: "#5a6478" }}>
                  No tokens found for &ldquo;{trimmedQuery}&rdquo;
                </p>
              </div>
            )}

            {!loading &&
              results.map((token, index) => (
                <button
                  key={token.mintAddress}
                  data-token-index={index}
                  onClick={() => handleSelect(token)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    backgroundColor:
                      selectedIndex === index ? "#1a1f2e" : "transparent",
                  }}
                  className="w-full flex items-center gap-3 py-2.5 px-2 rounded-lg transition-colors text-left"
                >
                  <TokenAvatar
                    mintAddress={token.mintAddress}
                    imageUri={token.imageUri}
                    size={32}
                    ticker={token.ticker}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-medium truncate"
                        style={{ color: "#e2e8f0" }}
                      >
                        {token.name}
                      </span>
                      <span
                        className="text-[11px] font-mono shrink-0"
                        style={{ color: "#8b95a5" }}
                      >
                        ${token.ticker}
                      </span>
                      {token.riskLevel && (
                        <RiskBadge level={token.riskLevel} />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {token.priceUsd != null && (
                        <span
                          className="text-[11px] font-mono"
                          style={{ color: "#8b95a5" }}
                        >
                          {formatPrice(token.priceUsd)}
                        </span>
                      )}
                      {token.priceChange24h != null && (
                        <span
                          className="text-[11px] font-mono"
                          style={{
                            color:
                              token.priceChange24h >= 0
                                ? "#4ade80"
                                : "#f87171",
                          }}
                        >
                          {token.priceChange24h >= 0 ? "+" : ""}
                          {token.priceChange24h.toFixed(1)}%
                        </span>
                      )}
                      {token.marketCapUsd != null && (
                        <span
                          className="text-[10px] font-mono"
                          style={{ color: "#5a6478" }}
                        >
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
