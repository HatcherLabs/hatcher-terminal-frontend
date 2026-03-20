"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { PriceTicker } from "@/components/ui/PriceTicker";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { TokenSearch } from "@/components/ui/TokenSearch";

export function TopBar() {
  const { user } = useAuth();

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
        <TokenSearch />

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
