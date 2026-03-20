"use client";

import { useEffect, useRef, useState, useMemo } from "react";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutEntry[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["1"], description: "Go to Swipe" },
      { keys: ["2"], description: "Go to Explore" },
      { keys: ["3"], description: "Go to Portfolio" },
      { keys: ["4"], description: "Go to Passed" },
      { keys: ["5"], description: "Go to Compare" },
      { keys: ["6"], description: "Go to Wallet" },
      { keys: ["7"], description: "Go to Settings" },
    ],
  },
  {
    title: "Trading",
    shortcuts: [
      { keys: ["B"], description: "Quick buy (when token selected)" },
      { keys: ["S"], description: "Quick sell (when token selected)" },
      { keys: ["W"], description: "Toggle watchlist for current token" },
    ],
  },
  {
    title: "Swipe",
    shortcuts: [
      { keys: ["\u2192"], description: "Buy token (swipe right)" },
      { keys: ["\u2190"], description: "Pass on token (swipe left)" },
      { keys: ["\u2191"], description: "Add to watchlist" },
      { keys: ["Z"], description: "Undo last swipe" },
    ],
  },
  {
    title: "General",
    shortcuts: [
      { keys: ["Ctrl", "K"], description: "Open command palette" },
      { keys: ["/"], description: "Open command palette" },
      { keys: ["?"], description: "Toggle this help" },
      { keys: ["Esc"], description: "Close any open modal or panel" },
    ],
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd
      className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded px-1.5 py-0.5 font-mono text-[11px] leading-none"
      style={{ backgroundColor: "#1f2435", color: "#5c6380" }}
    >
      {children}
    </kbd>
  );
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");

  // Reset search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      // Focus the search input after a frame so the modal is rendered
      requestAnimationFrame(() => {
        searchRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Close on click outside
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

  // Filter groups based on search
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return shortcutGroups;

    return shortcutGroups
      .map((group) => ({
        ...group,
        shortcuts: group.shortcuts.filter(
          (s) =>
            s.description.toLowerCase().includes(q) ||
            s.keys.some((k) => k.toLowerCase().includes(q))
        ),
      }))
      .filter((group) => group.shortcuts.length > 0);
  }, [search]);

  if (!isOpen) return null;

  const hasResults = filteredGroups.length > 0;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="w-full max-w-lg mx-4 rounded-xl shadow-2xl animate-scale-in"
        style={{ backgroundColor: "#0a0d14", borderWidth: 1, borderColor: "#1a1f2e" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottomWidth: 1, borderColor: "#1a1f2e" }}
        >
          <h2 className="text-sm font-bold text-text-primary">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary transition-colors"
            style={{ backgroundColor: "#1f2435" }}
            aria-label="Close shortcuts modal"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-3 pb-1">
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shortcuts..."
            className="w-full h-8 rounded-md px-3 text-xs font-mono text-text-secondary placeholder:text-text-faint outline-none focus:ring-1 focus:ring-accent/40"
            style={{ backgroundColor: "#1f2435", borderWidth: 1, borderColor: "#1a1f2e" }}
          />
        </div>

        {/* Body */}
        <div className="px-5 py-3 max-h-[55vh] overflow-y-auto terminal-scrollbar space-y-4">
          {hasResults ? (
            filteredGroups.map((group) => (
              <div key={group.title}>
                <h3
                  className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: "#5c6380" }}
                >
                  {group.title}
                </h3>
                <table className="w-full">
                  <tbody>
                    {group.shortcuts.map((shortcut, i) => (
                      <tr
                        key={i}
                        className="group"
                      >
                        <td className="py-1 pr-4 align-middle" style={{ width: "40%" }}>
                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, ki) => (
                              <span key={ki} className="flex items-center gap-1">
                                {ki > 0 && (
                                  <span className="text-[10px]" style={{ color: "#5c6380" }}>
                                    +
                                  </span>
                                )}
                                <Kbd>{key}</Kbd>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-1 align-middle">
                          <span className="text-xs text-text-secondary">
                            {shortcut.description}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          ) : (
            <p className="text-xs text-text-faint text-center py-6">
              No shortcuts matching &ldquo;{search}&rdquo;
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-2.5"
          style={{ borderTopWidth: 1, borderColor: "#1a1f2e" }}
        >
          <p className="text-[10px] text-text-faint text-center">
            Press <Kbd>?</Kbd> to toggle &middot; <Kbd>Esc</Kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
