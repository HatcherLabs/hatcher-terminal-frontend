"use client";

import { ReactNode, useState, useCallback } from "react";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { PositionsBar } from "./PositionsBar";
import { PriceTicker } from "@/components/ui/PriceTicker";
import { TrendingTicker } from "@/components/ui/TrendingTicker";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { ShortcutsModal } from "@/components/ui/ShortcutsModal";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { MobileSearch } from "@/components/ui/MobileSearch";
import { WelcomeModal } from "@/components/onboarding/WelcomeModal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

interface TerminalLayoutProps {
  children: ReactNode;
}

export function TerminalLayout({ children }: TerminalLayoutProps) {
  const [showMobileTicker, setShowMobileTicker] = useState(true);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const openMobileSearch = useCallback(() => setMobileSearchOpen(true), []);
  const closeMobileSearch = useCallback(() => setMobileSearchOpen(false), []);

  const openShortcutsModal = useCallback(() => setShortcutsOpen(true), []);
  const closeShortcutsModal = useCallback(() => setShortcutsOpen(false), []);
  const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setCommandPaletteOpen(false), []);

  useKeyboardShortcuts({
    onOpenShortcutsModal: openShortcutsModal,
    onCloseShortcutsModal: closeShortcutsModal,
    onOpenCommandPalette: openCommandPalette,
    onCloseCommandPalette: closeCommandPalette,
    isCommandPaletteOpen: commandPaletteOpen,
    isShortcutsModalOpen: shortcutsOpen,
  });

  return (
    <>
      {/* Mobile layout: unchanged, shows below 1024px */}
      <div className="terminal:hidden w-full max-w-[480px] mx-auto min-h-screen pb-16">
        {/* Mobile header with notification bell */}
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-accent font-bold text-sm tracking-widest font-mono">
            HATCHER
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={openMobileSearch}
              className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-secondary transition-colors"
              aria-label="Search tokens"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4.5 h-4.5"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
            <NotificationBell />
          </div>
        </div>
        {/* Mobile price ticker — dismissable */}
        {showMobileTicker && (
          <PriceTicker
            dismissable
            onDismiss={() => setShowMobileTicker(false)}
          />
        )}
        <main className="px-4 py-3 animate-fade-in">{children}</main>
      </div>

      {/* Desktop terminal layout: shows at 1024px and above */}
      <div className="hidden terminal:flex flex-col h-screen w-screen overflow-hidden">
        {/* Top Bar */}
        <TopBar />

        {/* Trending Token Ticker */}
        <TrendingTicker />

        {/* Middle section: sidebar + main content */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <Sidebar onOpenShortcuts={openShortcutsModal} />

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 overflow-y-auto terminal-scrollbar">
            <div className="max-w-terminal mx-auto px-6 py-4 animate-fade-in">
              {children}
            </div>
          </main>
        </div>

        {/* Bottom Positions Bar */}
        <PositionsBar />
      </div>

      {/* Global modals */}
      <WelcomeModal />
      <ShortcutsModal isOpen={shortcutsOpen} onClose={closeShortcutsModal} />
      <CommandPalette isOpen={commandPaletteOpen} onClose={closeCommandPalette} />
      <MobileSearch isOpen={mobileSearchOpen} onClose={closeMobileSearch} />
    </>
  );
}
