"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/swipe",
    label: "Swipe",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px]">
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px]">
        <path d="M3 3v18h18" />
        <path d="M7 17l4-8 4 4 6-10" />
      </svg>
    ),
  },
  {
    href: "/matches",
    label: "Portfolio",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px]">
        <rect x="2" y="6" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
        <path d="M6 14h.01" />
        <path d="M10 14h4" />
      </svg>
    ),
  },
  {
    href: "/watchlist",
    label: "Watchlist",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px]">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    href: "/alerts",
    label: "Alerts",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px]">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 terminal:hidden"
      style={{
        background: "#0a0d14",
        borderTop: "1px solid #1a1f2e",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="max-w-[480px] mx-auto flex items-center justify-around h-[52px] px-1">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-md transition-colors duration-150"
              style={{
                color: active ? "#00d672" : "#5c6380",
              }}
            >
              {/* Active top bar */}
              {active && (
                <span
                  className="absolute -top-[1px] left-2 right-2 h-[2px] rounded-b"
                  style={{
                    background: "#00d672",
                    boxShadow: "0 0 6px rgba(0,214,114,0.4)",
                  }}
                />
              )}
              <span
                style={
                  active
                    ? { filter: "drop-shadow(0 0 3px rgba(0,214,114,0.3))" }
                    : undefined
                }
              >
                {item.icon}
              </span>
              <span
                className="text-[9px] font-medium font-mono tracking-wide"
                style={{ color: active ? "#00d672" : "#5c6380" }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
