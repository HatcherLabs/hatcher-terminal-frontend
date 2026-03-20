"use client";

import { useState, useEffect, useRef } from "react";
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

interface SearchResultsProps {
  query: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mint: string) => void;
  className?: string;
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

export function SearchResults({
  query,
  isOpen,
  onClose,
  onSelect,
  className = "",
}: SearchResultsProps) {
  const [results, setResults] = useState<SearchToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || results.length === 0) return;

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
          if (token) onSelect(token.mintAddress);
          break;
        }
        case "Escape": {
          e.preventDefault();
          onClose();
          break;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, onSelect, onClose]);

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector(
      `[data-search-index="${selectedIndex}"]`
    );
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmedQuery = query.trim();

  return (
    <div
      ref={containerRef}
      className={`bg-bg-card rounded-lg shadow-xl border border-border max-h-80 overflow-y-auto terminal-scrollbar ${className}`}
    >
      <div ref={listRef}>
        {/* Hint when query is too short */}
        {trimmedQuery.length < 2 && (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-text-muted font-mono">
              Type at least 2 characters to search
            </p>
          </div>
        )}

        {/* Loading state */}
        {trimmedQuery.length >= 2 && loading && (
          <div className="px-4 py-6 text-center">
            <div className="inline-block w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            <p className="text-xs text-text-muted mt-2 font-mono">
              Searching...
            </p>
          </div>
        )}

        {/* No results */}
        {trimmedQuery.length >= 2 && !loading && results.length === 0 && (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-text-muted font-mono">
              No tokens found for &ldquo;{trimmedQuery}&rdquo;
            </p>
          </div>
        )}

        {/* Results */}
        {!loading &&
          results.map((token, index) => (
            <button
              key={token.mintAddress}
              data-search-index={index}
              onClick={() => onSelect(token.mintAddress)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full flex items-center gap-3 py-2 px-3 text-left transition-colors ${
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
    </div>
  );
}
