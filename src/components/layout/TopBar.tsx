"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSolPriceContext } from "@/components/providers/SolPriceProvider";
import { useBalance } from "@/hooks/useBalance";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { TokenSearch } from "@/components/ui/TokenSearch";

export function TopBar() {
  const { user } = useAuth();
  const { solPrice, loading: solLoading } = useSolPriceContext();
  const { balance, loading: balanceLoading } = useBalance();

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

      {/* SSE Connection Status */}
      <ConnectionStatus />

      {/* Separator */}
      <div className="w-px h-5 shrink-0" style={{ background: "#1a1f2e" }} />

      {/* Notifications */}
      <NotificationBell />

      {/* Separator */}
      <div className="w-px h-5 shrink-0" style={{ background: "#1a1f2e" }} />

      {/* SOL Balance indicator */}
      <Link
        href="/wallet"
        className="flex items-center gap-1.5 px-2 py-0.5 rounded shrink-0 no-underline hover:opacity-80 transition-opacity"
        style={{ background: "#04060b", border: "1px solid #1a1f2e" }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M21 12V7H5a2 2 0 010-4h14v4" />
          <path d="M3 5v14a2 2 0 002 2h16v-5" />
          <path d="M18 12a2 2 0 000 4h4v-4z" />
        </svg>
        <span
          className="text-[10px] font-mono font-bold"
          style={{ color: "#eef0f6" }}
        >
          {balanceLoading
            ? "-.--"
            : balance !== null
              ? balance.toFixed(balance < 1 ? 4 : 2)
              : "-.--"}
        </span>
        <span
          className="text-[9px] font-mono"
          style={{ color: "#5c6380" }}
        >
          SOL
        </span>
        {!balanceLoading && balance !== null && !solLoading && (
          <span
            className="text-[9px] font-mono hidden lg:inline"
            style={{ color: "#363d54" }}
          >
            ≈${(balance * solPrice).toFixed(2)}
          </span>
        )}
      </Link>

      {/* $HATCH Tier Badge */}
      <Link
        href="/settings"
        className="px-1.5 py-0.5 rounded-[3px] text-[9px] font-bold font-mono shrink-0 no-underline hover:opacity-80 transition-opacity"
        style={{
          background: "#8b5cf618",
          color: "#8b5cf6",
          border: "1px solid #8b5cf625",
        }}
      >
        Egg
      </Link>

      {/* Separator */}
      <div className="w-px h-5 shrink-0" style={{ background: "#1a1f2e" }} />

      {/* User */}
      <Link href="/settings" className="flex items-center gap-1.5 shrink-0 no-underline hover:opacity-80 transition-opacity">
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
      </Link>
    </header>
  );
}
