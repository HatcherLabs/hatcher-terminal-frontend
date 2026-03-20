"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
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

export function TokenSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mobileOverlay, setMobileOverlay] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Global "/" key to open search (skip if in input/textarea)
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if (e.key === "/") {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        e.preventDefault();

        // On mobile (< 768px), open overlay
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

  // Debounced search
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
    setSelectedIndex(0);
  }, [results]);

  // Keyboard navigation
  useEffect(() => {
    if (!open || results.length === 0) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1
          );
          break;
        }
        case "Enter": {
          e.preventDefault();
          const token = results[selectedIndex];
          if (token) handleSelect(token.mintAddress);
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
  }, [open, results, selectedIndex]);

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

  // Close on Escape when no results dropdown (just overlay)
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
    (mint: string) => {
      setQuery("");
      setResults([]);
      setOpen(false);
      setMobileOverlay(false);
      router.push(`/token/${mint}`);
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
      if (value.trim().length > 0) {
        setOpen(true);
      } else {
        setOpen(false);
      }
    },
    []
  );

  const handleInputFocus = useCallback(() => {
    if (query.trim().length > 0) {
      setOpen(true);
    }
  }, [query]);

  const trimmedQuery = query.trim();
  const showDropdown = open && trimmedQuery.length >= 1;

  // ----- Shared result list -----
  const renderResultsList = () => (
    <div ref={listRef}>
      {/* Loading */}
      {trimmedQuery.length >= 2 && loading && (
        <div className="px-4 py-6 text-center">
          <div className="inline-block w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-xs text-text-muted mt-2 font-mono">
            Searching...
          </p>
        </div>
      )}

      {/* Hint: too short */}
      {trimmedQuery.length >= 1 && trimmedQuery.length < 2 && !loading && (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-text-muted font-mono">
            Type at least 2 characters to search
          </p>
        </div>
      )}

      {/* No results */}
      {trimmedQuery.length >= 2 && !loading && results.length === 0 && (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-text-muted font-mono">
            No tokens found
          </p>
        </div>
      )}

      {/* Results */}
      {!loading &&
        results.map((token, index) => (
          <button
            key={token.mintAddress}
            data-token-index={index}
            onClick={() => handleSelect(token.mintAddress)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={`w-full flex items-center gap-3 py-2.5 px-3 text-left transition-colors ${
              selectedIndex === index
                ? "bg-bg-elevated"
                : "hover:bg-bg-elevated"
            }`}
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
              <div className="flex items-center gap-2 mt-0.5">
                {token.priceUsd != null && (
                  <span className="text-[10px] text-text-secondary font-mono">
                    {formatPrice(token.priceUsd)}
                  </span>
                )}
                {token.priceChange24h != null && (
                  <span
                    className={`text-[10px] font-mono ${
                      token.priceChange24h >= 0 ? "text-green" : "text-red"
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
  );

  return (
    <>
      {/* Desktop search */}
      <div className="flex-1 max-w-md relative hidden md:block" ref={containerRef}>
        <div className="relative">
          {/* Magnifying glass icon */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
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
            placeholder="Search tokens, addresses..."
            className="w-full h-7 bg-bg-elevated border border-border rounded text-xs text-text-primary placeholder:text-text-faint pl-8 pr-12 focus:outline-none focus:border-accent/40 transition-colors font-mono"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-text-faint bg-bg-hover px-1 py-0.5 rounded border border-border font-mono">
            /
          </kbd>
        </div>

        {/* Desktop dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-bg-card border border-border rounded-xl shadow-xl max-h-80 overflow-y-auto terminal-scrollbar">
            {renderResultsList()}
          </div>
        )}
      </div>

      {/* Mobile search trigger */}
      <button
        onClick={() => setMobileOverlay(true)}
        className="md:hidden flex items-center justify-center w-8 h-8 text-text-muted hover:text-text-secondary transition-colors"
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
        <div className="fixed inset-0 z-[110] bg-bg-primary pt-safe-area animate-fade-in md:hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <button
              onClick={handleClose}
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
                ref={mobileInputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                placeholder="Search tokens, addresses..."
                className="w-full h-9 bg-bg-elevated border border-border rounded-lg text-sm text-text-primary placeholder:text-text-faint pl-9 pr-3 focus:outline-none focus:border-accent/40 transition-colors font-mono"
              />
              {query.length > 0 && (
                <button
                  onClick={() => {
                    setQuery("");
                    setResults([]);
                    setOpen(false);
                  }}
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

          {/* Mobile results */}
          <div className="flex-1 overflow-y-auto terminal-scrollbar px-2 py-2">
            {trimmedQuery.length < 1 && (
              <div className="px-4 py-8 text-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="w-8 h-8 mx-auto text-text-faint mb-3"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <p className="text-xs text-text-muted font-mono">
                  Search for tokens by name, symbol, or address
                </p>
              </div>
            )}
            {trimmedQuery.length >= 1 && renderResultsList()}
          </div>
        </div>
      )}
    </>
  );
}
