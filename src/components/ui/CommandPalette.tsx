"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuickTrade } from "@/components/providers/QuickTradeProvider";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Command {
  id: string;
  label: string;
  category: "page" | "action" | "token";
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

interface TokenResult {
  mintAddress: string;
  name: string;
  ticker: string;
  imageUri: string | null;
  marketCapUsd: number | null;
  priceUsd?: number | null;
  riskLevel?: "LOW" | "MED" | "HIGH" | "EXTREME" | null;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

const RECENT_SEARCHES_KEY = "hatcher_recent_searches";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(term: string) {
  if (!term.trim()) return;
  try {
    const recent = getRecentSearches().filter(
      (r) => r.toLowerCase() !== term.toLowerCase()
    );
    recent.unshift(term.trim());
    localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT))
    );
  } catch {
    // Ignore storage errors
  }
}

// ---------------------------------------------------------------------------
// Fuzzy matching
// ---------------------------------------------------------------------------

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.startsWith(q)) return 3;
  if (t.includes(q)) return 2;
  if (fuzzyMatch(q, t)) return 1;
  return 0;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatMarketCap(n: number | null | undefined): string {
  if (n == null) return "\u2014";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function NavIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

function ActionIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="w-4 h-4"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { openPanel, selectedToken } = useQuickTrade();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Token search state
  const [tokenResults, setTokenResults] = useState<TokenResult[]>([]);
  const [tokenSearchLoading, setTokenSearchLoading] = useState(false);
  const tokenDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Debounced token search ----
  useEffect(() => {
    if (!isOpen) return;

    const searchQuery = query.startsWith("$")
      ? query.slice(1).trim()
      : query.trim();

    if (searchQuery.length < 2) {
      setTokenResults([]);
      setTokenSearchLoading(false);
      return;
    }

    setTokenSearchLoading(true);
    if (tokenDebounceRef.current) clearTimeout(tokenDebounceRef.current);

    tokenDebounceRef.current = setTimeout(async () => {
      try {
        const res = await api.raw(
          `/api/tokens/search?q=${encodeURIComponent(searchQuery)}&limit=5`
        );
        const json = await res.json();
        if (json.success) {
          setTokenResults(json.data);
        } else {
          setTokenResults([]);
        }
      } catch {
        setTokenResults([]);
      }
      setTokenSearchLoading(false);
    }, 300);

    return () => {
      if (tokenDebounceRef.current) clearTimeout(tokenDebounceRef.current);
    };
  }, [query, isOpen]);

  // ---- Static commands ----
  const commands: Command[] = useMemo(() => {
    const nav = (
      id: string,
      label: string,
      path: string,
      keywords: string[]
    ): Command => ({
      id,
      label,
      category: "page",
      icon: <NavIcon />,
      action: () => router.push(path),
      keywords,
    });

    const act = (
      id: string,
      label: string,
      action: () => void,
      keywords: string[]
    ): Command => ({
      id,
      label,
      category: "action",
      icon: <ActionIcon />,
      action,
      keywords,
    });

    return [
      // Pages
      nav("nav-explore", "Go to Explore", "/explore", [
        "explore",
        "search",
        "find",
        "tokens",
      ]),
      nav("nav-swipe", "Go to Swipe", "/swipe", [
        "swipe",
        "discover",
        "browse",
      ]),
      nav("nav-portfolio", "Go to Portfolio", "/matches", [
        "portfolio",
        "matches",
        "holdings",
      ]),
      nav("nav-watchlist", "Go to Watchlist", "/watchlist", [
        "watchlist",
        "saved",
        "favorites",
      ]),
      nav("nav-orders", "Go to Orders", "/orders", [
        "orders",
        "trades",
        "history",
      ]),
      nav("nav-settings", "Go to Settings", "/settings", [
        "settings",
        "preferences",
        "config",
      ]),
      nav("nav-wallet", "Go to Wallet", "/wallet", [
        "wallet",
        "balance",
        "funds",
        "sol",
      ]),
      nav("nav-graveyard", "Go to Graveyard", "/graveyard", [
        "graveyard",
        "passed",
        "rejected",
      ]),
      nav("nav-compare", "Go to Compare", "/compare", [
        "compare",
        "side by side",
        "versus",
      ]),
      // Actions
      act(
        "action-toggle-sidebar",
        "Toggle Sidebar",
        () => {
          document
            .querySelector("[data-sidebar-toggle]")
            ?.dispatchEvent(new Event("click", { bubbles: true }));
        },
        ["sidebar", "toggle", "menu", "collapse"]
      ),
      act(
        "action-clear-watchlist",
        "Clear Watchlist",
        () => {
          router.push("/watchlist?action=clear");
        },
        ["clear", "watchlist", "remove", "reset"]
      ),
      act(
        "action-export-csv",
        "Export Portfolio CSV",
        () => {
          router.push("/matches?action=export");
        },
        ["export", "csv", "download", "portfolio"]
      ),
      act(
        "action-buy",
        "Quick Buy",
        () => {
          if (selectedToken) openPanel();
        },
        ["buy", "trade", "purchase"]
      ),
      act(
        "action-sell",
        "Quick Sell",
        () => {
          if (selectedToken) openPanel();
        },
        ["sell", "trade", "close"]
      ),
    ];
  }, [router, openPanel, selectedToken]);

  // ---- Reset state on open ----
  useEffect(() => {
    if (isOpen) {
      setRecentSearches(getRecentSearches());
      setQuery("");
      setSelectedIndex(0);
      setTokenResults([]);
    }
  }, [isOpen]);

  // ---- Auto-focus input ----
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // ---- Filter & group commands ----
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;

    const q = query.trim();
    return commands
      .map((cmd) => {
        const labelScore = fuzzyScore(q, cmd.label);
        const keywordScore = Math.max(
          0,
          ...(cmd.keywords?.map((kw) => fuzzyScore(q, kw)) ?? [0])
        );
        return { cmd, score: Math.max(labelScore, keywordScore) };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ cmd }) => cmd);
  }, [query, commands]);

  // Group filtered commands by category
  const groupedCommands = useMemo(() => {
    const pages = filteredCommands.filter((c) => c.category === "page");
    const actions = filteredCommands.filter((c) => c.category === "action");
    return { pages, actions };
  }, [filteredCommands]);

  // Show tokens when query is present (always, not just on no-match)
  const showTokens = query.trim().length >= 2;

  // Build a flat selectable-items list for keyboard nav
  const flatItems = useMemo(() => {
    const items: Array<
      | { type: "command"; command: Command }
      | { type: "token"; token: TokenResult }
      | { type: "recent"; term: string }
    > = [];

    // If no query, show recent searches first
    if (!query.trim() && recentSearches.length > 0) {
      for (const term of recentSearches) {
        items.push({ type: "recent", term });
      }
    }

    for (const cmd of groupedCommands.pages) {
      items.push({ type: "command", command: cmd });
    }
    for (const cmd of groupedCommands.actions) {
      items.push({ type: "command", command: cmd });
    }

    if (showTokens) {
      for (const token of tokenResults) {
        items.push({ type: "token", token });
      }
    }

    return items;
  }, [
    query,
    recentSearches,
    groupedCommands,
    showTokens,
    tokenResults,
  ]);

  // ---- Reset index on query change ----
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // ---- Execute command ----
  const executeCommand = useCallback(
    (cmd: Command) => {
      saveRecentSearch(query.trim());
      onClose();
      cmd.action();
    },
    [onClose, query]
  );

  // ---- Keyboard navigation ----
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < flatItems.length - 1 ? prev + 1 : 0
          );
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : flatItems.length - 1
          );
          break;
        }
        case "Enter": {
          e.preventDefault();
          const item = flatItems[selectedIndex];
          if (!item) break;

          if (item.type === "command") {
            executeCommand(item.command);
          } else if (item.type === "token") {
            saveRecentSearch(query.trim());
            onClose();
            router.push(`/token/${item.token.mintAddress}`);
          } else if (item.type === "recent") {
            setQuery(item.term);
          }
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
  }, [
    isOpen,
    flatItems,
    selectedIndex,
    executeCommand,
    onClose,
    router,
    query,
  ]);

  // ---- Scroll selected into view ----
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // ---- Close on backdrop click ----
  useEffect(() => {
    if (!isOpen) return;

    function handleClick(e: MouseEvent) {
      if (e.target === backdropRef.current) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ---- Render helpers ----

  let globalIndex = -1;

  const renderItem = (
    idx: number,
    key: string,
    onClick: () => void,
    content: React.ReactNode
  ) => (
    <button
      key={key}
      data-index={idx}
      onClick={onClick}
      onMouseEnter={() => setSelectedIndex(idx)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
        selectedIndex === idx
          ? "bg-[#181c28] text-text-primary"
          : "text-text-secondary hover:bg-[#181c28]"
      }`}
    >
      {content}
    </button>
  );

  const renderSectionHeader = (label: string) => (
    <div className="px-4 pt-3 pb-1.5" key={`section-${label}`}>
      <span className="text-[10px] font-bold text-text-faint uppercase tracking-wider">
        {label}
      </span>
    </div>
  );

  // Count items per section for rendering
  const hasRecent = !query.trim() && recentSearches.length > 0;
  const hasPages = groupedCommands.pages.length > 0;
  const hasActions = groupedCommands.actions.length > 0;
  const hasTokens = showTokens && (tokenResults.length > 0 || tokenSearchLoading);
  const noResults =
    !hasRecent &&
    !hasPages &&
    !hasActions &&
    !hasTokens &&
    query.trim().length > 0;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="w-full max-w-lg mx-4 overflow-hidden shadow-2xl animate-scale-in"
        style={{
          background: "#0a0d14",
          border: "1px solid #1a1f2e",
          borderRadius: 12,
        }}
      >
        {/* ---- Search Input ---- */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid #1a1f2e" }}
        >
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, tokens, actions...  Ctrl+K  /  /"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-faint focus:outline-none font-mono"
            style={{ caretColor: "#22c55e" }}
          />
          <kbd className="text-[9px] text-text-faint px-1.5 py-0.5 rounded font-mono shrink-0 bg-[#1f2435] border border-[#1a1f2e]">
            Esc
          </kbd>
        </div>

        {/* ---- Results List ---- */}
        <div
          ref={listRef}
          className="overflow-y-auto terminal-scrollbar"
          style={{ maxHeight: 400 }}
        >
          {/* No results */}
          {noResults && !tokenSearchLoading && (
            <div className="px-4 py-10 text-center">
              <p className="text-xs text-text-muted font-mono">
                No results for &quot;{query.trim()}&quot;
              </p>
            </div>
          )}

          {/* Recent Searches */}
          {hasRecent && (
            <>
              {renderSectionHeader("Recent Searches")}
              {recentSearches.map((term) => {
                globalIndex++;
                const idx = globalIndex;
                return renderItem(idx, `recent-${term}`, () => setQuery(term), (
                  <>
                    <span className="shrink-0 text-text-muted">
                      <ClockIcon />
                    </span>
                    <span className="text-xs font-medium truncate font-mono">
                      {term}
                    </span>
                  </>
                ));
              })}
            </>
          )}

          {/* Pages */}
          {hasPages && (
            <>
              {renderSectionHeader("Pages")}
              {groupedCommands.pages.map((cmd) => {
                globalIndex++;
                const idx = globalIndex;
                return renderItem(
                  idx,
                  cmd.id,
                  () => executeCommand(cmd),
                  <>
                    <span
                      className={`shrink-0 ${
                        selectedIndex === idx
                          ? "text-green"
                          : "text-text-muted"
                      }`}
                    >
                      {cmd.icon}
                    </span>
                    <span className="text-xs font-medium truncate">
                      {cmd.label}
                    </span>
                    <span className="ml-auto text-[10px] text-text-faint font-mono shrink-0">
                      Page
                    </span>
                  </>
                );
              })}
            </>
          )}

          {/* Actions */}
          {hasActions && (
            <>
              {renderSectionHeader("Actions")}
              {groupedCommands.actions.map((cmd) => {
                globalIndex++;
                const idx = globalIndex;
                return renderItem(
                  idx,
                  cmd.id,
                  () => executeCommand(cmd),
                  <>
                    <span
                      className={`shrink-0 ${
                        selectedIndex === idx
                          ? "text-green"
                          : "text-text-muted"
                      }`}
                    >
                      {cmd.icon}
                    </span>
                    <span className="text-xs font-medium truncate">
                      {cmd.label}
                    </span>
                    <span className="ml-auto text-[10px] text-text-faint font-mono shrink-0">
                      Action
                    </span>
                  </>
                );
              })}
            </>
          )}

          {/* Tokens */}
          {showTokens && (
            <>
              {renderSectionHeader("Tokens")}

              {tokenSearchLoading && (
                <div className="px-4 py-4 text-center">
                  <div className="inline-block w-3 h-3 border-2 border-green/30 border-t-green rounded-full animate-spin" />
                  <span className="text-[10px] text-text-muted ml-2 font-mono">
                    Searching tokens...
                  </span>
                </div>
              )}

              {!tokenSearchLoading &&
                tokenResults.length === 0 &&
                query.trim().length >= 2 && (
                  <div className="px-4 py-4 text-center">
                    <span className="text-[10px] text-text-muted font-mono">
                      No tokens found
                    </span>
                  </div>
                )}

              {!tokenSearchLoading &&
                tokenResults.map((token) => {
                  globalIndex++;
                  const idx = globalIndex;
                  return renderItem(
                    idx,
                    `token-${token.mintAddress}`,
                    () => {
                      saveRecentSearch(query.trim());
                      onClose();
                      router.push(`/token/${token.mintAddress}`);
                    },
                    <>
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
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {token.riskLevel && (
                          <RiskBadge level={token.riskLevel} />
                        )}
                        <span className="text-[10px] text-text-faint font-mono">
                          MC {formatMarketCap(token.marketCapUsd)}
                        </span>
                      </div>
                    </>
                  );
                })}
            </>
          )}
        </div>

        {/* ---- Footer Hints ---- */}
        <div
          className="flex items-center justify-center gap-4 px-4 py-2.5"
          style={{ borderTop: "1px solid #1a1f2e" }}
        >
          <span className="flex items-center gap-1 text-[10px] text-text-faint">
            <kbd className="bg-[#1f2435] border border-[#1a1f2e] rounded px-1 py-0.5 font-mono text-[9px]">
              &uarr;
            </kbd>
            <kbd className="bg-[#1f2435] border border-[#1a1f2e] rounded px-1 py-0.5 font-mono text-[9px]">
              &darr;
            </kbd>
            navigate
          </span>
          <span className="flex items-center gap-1 text-[10px] text-text-faint">
            <kbd className="bg-[#1f2435] border border-[#1a1f2e] rounded px-1 py-0.5 font-mono text-[9px]">
              Enter
            </kbd>
            select
          </span>
          <span className="flex items-center gap-1 text-[10px] text-text-faint">
            <kbd className="bg-[#1f2435] border border-[#1a1f2e] rounded px-1 py-0.5 font-mono text-[9px]">
              Esc
            </kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
