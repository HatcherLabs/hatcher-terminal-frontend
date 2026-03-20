"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { PriceTicker } from "@/components/ui/PriceTicker";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { TokenSearch } from "@/components/ui/TokenSearch";

export function TopBar() {
  const { user } = useAuth();

  return (
    <div className="shrink-0">
      <header
        className="h-11 flex items-center px-3 gap-2 shrink-0"
        style={{ borderBottom: "1px solid #1a1f2e", background: "#0a0d14" }}
      >
        {/* Logo — ⚡ icon + HATCHER.TRADE */}
        <div className="flex items-center gap-1.5 shrink-0 mr-2">
          <div
            className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-[11px]"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #00d672)" }}
          >
            ⚡
          </div>
          <span className="text-[13px] font-extrabold tracking-[-.01em]" style={{ fontFamily: "var(--font-sans)" }}>
            <span style={{ color: "#8b5cf6" }}>HATCHER</span>
            <span style={{ color: "#5c6380" }}>.TRADE</span>
          </span>
        </div>

        {/* Separator */}
        <div className="w-px h-6 shrink-0" style={{ background: "#1a1f2e" }} />

        {/* Search */}
        <TokenSearch />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right section */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Notifications */}
          <NotificationBell />

          <div className="w-px h-6" style={{ background: "#1a1f2e" }} />

          {/* SOL Balance indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md"
            style={{ background: "#04060b", border: "1px solid #1a1f2e" }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#00d672", boxShadow: "0 0 6px #00d67260" }}
            />
            <span className="text-xs font-mono font-bold" style={{ color: "#eef0f6" }}>
              — SOL
            </span>
          </div>

          {/* $HATCH Tier Badge */}
          <span
            className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold font-mono"
            style={{
              background: "#8b5cf618",
              color: "#8b5cf6",
              border: "1px solid #8b5cf625",
            }}
          >
            🥚 Egg
          </span>

          <div className="w-px h-6" style={{ background: "#1a1f2e" }} />

          {/* User */}
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center"
              style={{ background: "#8b5cf620", border: "1px solid #8b5cf630" }}
            >
              <span className="text-[10px] font-bold font-mono" style={{ color: "#8b5cf6" }}>
                {user?.username?.[0]?.toUpperCase() || "?"}
              </span>
            </div>
            <span className="text-xs font-mono hidden xl:inline" style={{ color: "#9ca3b8" }}>
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
