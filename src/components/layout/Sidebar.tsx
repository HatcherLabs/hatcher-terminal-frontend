"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCompare } from "@/components/providers/CompareProvider";

const navItems = [
  {
    href: "/swipe",
    label: "Discover",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <rect x="2" y="3" width="20" height="18" rx="3" />
        <path d="M8 21V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14" />
      </svg>
    ),
  },
  {
    href: "/explore",
    label: "Explore",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
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

export function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const { compareCount } = useCompare();

  return (
    <aside
      className={`h-full bg-bg-card border-r border-border flex flex-col transition-all duration-200 ease-out shrink-0 ${
        expanded ? "w-40" : "w-12"
      }`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-0.5 py-2 px-1.5">
        {navItems.map((item, index) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const showBadge = item.hasBadge && compareCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-2.5 h-9 rounded transition-all duration-150 group ${
                expanded ? "px-2.5" : "px-0 justify-center"
              } ${
                active
                  ? "text-accent bg-accent/8"
                  : "text-text-muted hover:text-text-secondary hover:bg-bg-hover"
              }`}
              title={expanded ? undefined : item.label}
            >
              {/* Active indicator */}
              {active && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-accent" />
              )}

              <span className="shrink-0 relative">
                {item.icon}
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-accent text-[8px] font-bold text-bg-primary leading-none">
                    {compareCount}
                  </span>
                )}
              </span>

              {expanded && (
                <>
                  <span className="text-xs font-medium whitespace-nowrap overflow-hidden flex-1">
                    {item.label}
                    {showBadge && (
                      <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-accent text-[9px] font-bold text-bg-primary leading-none">
                        {compareCount}
                      </span>
                    )}
                  </span>
                  <kbd className="text-[9px] text-text-faint bg-bg-elevated border border-border rounded px-1 py-0.5 font-mono opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {index + 1}
                  </kbd>
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section - version */}
      <div className="px-2 py-3 border-t border-border">
        <span className={`text-[9px] text-text-faint font-mono ${expanded ? "" : "hidden"}`}>
          v0.1.0-alpha
        </span>
      </div>
    </aside>
  );
}
