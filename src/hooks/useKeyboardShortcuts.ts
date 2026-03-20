"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuickTrade } from "@/components/providers/QuickTradeProvider";

interface KeyboardShortcutsOptions {
  onOpenShortcutsModal: () => void;
  onOpenCommandPalette: () => void;
  onCloseCommandPalette: () => void;
  onCloseShortcutsModal: () => void;
  isCommandPaletteOpen: boolean;
  isShortcutsModalOpen: boolean;
}

/** Navigation routes indexed 1-7 (matches sidebar order) */
const NAV_ROUTES = [
  "/swipe",      // 1 - Discover
  "/explore",    // 2 - Explore
  "/matches",    // 3 - Portfolio
  "/graveyard",  // 4 - Passed
  "/compare",    // 5 - Compare
  "/wallet",     // 6 - Wallet
  "/settings",   // 7 - Settings
];

/**
 * Central keyboard shortcut handler for the Hatcher Terminal.
 * Attaches a single global keydown listener and dispatches actions.
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
  const { isOpen: isQuickTradeOpen, closePanel: closeQuickTrade, openPanel: openQuickTrade, selectedToken } = useQuickTrade();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const tagName = target.tagName;

      // Always handle Escape regardless of focus
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

      // Ctrl+K / Cmd+K: command palette (works even in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isCommandPaletteOpen) {
          onCloseCommandPalette();
        } else {
          onOpenCommandPalette();
        }
        return;
      }

      // Ignore all other shortcuts when focus is in input/textarea/select
      if (
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // Don't handle shortcuts when modifiers are held (except the ones above)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        // "/" - Focus search / open command palette
        case "/": {
          e.preventDefault();
          onOpenCommandPalette();
          break;
        }

        // "?" - Open shortcuts help modal
        case "?": {
          e.preventDefault();
          onOpenShortcutsModal();
          break;
        }

        // Arrow keys - Swipe (handled by SwipeStack itself, we don't duplicate)
        // "B" - Open quick trade buy tab
        case "b":
        case "B": {
          if (selectedToken) {
            openQuickTrade();
          }
          break;
        }

        // "S" - Open quick trade sell tab
        case "s":
        case "S": {
          if (selectedToken) {
            openQuickTrade();
          }
          break;
        }

        // Number keys 1-7: navigate to page
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7": {
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
    onOpenShortcutsModal,
    onOpenCommandPalette,
    onCloseCommandPalette,
    onCloseShortcutsModal,
  ]);
}
