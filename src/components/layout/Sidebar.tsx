"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback } from "react";
import { useCompare } from "@/components/providers/CompareProvider";
import { useNotifications } from "@/components/providers/NotificationProvider";

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
    label: "Trenches",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <path d="M3 3v18h18" />
        <path d="M7 17l4-8 4 4 6-10" />
      </svg>
    ),
  },
  {
    href: "/matches",
    label: "Portfolio",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    showNotifications: true,
  },
  {
    href: "/graveyard",
    label: "Passed",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <path d="M3 6h18" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    ),
  },
  {
    href: "/compare",
    label: "Compare",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <rect x="3" y="3" width="7" height="18" rx="1" />
        <rect x="14" y="3" width="7" height="18" rx="1" />
      </svg>
    ),
    hasBadge: true,
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
    href: "/wallet",
    label: "Wallet",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
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
  const [expanded, setExpanded] = useState(false);
  const { compareCount } = useCompare();
  const { unreadCount } = useNotifications();

  const handleHelpClick = useCallback(() => {
    onOpenShortcuts?.();
  }, [onOpenShortcuts]);

  return (
    <aside
      className={`h-full flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0 ${
        expanded ? "w-40" : "w-12"
      }`}
      style={{
        background: "rgba(10,13,20,0.95)",
        borderRight: "1px solid rgba(26,31,46,0.8)",
        backdropFilter: "blur(12px)",
      }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-0.5 py-2 px-1.5">
        {navItems.map((item, index) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const showBadge = item.hasBadge && compareCount > 0;
          const showNotifBadge = item.showNotifications && unreadCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item relative flex items-center gap-2.5 h-9 rounded transition-all duration-200 group ${
                expanded ? "px-2.5" : "px-0 justify-center"
              } ${
                active
                  ? ""
                  : "text-text-muted hover:text-text-secondary"
              }`}
              style={
                active
                  ? {
                      color: "#00d672",
                      background: "rgba(0,214,114,0.06)",
                      boxShadow: "inset 0 0 12px rgba(0,214,114,0.03)",
                    }
                  : undefined
              }
            >
              {/* Active indicator - 4px green left border accent bar */}
              {active && (
                <div
                  className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r"
                  style={{
                    background: "linear-gradient(180deg, #00d672 0%, #00cc6a 100%)",
                    boxShadow: "0 0 6px rgba(0,214,114,0.4)",
                  }}
                />
              )}

              <span className="shrink-0 relative">
                {item.icon}
                {/* Compare count badge on icon */}
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-accent text-[8px] font-bold text-bg-primary leading-none">
                    {compareCount}
                  </span>
                )}
                {/* Unread notification count badge on icon */}
                {showNotifBadge && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[14px] h-3.5 rounded-full bg-green text-[8px] font-bold text-bg-primary leading-none px-0.5">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>

              {expanded ? (
                <>
                  <span className="text-xs font-medium whitespace-nowrap overflow-hidden flex-1">
                    {item.label}
                    {showBadge && (
                      <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-accent text-[9px] font-bold text-bg-primary leading-none">
                        {compareCount}
                      </span>
                    )}
                    {showNotifBadge && (
                      <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-green text-[9px] font-bold text-bg-primary leading-none px-0.5">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </span>
                  <kbd className="text-[9px] text-text-faint bg-bg-elevated border border-border rounded px-1 py-0.5 font-mono opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {index + 1}
                  </kbd>
                </>
              ) : (
                /* Tooltip when collapsed - CSS positioned */
                <span className="sidebar-tooltip pointer-events-none absolute left-full ml-2 px-2 py-1 rounded bg-bg-elevated border border-border text-[11px] text-text-primary font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section - help button + version */}
      <div className="px-1.5 pb-2 flex flex-col gap-1.5">
        {/* Help button - opens keyboard shortcuts */}
        <button
          onClick={handleHelpClick}
          className={`sidebar-nav-item relative flex items-center gap-2.5 h-9 rounded transition-all duration-150 group text-text-muted hover:text-text-secondary hover:bg-bg-hover ${
            expanded ? "px-2.5" : "px-0 justify-center"
          }`}
          aria-label="Keyboard shortcuts"
        >
          <span className="shrink-0 w-[18px] h-[18px] flex items-center justify-center rounded border border-border text-[11px] font-bold font-mono leading-none">
            ?
          </span>
          {expanded ? (
            <span className="text-xs font-medium whitespace-nowrap overflow-hidden flex-1">
              Shortcuts
            </span>
          ) : (
            <span className="sidebar-tooltip pointer-events-none absolute left-full ml-2 px-2 py-1 rounded bg-bg-elevated border border-border text-[11px] text-text-primary font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
              Shortcuts
            </span>
          )}
        </button>

        {/* Version */}
        <div className="px-1 py-1.5 border-t border-border">
          <span className={`text-[9px] text-text-faint font-mono ${expanded ? "" : "hidden"}`}>
            v0.1.0-alpha
          </span>
        </div>
      </div>
    </aside>
  );
}
