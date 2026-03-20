"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
      { keys: ["1-6"], description: "Navigate to pages (Swipe, Explore, Matches, Watchlist, Wallet, Settings)" },
      { keys: ["Ctrl", "K"], description: "Command palette" },
    ],
  },
  {
    title: "Swipe (on swipe page)",
    shortcuts: [
      { keys: ["\u2192"], description: "Buy (swipe right)" },
      { keys: ["\u2190"], description: "Pass (swipe left)" },
      { keys: ["\u2191"], description: "Add to watchlist" },
      { keys: ["Z"], description: "Undo last swipe" },
    ],
  },
  {
    title: "Trading",
    shortcuts: [
      { keys: ["T"], description: "Open quick trade panel" },
      { keys: ["Escape"], description: "Close panels/modals" },
    ],
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="bg-bg-elevated border border-border rounded px-1.5 py-0.5 font-mono text-xs text-text-secondary">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

  // Listen for "?" to open, Escape to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        close();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClick(e: MouseEvent) {
      if (e.target === backdropRef.current) {
        close();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-bg-card border border-border rounded-xl max-w-md w-full mx-4 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-bold text-text-primary">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={close}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
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

        {/* Body */}
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto terminal-scrollbar space-y-5">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                {group.title}
              </h3>
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                {group.shortcuts.map((shortcut, i) => (
                  <>
                    <div key={`keys-${i}`} className="flex items-center gap-1 shrink-0 py-1">
                      {shortcut.keys.map((key, ki) => (
                        <span key={ki} className="flex items-center gap-1">
                          {ki > 0 && (
                            <span className="text-[10px] text-text-faint">
                              +
                            </span>
                          )}
                          <Kbd>{key}</Kbd>
                        </span>
                      ))}
                    </div>
                    <div key={`desc-${i}`} className="flex items-center py-1">
                      <span className="text-xs text-text-secondary">
                        {shortcut.description}
                      </span>
                    </div>
                  </>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border">
          <p className="text-[10px] text-text-faint text-center">
            Press <Kbd>?</Kbd> to toggle this panel
          </p>
        </div>
      </div>
    </div>
  );
}
