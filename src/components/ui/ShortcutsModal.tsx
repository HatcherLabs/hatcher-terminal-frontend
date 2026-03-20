"use client";

import { useEffect, useRef } from "react";

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
      { keys: ["1"], description: "Go to Discover" },
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
      { keys: ["B"], description: "Open quick trade (Buy)" },
      { keys: ["S"], description: "Open quick trade (Sell)" },
      { keys: ["T"], description: "Toggle quick trade panel" },
      { keys: ["Esc"], description: "Close open panel" },
    ],
  },
  {
    title: "Discovery",
    shortcuts: [
      { keys: ["\u2190"], description: "Pass on token (swipe page)" },
      { keys: ["\u2192"], description: "Buy token (swipe page)" },
      { keys: ["W"], description: "Toggle watchlist for current token" },
    ],
  },
  {
    title: "General",
    shortcuts: [
      { keys: ["/"], description: "Open command palette" },
      { keys: ["\u2318", "K"], description: "Open command palette" },
      { keys: ["?"], description: "Show this help" },
    ],
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 bg-bg-elevated border border-border rounded px-2 py-0.5 font-mono text-xs text-text-secondary">
      {children}
    </kbd>
  );
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

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
            onClick={onClose}
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
              <div className="space-y-1.5">
                {group.shortcuts.map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-xs text-text-secondary">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1 shrink-0 ml-4">
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
                  </div>
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
