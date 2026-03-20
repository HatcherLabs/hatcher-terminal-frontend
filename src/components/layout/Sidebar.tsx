"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback } from "react";
import { useCompare } from "@/components/providers/CompareProvider";
import { useNotifications } from "@/components/providers/NotificationProvider";
import { useSolPriceContext } from "@/components/providers/SolPriceProvider";

const navItems = [
  {
    href: "/swipe",
    label: "Swipe",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <rect x="4" y="2" width="16" height="18" rx="2" />
        <path d="M8 22h8" />
        <path d="M12 18v4" />
        <path d="M9 10l3-3 3 3" />
      </svg>
    ),
  },
  {
    href: "/explore",
    label: "Explore",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <path d="M3 3v18h18" />
        <path d="M7 17l4-8 4 4 6-10" />
      </svg>
    ),
  },
  {
    href: "/watchlist",
    label: "Watchlist",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    href: "/matches",
    label: "Portfolio",
    showNotifications: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
      </svg>
    ),
  },
  {
    href: "/orders",
    label: "Orders",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    href: "/graveyard",
    label: "Graveyard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <path d="M3 6h18" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    ),
  },
  {
    href: "/copy-trade",
    label: "Copy Trade",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/wallet",
    label: "Wallet",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <rect x="2" y="6" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
        <path d="M6 14h.01" />
        <path d="M10 14h4" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

interface SidebarProps {
  onOpenShortcuts?: () => void;
}

export function Sidebar({ onOpenShortcuts }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { compareCount } = useCompare();
  const { unreadCount } = useNotifications();
  const { solPrice, loading: solLoading } = useSolPriceContext();

  const handleHelpClick = useCallback(() => {
    onOpenShortcuts?.();
  }, [onOpenShortcuts]);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const expanded = !collapsed;

  return (
    <aside
      className={`h-full flex flex-col transition-all duration-200 ease-out shrink-0 ${
        expanded ? "w-[168px]" : "w-12"
      }`}
      style={{
        background: "#0a0d14",
        borderRight: "1px solid #1a1f2e",
      }}
    >
      {/* Logo */}
      <div
        className={`flex items-center shrink-0 h-10 ${
          expanded ? "px-3 gap-2" : "px-0 justify-center"
        }`}
        style={{ borderBottom: "1px solid #1a1f2e" }}
      >
        {expanded ? (
          <div className="flex flex-col leading-none">
            <span
              className="text-[13px] font-extrabold tracking-[0.12em] font-mono"
              style={{ color: "#00d672" }}
            >
              HATCHER
            </span>
            <span
              className="text-[8px] font-mono tracking-[0.25em] uppercase"
              style={{ color: "#5c6380" }}
            >
              TERMINAL
            </span>
          </div>
        ) : (
          <span
            className="text-[13px] font-extrabold font-mono"
            style={{ color: "#00d672" }}
          >
            H
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-px py-1.5 px-1.5 overflow-y-auto">
        {navItems.map((item, index) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const showNotifBadge =
            (item as { showNotifications?: boolean }).showNotifications &&
            unreadCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-2 h-8 rounded-[4px] transition-all duration-150 group ${
                expanded ? "px-2" : "px-0 justify-center"
              }`}
              style={{
                color: active ? "#00d672" : "#5c6380",
                background: active ? "rgba(0,214,114,0.06)" : "transparent",
              }}
            >
              {/* Active indicator - green left border */}
              {active && (
                <div
                  className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-r-sm"
                  style={{
                    background: "#00d672",
                    boxShadow: "0 0 6px rgba(0,214,114,0.4)",
                  }}
                />
              )}

              <span className="shrink-0 relative">
                {item.icon}
                {showNotifBadge && (
                  <span
                    className="absolute -top-1 -right-1 flex items-center justify-center min-w-[12px] h-3 rounded-full text-[7px] font-bold leading-none px-0.5"
                    style={{ background: "#00d672", color: "#0a0d14" }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>

              {expanded ? (
                <>
                  <span className="text-[11px] font-medium whitespace-nowrap overflow-hidden flex-1">
                    {item.label}
                  </span>
                  <kbd
                    className="text-[9px] font-mono px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    style={{
                      color: "#5c6380",
                      background: "#0e1219",
                      border: "1px solid #1a1f2e",
                    }}
                  >
                    {index + 1}
                  </kbd>
                </>
              ) : (
                <span
                  className="pointer-events-none absolute left-full ml-2 px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50"
                  style={{
                    background: "#131720",
                    border: "1px solid #1a1f2e",
                    color: "#eef0f6",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                  }}
                >
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-1.5 pb-1.5 flex flex-col gap-1">
        {/* Collapse toggle */}
        <button
          onClick={toggleCollapse}
          className={`flex items-center gap-2 h-7 rounded-[4px] transition-all duration-150 group ${
            expanded ? "px-2" : "px-0 justify-center"
          }`}
          style={{ color: "#5c6380" }}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`w-[16px] h-[16px] transition-transform duration-200 ${
              collapsed ? "rotate-180" : ""
            }`}
          >
            <path d="M11 17l-5-5 5-5" />
            <path d="M18 17l-5-5 5-5" />
          </svg>
          {expanded && (
            <span className="text-[10px] font-medium whitespace-nowrap">
              Collapse
            </span>
          )}
        </button>

        {/* Help / shortcuts */}
        <button
          onClick={handleHelpClick}
          className={`flex items-center gap-2 h-7 rounded-[4px] transition-all duration-150 group hover:bg-[#0e1219] ${
            expanded ? "px-2" : "px-0 justify-center"
          }`}
          style={{ color: "#5c6380" }}
          aria-label="Keyboard shortcuts"
        >
          <span
            className="shrink-0 w-[16px] h-[16px] flex items-center justify-center rounded text-[10px] font-bold font-mono leading-none"
            style={{ border: "1px solid #1a1f2e" }}
          >
            ?
          </span>
          {expanded ? (
            <span className="text-[10px] font-medium whitespace-nowrap">
              Shortcuts
            </span>
          ) : (
            <span
              className="pointer-events-none absolute left-full ml-2 px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50"
              style={{
                background: "#131720",
                border: "1px solid #1a1f2e",
                color: "#eef0f6",
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              }}
            >
              Shortcuts
            </span>
          )}
        </button>

        {/* SOL price ticker */}
        <div
          className="rounded-[4px] py-1.5"
          style={{
            borderTop: "1px solid #1a1f2e",
          }}
        >
          {expanded ? (
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background: "#00d672",
                    boxShadow: "0 0 4px rgba(0,214,114,0.5)",
                  }}
                />
                <span
                  className="text-[10px] font-mono font-semibold"
                  style={{ color: "#9ca3b8" }}
                >
                  SOL
                </span>
              </div>
              <span
                className="text-[11px] font-mono font-bold"
                style={{ color: "#eef0f6" }}
              >
                {solLoading ? "---" : `$${solPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: "#00d672",
                  boxShadow: "0 0 4px rgba(0,214,114,0.5)",
                }}
              />
              <span
                className="text-[8px] font-mono font-bold"
                style={{ color: "#9ca3b8" }}
              >
                SOL
              </span>
            </div>
          )}
        </div>

        {/* Version */}
        {expanded && (
          <div className="px-2 pb-0.5">
            <span
              className="text-[8px] font-mono"
              style={{ color: "#2a3040" }}
            >
              v0.1.0-alpha
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
