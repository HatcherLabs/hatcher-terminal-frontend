"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuickTrade } from "@/components/providers/QuickTradeProvider";
import { useWatchlist } from "@/components/providers/WatchlistProvider";

interface KeyboardShortcutsOptions {
  onOpenShortcutsModal: () => void;
  onOpenCommandPalette: () => void;
  onCloseCommandPalette: () => void;
  onCloseShortcutsModal: () => void;
  isCommandPaletteOpen: boolean;
  isShortcutsModalOpen: boolean;
}

/** Navigation routes indexed 1-9 (matches sidebar order) */
const NAV_ROUTES = [
  "/swipe",       // 1 - Swipe / Discover
  "/explore",     // 2 - Explore
  "/watchlist",   // 3 - Watchlist
  "/matches",     // 4 - Portfolio
  "/orders",      // 5 - Orders
  "/alerts",      // 6 - Alerts
  "/smart-money", // 7 - Smart Money
  "/copy-trade",  // 8 - Copy Trade
];

/**
 * Returns true when the keyboard event target is an editable element
 * (input, textarea, select, contenteditable) and non-global shortcuts
 * should be suppressed.
 */
function isEditableTarget(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement;
  const tagName = target.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable
  );
}

/**
 * Central keyboard shortcut handler for the Hatcher Terminal.
 * Attaches a single global keydown listener and dispatches actions.
 *
 * Shortcuts:
 *   Escape         Close any open modal / panel (always fires)
 *   Ctrl+K / Cmd+K Toggle command palette (fires even in inputs)
 *   /              Open command palette
 *   ?              Open shortcuts help modal
 *   1-9            Navigate to pages (Swipe, Explore, Watchlist, Portfolio, Orders, Graveyard, Alerts, Smart Money, Copy Trade)
 *   b / B          Quick buy (when a token is selected)
 *   s / S          Quick sell (when a token is selected)
 *   w / W          Toggle watchlist for current token
 */
export function useKeyboardShortcuts({
  onOpenShortcutsModal,
  onOpenCommandPalette,
  onCloseCommandPalette,
  onCloseShortcutsModal,
  isCommandPaletteOpen,
  isShortcutsModalOpen,
}: KeyboardShortcutsOptions): void {
  const router = useRouter();
  const pathname = usePathname();
  const {
    isOpen: isQuickTradeOpen,
    closePanel: closeQuickTrade,
    openPanel: openQuickTrade,
    selectedToken,
  } = useQuickTrade();
  const { isWatchlisted, addToWatchlist, removeFromWatchlist } = useWatchlist();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // ── Escape: always handle regardless of focus ──
      if (e.key === "Escape") {
        if (isCommandPaletteOpen) {
          onCloseCommandPalette();
          e.preventDefault();
          return;
        }
        if (isShortcutsModalOpen) {
          onCloseShortcutsModal();
          e.preventDefault();
          return;
        }
        if (isQuickTradeOpen) {
          closeQuickTrade();
          e.preventDefault();
          return;
        }
        return;
      }

      // ── Ctrl+K / Cmd+K: command palette (works even in inputs) ──
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isCommandPaletteOpen) {
          onCloseCommandPalette();
        } else {
          onOpenCommandPalette();
        }
        return;
      }

      // ── All remaining shortcuts are suppressed when typing in inputs ──
      if (isEditableTarget(e)) return;

      // Don't handle shortcuts when other modifiers are held
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        // "/" - Open command palette
        case "/": {
          e.preventDefault();
          onOpenCommandPalette();
          break;
        }

        // "?" - Open shortcuts help modal
        case "?": {
          e.preventDefault();
          if (isShortcutsModalOpen) {
            onCloseShortcutsModal();
          } else {
            onOpenShortcutsModal();
          }
          break;
        }

        // "B" - Open quick trade (buy)
        case "b":
        case "B": {
          if (selectedToken) {
            openQuickTrade();
          }
          break;
        }

        // "S" - Open quick trade (sell)
        case "s":
        case "S": {
          if (selectedToken) {
            openQuickTrade();
          }
          break;
        }

        // "W" - Toggle watchlist for current token
        case "w":
        case "W": {
          if (selectedToken) {
            if (isWatchlisted(selectedToken.mintAddress)) {
              removeFromWatchlist(selectedToken.mintAddress);
            } else {
              addToWatchlist({
                mintAddress: selectedToken.mintAddress,
                name: selectedToken.name,
                ticker: selectedToken.ticker,
                imageUri: selectedToken.imageUri,
              });
            }
          }
          break;
        }

        // Number keys 1-9: navigate to page
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9": {
          const index = parseInt(e.key) - 1;
          const route = NAV_ROUTES[index];
          if (route && pathname !== route) {
            router.push(route);
          }
          break;
        }

        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    router,
    pathname,
    isCommandPaletteOpen,
    isShortcutsModalOpen,
    isQuickTradeOpen,
    closeQuickTrade,
    openQuickTrade,
    selectedToken,
    isWatchlisted,
    addToWatchlist,
    removeFromWatchlist,
    onOpenShortcutsModal,
    onOpenCommandPalette,
    onCloseCommandPalette,
    onCloseShortcutsModal,
  ]);
}
