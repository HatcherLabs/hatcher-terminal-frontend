"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { useSolPriceContext } from "@/components/providers/SolPriceProvider";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { TokenSearch } from "@/components/ui/TokenSearch";

export function TopBar() {
  const { user } = useAuth();
  const { solPrice, loading: solLoading } = useSolPriceContext();

  return (
    <header
      className="h-10 flex items-center px-3 gap-2 shrink-0"
      style={{ background: "#0a0d14", borderBottom: "1px solid #1a1f2e" }}
    >
      {/* Search */}
      <TokenSearch />

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* SOL Price Display */}
      <div
        className="flex items-center gap-1.5 px-2 py-0.5 rounded shrink-0"
        style={{ background: "#04060b", border: "1px solid #1a1f2e" }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            background: "#00d672",
            boxShadow: "0 0 6px rgba(0,214,114,0.5)",
          }}
        />
        <span
          className="text-[10px] font-mono font-semibold"
          style={{ color: "#5c6380" }}
        >
          SOL
        </span>
        <span
          className="text-[11px] font-mono font-bold"
          style={{ color: "#eef0f6" }}
        >
          {solLoading
            ? "---"
            : `$${solPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
        </span>
      </div>

      {/* Separator */}
      <div className="w-px h-5 shrink-0" style={{ background: "#1a1f2e" }} />

      {/* Notifications */}
      <NotificationBell />

      {/* Separator */}
      <div className="w-px h-5 shrink-0" style={{ background: "#1a1f2e" }} />

      {/* SOL Balance indicator */}
      <div
        className="flex items-center gap-1.5 px-2 py-0.5 rounded shrink-0"
        style={{ background: "#04060b", border: "1px solid #1a1f2e" }}
      >
        <span
          className="text-[10px] font-mono font-bold"
          style={{ color: "#eef0f6" }}
        >
          -- SOL
        </span>
      </div>

      {/* $HATCH Tier Badge */}
      <span
        className="px-1.5 py-0.5 rounded-[3px] text-[9px] font-bold font-mono shrink-0"
        style={{
          background: "#8b5cf618",
          color: "#8b5cf6",
          border: "1px solid #8b5cf625",
        }}
      >
        Egg
      </span>

      {/* Separator */}
      <div className="w-px h-5 shrink-0" style={{ background: "#1a1f2e" }} />

      {/* User */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div
          className="w-5 h-5 rounded-[3px] flex items-center justify-center"
          style={{ background: "#8b5cf620", border: "1px solid #8b5cf630" }}
        >
          <span
            className="text-[9px] font-bold font-mono"
            style={{ color: "#8b5cf6" }}
          >
            {user?.username?.[0]?.toUpperCase() || "?"}
          </span>
        </div>
        <span
          className="text-[11px] font-mono hidden xl:inline"
          style={{ color: "#9ca3b8" }}
        >
          {user?.username || "Anon"}
        </span>
      </div>
    </header>
  );
}
