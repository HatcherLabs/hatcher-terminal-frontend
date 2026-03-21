"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { api } from "@/lib/api";

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

export function TokenSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [mobileOverlay, setMobileOverlay] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches on mount and when dropdown opens
  useEffect(() => {
    if (open || mobileOverlay) {
      setRecentSearches(getRecentSearches());
    }
  }, [open, mobileOverlay]);

  // Global "/" key to open search
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if (e.key === "/") {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        e.preventDefault();
        if (window.innerWidth < 768) {
          setMobileOverlay(true);
        } else {
          inputRef.current?.focus();
        }
      }
    }
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  // Focus mobile input when overlay opens
  useEffect(() => {
    if (mobileOverlay) {
      requestAnimationFrame(() => {
        mobileInputRef.current?.focus();
      });
    } else {
      setQuery("");
      setResults([]);
      setOpen(false);
    }
  }, [mobileOverlay]);

  // Debounced search - 300ms
  useEffect(() => {
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
  }, [query]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(results.length > 0 ? 0 : -1);
  }, [results]);

  // Determine total navigable items (results or recent searches)
  const trimmedQuery = query.trim();
  const showingResults = trimmedQuery.length >= 2 && !loading;
  const showingRecents = trimmedQuery.length < 2 && recentSearches.length > 0;
  const totalItems = showingResults ? results.length : showingRecents ? recentSearches.length : 0;

  // Keyboard navigation
  useEffect(() => {
    if (!open || totalItems === 0) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < totalItems - 1 ? prev + 1 : 0
          );
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : totalItems - 1
          );
          break;
        }
        case "Enter": {
          e.preventDefault();
          if (showingResults && results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          } else if (showingRecents && recentSearches[selectedIndex]) {
            handleRecentSelect(recentSearches[selectedIndex]);
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          handleClose();
          break;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, totalItems, selectedIndex, showingResults, showingRecents, results, recentSearches]);

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector(
      `[data-token-index="${selectedIndex}"]`
    );
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Close on click outside (desktop)
  useEffect(() => {
    if (!open || mobileOverlay) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, mobileOverlay]);

  // Close on Escape when mobile overlay is open
  useEffect(() => {
    if (!mobileOverlay) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileOverlay(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOverlay]);

  const handleSelect = useCallback(
    (token: SearchToken) => {
      saveRecentSearch({
        mint: token.mintAddress,
        name: token.name,
        ticker: token.ticker,
        imageUri: token.imageUri,
      });
      setQuery("");
      setResults([]);
      setOpen(false);
      setMobileOverlay(false);
      router.push(`/token/${token.mintAddress}`);
    },
    [router]
  );

  const handleRecentSelect = useCallback(
    (item: RecentSearch) => {
      setQuery("");
      setResults([]);
      setOpen(false);
      setMobileOverlay(false);
      router.push(`/token/${item.mint}`);
    },
    [router]
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setMobileOverlay(false);
    setQuery("");
    setResults([]);
    inputRef.current?.blur();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      setOpen(true);
      setSelectedIndex(0);
    },
    []
  );

  const handleInputFocus = useCallback(() => {
    setOpen(true);
    setRecentSearches(getRecentSearches());
  }, []);

  const handleClearRecents = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  const showDropdown = open;

  // ----- Shared result item -----
  const renderTokenRow = (
    token: SearchToken,
    index: number,
    isSelected: boolean,
    onSelect: () => void
  ) => (
    <button
      key={token.mintAddress}
      data-token-index={index}
      onClick={onSelect}
      onMouseEnter={() => setSelectedIndex(index)}
      style={{
        backgroundColor: isSelected ? "rgba(34,197,94,0.04)" : "transparent",
      }}
      className="w-full flex items-center gap-3 py-2.5 px-3 text-left transition-colors"
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
          {token.riskLevel && <RiskBadge level={token.riskLevel} />}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {token.priceUsd != null && (
            <span className="text-[10px] font-mono" style={{ color: "#8b95a5" }}>
              {formatPrice(token.priceUsd)}
            </span>
          )}
          {token.priceChange24h != null && (
            <span
              className="text-[10px] font-mono"
              style={{
                color: token.priceChange24h >= 0 ? "#4ade80" : "#f87171",
              }}
            >
              {token.priceChange24h >= 0 ? "+" : ""}
              {token.priceChange24h.toFixed(1)}%
            </span>
          )}
          {token.marketCapUsd != null && (
            <span className="text-[10px] font-mono" style={{ color: "#5a6478" }}>
              MC {formatMarketCap(token.marketCapUsd)}
            </span>
          )}
        </div>
      </div>
    </button>
  );

  // ----- Shared results list -----
  const renderResultsList = () => (
    <div ref={listRef}>
      {/* Recent searches when no query */}
      {trimmedQuery.length < 2 && recentSearches.length > 0 && (
        <div>
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
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
              onMouseEnter={(e) => (e.currentTarget.style.color = "#8b95a5")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#5a6478")}
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
                backgroundColor: selectedIndex === index ? "rgba(34,197,94,0.04)" : "transparent",
              }}
              className="w-full flex items-center gap-3 py-2 px-3 text-left transition-colors"
            >
              <TokenAvatar
                mintAddress={item.mint}
                imageUri={item.imageUri}
                size={24}
                ticker={item.ticker}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-medium truncate"
                    style={{ color: "#e2e8f0" }}
                  >
                    {item.name}
                  </span>
                  <span
                    className="text-[10px] font-mono shrink-0"
                    style={{ color: "#8b95a5" }}
                  >
                    ${item.ticker}
                  </span>
                </div>
              </div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-3 h-3 shrink-0"
                style={{ color: "#5a6478" }}
              >
                <path d="M12 8v4l3 3" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Empty state when no query and no recents */}
      {trimmedQuery.length < 2 && recentSearches.length === 0 && (
        <div className="px-4 py-6 text-center">
          <p className="text-[10px] font-mono" style={{ color: "#5a6478" }}>
            Search by name, ticker, or mint address
          </p>
        </div>
      )}

      {/* Loading */}
      {trimmedQuery.length >= 2 && loading && (
        <div className="px-4 py-6 text-center">
          <div
            className="inline-block w-4 h-4 border-2 rounded-full animate-spin"
            style={{
              borderColor: "rgba(74, 222, 128, 0.3)",
              borderTopColor: "#4ade80",
            }}
          />
          <p className="text-xs font-mono mt-2" style={{ color: "#5a6478" }}>
            Searching...
          </p>
        </div>
      )}

      {/* No results */}
      {trimmedQuery.length >= 2 && !loading && results.length === 0 && (
        <div className="px-4 py-6 text-center">
          <p className="text-xs font-mono" style={{ color: "#5a6478" }}>
            No tokens found for &ldquo;{trimmedQuery}&rdquo;
          </p>
        </div>
      )}

      {/* Results */}
      {trimmedQuery.length >= 2 &&
        !loading &&
        results.map((token, index) =>
          renderTokenRow(token, index, selectedIndex === index, () =>
            handleSelect(token)
          )
        )}
    </div>
  );

  return (
    <>
      {/* Desktop search */}
      <div
        className="flex-1 max-w-md relative hidden md:block"
        ref={containerRef}
      >
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: "#5a6478" }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder="Search by name, ticker, or mint address"
            style={{
              backgroundColor: "#1f2435",
              borderColor: open ? "rgba(34,197,94,0.4)" : "#2a3040",
              boxShadow: open ? "0 0 8px rgba(34,197,94,0.15)" : "none",
              color: "#e2e8f0",
            }}
            className="w-full h-7 border rounded text-xs placeholder:text-[#5a6478] pl-8 pr-12 focus:outline-none transition-colors font-mono"
          />
          <kbd
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] px-1 py-0.5 rounded border font-mono"
            style={{
              color: "#5a6478",
              backgroundColor: "#161a26",
              borderColor: "#2a3040",
            }}
          >
            /
          </kbd>
        </div>

        {/* Desktop dropdown */}
        {showDropdown && (
          <div
            className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg max-h-80 overflow-y-auto terminal-scrollbar"
            style={{
              background: "rgba(10,13,20,0.95)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(34,197,94,0.08)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
            }}
          >
            {renderResultsList()}
          </div>
        )}
      </div>

      {/* Mobile search trigger */}
      <button
        onClick={() => setMobileOverlay(true)}
        className="md:hidden flex items-center justify-center w-8 h-8 transition-colors"
        style={{ color: "#5a6478" }}
        aria-label="Open search"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="w-4.5 h-4.5"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOverlay && (
        <div
          className="fixed inset-0 z-[110] pt-safe-area md:hidden"
          style={{
            backgroundColor: "#0d1017",
            animation: "slideDown 200ms ease-out",
          }}
        >
          <style>{`
            @keyframes slideDown {
              from { opacity: 0; transform: translateY(-20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: "1px solid rgba(34,197,94,0.08)" }}
          >
            <button
              onClick={handleClose}
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
                ref={mobileInputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                placeholder="Search by name, ticker, or mint address"
                style={{
                  backgroundColor: "#1f2435",
                  borderColor: "rgba(34,197,94,0.4)",
                  boxShadow: "0 0 8px rgba(34,197,94,0.15)",
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

          {/* Mobile results */}
          <div className="flex-1 overflow-y-auto terminal-scrollbar px-2 py-2">
            {renderResultsList()}
          </div>
        </div>
      )}
    </>
  );
}
