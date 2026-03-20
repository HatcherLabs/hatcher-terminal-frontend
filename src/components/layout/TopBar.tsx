"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { PriceTicker } from "@/components/ui/PriceTicker";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { SearchResults } from "@/components/ui/SearchResults";

export function TopBar() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Ctrl+K to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearchSelect = useCallback(
    (mint: string) => {
      setSearchQuery("");
      setSearchOpen(false);
      router.push(`/token/${mint}`);
    },
    [router]
  );

  const handleSearchClose = useCallback(() => {
    setSearchOpen(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchQuery(value);
      if (value.trim().length > 0) {
        setSearchOpen(true);
      } else {
        setSearchOpen(false);
      }
    },
    []
  );

  const handleInputFocus = useCallback(() => {
    if (searchQuery.trim().length > 0) {
      setSearchOpen(true);
    }
  }, [searchQuery]);

  return (
    <div className="shrink-0">
      <header className="h-12 bg-bg-card border-b border-border flex items-center px-4 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-accent font-bold text-lg tracking-widest font-mono">
            HATCHER
          </span>
          <span className="text-text-faint text-[10px] font-mono uppercase tracking-wider hidden xl:inline">
            Terminal
          </span>
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-border shrink-0" />

        {/* Search */}
        <div className="flex-1 max-w-md relative" ref={searchContainerRef}>
          <div className="relative">
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
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              placeholder="Search tokens, addresses..."
              className="w-full h-7 bg-bg-elevated border border-border rounded text-xs text-text-primary placeholder:text-text-faint pl-8 pr-3 focus:outline-none focus:border-accent/40 transition-colors font-mono"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-text-faint bg-bg-hover px-1 py-0.5 rounded border border-border font-mono hidden xl:inline">
              Ctrl+K
            </kbd>
          </div>

          {/* Search Results Dropdown */}
          {searchOpen && (
            <SearchResults
              query={searchQuery}
              isOpen={searchOpen}
              onClose={handleSearchClose}
              onSelect={handleSearchSelect}
              className="absolute top-full left-0 right-0 mt-1 z-50"
            />
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right section */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Notifications */}
          <NotificationBell />

          <div className="w-px h-6 bg-border" />

          {/* Network indicator */}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
            <span className="text-[10px] text-text-muted font-mono uppercase">
              Solana
            </span>
          </div>

          <div className="w-px h-6 bg-border" />

          {/* User */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-accent/20 border border-accent/30 flex items-center justify-center">
              <span className="text-[10px] text-accent font-bold font-mono">
                {user?.username?.[0]?.toUpperCase() || "?"}
              </span>
            </div>
            <span className="text-xs text-text-secondary font-mono hidden xl:inline">
              {user?.username || "Anonymous"}
            </span>
          </div>
        </div>
      </header>

      {/* Price Ticker — desktop only */}
      <PriceTicker />
    </div>
  );
}
