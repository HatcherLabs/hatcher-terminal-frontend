"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuickTrade } from "@/components/providers/QuickTradeProvider";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { api } from "@/lib/api";

interface Command {
  id: string;
  label: string;
  category: "navigation" | "action" | "search";
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const RECENT_COMMANDS_KEY = "hatcher_recent_commands";
const MAX_RECENT = 5;

function getRecentCommandIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_COMMANDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentCommandId(id: string) {
  try {
    const recent = getRecentCommandIds().filter((r) => r !== id);
    recent.unshift(id);
    localStorage.setItem(
      RECENT_COMMANDS_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT))
    );
  } catch {
    // Ignore storage errors
  }
}

/** Simple fuzzy match: checks if all characters of the query appear in order in the target */
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
  // Exact prefix match gets highest score
  if (t.startsWith(q)) return 3;
  // Contains as substring
  if (t.includes(q)) return 2;
  // Fuzzy match
  if (fuzzyMatch(q, t)) return 1;
  return 0;
}

// Icons
function NavIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

function ActionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { openPanel, selectedToken } = useQuickTrade();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  // Token search state
  const [tokenResults, setTokenResults] = useState<
    Array<{
      mintAddress: string;
      name: string;
      ticker: string;
      imageUri: string | null;
      marketCapUsd: number | null;
      priceUsd?: number | null;
    }>
  >([]);
  const [tokenSearchLoading, setTokenSearchLoading] = useState(false);
  const tokenDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch token search results when query starts with $ or has no command matches
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

  // Build commands list
  const commands: Command[] = useMemo(() => {
    const cmds: Command[] = [
      // Navigation
      {
        id: "nav-discover",
        label: "Go to Discover",
        category: "navigation",
        icon: <NavIcon />,
        action: () => router.push("/swipe"),
        keywords: ["swipe", "discover", "browse"],
      },
      {
        id: "nav-explore",
        label: "Go to Explore",
        category: "navigation",
        icon: <NavIcon />,
        action: () => router.push("/explore"),
        keywords: ["explore", "search", "find"],
      },
      {
        id: "nav-portfolio",
        label: "Go to Portfolio",
        category: "navigation",
        icon: <NavIcon />,
        action: () => router.push("/matches"),
        keywords: ["portfolio", "matches", "holdings"],
      },
      {
        id: "nav-passed",
        label: "Go to Passed",
        category: "navigation",
        icon: <NavIcon />,
        action: () => router.push("/graveyard"),
        keywords: ["passed", "graveyard", "rejected"],
      },
      {
        id: "nav-compare",
        label: "Go to Compare",
        category: "navigation",
        icon: <NavIcon />,
        action: () => router.push("/compare"),
        keywords: ["compare", "side by side", "versus"],
      },
      {
        id: "nav-wallet",
        label: "Go to Wallet",
        category: "navigation",
        icon: <NavIcon />,
        action: () => router.push("/wallet"),
        keywords: ["wallet", "balance", "funds"],
      },
      {
        id: "nav-settings",
        label: "Go to Settings",
        category: "navigation",
        icon: <NavIcon />,
        action: () => router.push("/settings"),
        keywords: ["settings", "preferences", "config"],
      },
      {
        id: "nav-watchlist",
        label: "Go to Watchlist",
        category: "navigation",
        icon: <NavIcon />,
        action: () => router.push("/watchlist"),
        keywords: ["watchlist", "saved", "favorites"],
      },
      // Actions
      {
        id: "action-buy",
        label: "Quick Buy",
        category: "action",
        icon: <ActionIcon />,
        action: () => {
          if (selectedToken) openPanel();
        },
        keywords: ["buy", "trade", "purchase"],
      },
      {
        id: "action-sell",
        label: "Quick Sell",
        category: "action",
        icon: <ActionIcon />,
        action: () => {
          if (selectedToken) openPanel();
        },
        keywords: ["sell", "trade", "close"],
      },
    ];

    // Dynamic search command when there's a query
    if (query.trim()) {
      cmds.push({
        id: "search-tokens",
        label: `Search tokens: "${query.trim()}"`,
        category: "search",
        icon: <SearchIcon />,
        action: () =>
          router.push(`/explore?q=${encodeURIComponent(query.trim())}`),
        keywords: ["search", "token", "find"],
      });
    }

    return cmds;
  }, [router, openPanel, selectedToken, query]);

  // Load recent commands on open
  useEffect(() => {
    if (isOpen) {
      setRecentIds(getRecentCommandIds());
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow the DOM to render
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Filter and sort commands
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // Show recent commands first, then all
      const recent = recentIds
        .map((id) => commands.find((c) => c.id === id))
        .filter(Boolean) as Command[];
      const rest = commands.filter((c) => !recentIds.includes(c.id));
      return { recent, all: rest };
    }

    const q = query.trim();
    const scored = commands
      .map((cmd) => {
        const labelScore = fuzzyScore(q, cmd.label);
        const keywordScore = Math.max(
          0,
          ...(cmd.keywords?.map((kw) => fuzzyScore(q, kw)) ?? [0])
        );
        return { cmd, score: Math.max(labelScore, keywordScore) };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    return { recent: [], all: scored.map(({ cmd }) => cmd) };
  }, [query, commands, recentIds]);

  const allDisplayed = useMemo(
    () => [...filteredCommands.recent, ...filteredCommands.all],
    [filteredCommands]
  );

  // Show token section when query starts with "$" or no commands match
  const showTokenSection = useMemo(() => {
    if (!query.trim()) return false;
    return query.startsWith("$") || allDisplayed.length === 0;
  }, [query, allDisplayed.length]);

  // Total items count for keyboard nav (commands + tokens)
  const totalItems = allDisplayed.length + (showTokenSection ? tokenResults.length : 0);

  // Reset selected index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeCommand = useCallback(
    (cmd: Command) => {
      saveRecentCommandId(cmd.id);
      onClose();
      cmd.action();
    },
    [onClose]
  );

  // Keyboard navigation inside palette
  useEffect(() => {
    if (!isOpen) return;

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
          if (selectedIndex < allDisplayed.length) {
            const cmd = allDisplayed[selectedIndex];
            if (cmd) executeCommand(cmd);
          } else {
            // Token result selected
            const tokenIdx = selectedIndex - allDisplayed.length;
            const token = tokenResults[tokenIdx];
            if (token) {
              onClose();
              router.push(`/token/${token.mintAddress}`);
            }
          }
          break;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, allDisplayed, selectedIndex, executeCommand, totalItems, tokenResults, onClose, router]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Close on backdrop click
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

  const categoryLabel = (cat: string) => {
    switch (cat) {
      case "navigation":
        return "Navigate";
      case "action":
        return "Actions";
      case "search":
        return "Search";
      default:
        return cat;
    }
  };

  let globalIndex = -1;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-bg-card/95 backdrop-blur-xl border border-border rounded-xl max-w-lg w-full mx-4 shadow-2xl animate-scale-in overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="w-4 h-4 text-text-muted shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-faint focus:outline-none font-mono"
          />
          <kbd className="text-[9px] text-text-faint bg-bg-elevated px-1.5 py-0.5 rounded border border-border font-mono shrink-0">
            Esc
          </kbd>
        </div>

        {/* Command list */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto terminal-scrollbar py-2"
        >
          {allDisplayed.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-text-muted">No commands found</p>
            </div>
          )}

          {/* Recent section */}
          {filteredCommands.recent.length > 0 && (
            <>
              <div className="px-4 py-1">
                <span className="text-[10px] font-bold text-text-faint uppercase tracking-wider">
                  Recent
                </span>
              </div>
              {filteredCommands.recent.map((cmd) => {
                globalIndex++;
                const idx = globalIndex;
                return (
                  <button
                    key={cmd.id}
                    data-index={idx}
                    onClick={() => executeCommand(cmd)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                      selectedIndex === idx
                        ? "bg-accent-purple/10 text-text-primary"
                        : "text-text-secondary hover:bg-bg-hover"
                    }`}
                  >
                    <span
                      className={`shrink-0 ${
                        selectedIndex === idx
                          ? "text-accent"
                          : "text-text-muted"
                      }`}
                    >
                      {cmd.icon}
                    </span>
                    <span className="text-xs font-medium truncate">
                      {cmd.label}
                    </span>
                    <span className="ml-auto text-[10px] text-text-faint capitalize shrink-0">
                      {categoryLabel(cmd.category)}
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {/* All / filtered commands */}
          {filteredCommands.all.length > 0 && (
            <>
              {!query.trim() && filteredCommands.recent.length > 0 && (
                <div className="px-4 py-1 mt-1">
                  <span className="text-[10px] font-bold text-text-faint uppercase tracking-wider">
                    All Commands
                  </span>
                </div>
              )}
              {filteredCommands.all.map((cmd) => {
                globalIndex++;
                const idx = globalIndex;
                return (
                  <button
                    key={cmd.id}
                    data-index={idx}
                    onClick={() => executeCommand(cmd)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                      selectedIndex === idx
                        ? "bg-accent-purple/10 text-text-primary"
                        : "text-text-secondary hover:bg-bg-hover"
                    }`}
                  >
                    <span
                      className={`shrink-0 ${
                        selectedIndex === idx
                          ? "text-accent"
                          : "text-text-muted"
                      }`}
                    >
                      {cmd.icon}
                    </span>
                    <span className="text-xs font-medium truncate">
                      {cmd.label}
                    </span>
                    <span className="ml-auto text-[10px] text-text-faint capitalize shrink-0">
                      {categoryLabel(cmd.category)}
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {/* Token search results section */}
          {showTokenSection && (
            <>
              <div className="px-4 py-1 mt-1">
                <span className="text-[10px] font-bold text-text-faint uppercase tracking-wider">
                  Tokens
                </span>
              </div>
              {tokenSearchLoading && (
                <div className="px-4 py-3 text-center">
                  <div className="inline-block w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                  <span className="text-[10px] text-text-muted ml-2 font-mono">
                    Searching tokens...
                  </span>
                </div>
              )}
              {!tokenSearchLoading && tokenResults.length === 0 && query.trim().length >= 2 && (
                <div className="px-4 py-3 text-center">
                  <span className="text-[10px] text-text-muted font-mono">
                    No tokens found
                  </span>
                </div>
              )}
              {!tokenSearchLoading &&
                tokenResults.map((token, tIdx) => {
                  const idx = allDisplayed.length + tIdx;
                  return (
                    <button
                      key={token.mintAddress}
                      data-index={idx}
                      onClick={() => {
                        onClose();
                        router.push(`/token/${token.mintAddress}`);
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                        selectedIndex === idx
                          ? "bg-accent-purple/10 text-text-primary"
                          : "text-text-secondary hover:bg-bg-hover"
                      }`}
                    >
                      <TokenAvatar
                        mintAddress={token.mintAddress}
                        imageUri={token.imageUri}
                        size={24}
                        ticker={token.ticker}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium truncate">
                          {token.name}
                        </span>
                        <span className="text-[10px] text-text-secondary font-mono ml-2">
                          ${token.ticker}
                        </span>
                      </div>
                      {token.marketCapUsd != null && (
                        <span className="text-[10px] text-text-faint font-mono shrink-0">
                          MC {token.marketCapUsd >= 1_000_000
                            ? `$${(token.marketCapUsd / 1_000_000).toFixed(1)}M`
                            : token.marketCapUsd >= 1_000
                            ? `$${(token.marketCapUsd / 1_000).toFixed(1)}K`
                            : `$${token.marketCapUsd.toFixed(0)}`}
                        </span>
                      )}
                    </button>
                  );
                })}
            </>
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-center gap-4 px-4 py-2.5 border-t border-border">
          <span className="flex items-center gap-1 text-[10px] text-text-faint">
            <kbd className="bg-bg-elevated border border-border rounded px-1 py-0.5 font-mono text-[9px]">
              &uarr;
            </kbd>
            <kbd className="bg-bg-elevated border border-border rounded px-1 py-0.5 font-mono text-[9px]">
              &darr;
            </kbd>
            navigate
          </span>
          <span className="flex items-center gap-1 text-[10px] text-text-faint">
            <kbd className="bg-bg-elevated border border-border rounded px-1 py-0.5 font-mono text-[9px]">
              Enter
            </kbd>
            select
          </span>
          <span className="flex items-center gap-1 text-[10px] text-text-faint">
            <kbd className="bg-bg-elevated border border-border rounded px-1 py-0.5 font-mono text-[9px]">
              Esc
            </kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
