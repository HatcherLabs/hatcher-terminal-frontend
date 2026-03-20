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
    href: "/positions",
    label: "Positions",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px]">
        <rect x="2" y="6" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
        <path d="M6 14h.01" />
        <path d="M10 14h4" />
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
        background: "#0d1017",
        borderTop: "1px solid #1c2030",
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
                color: active ? "#22c55e" : "#5c6380",
              }}
            >
              {active && (
                <span
                  className="absolute -top-[1px] left-2 right-2 h-[2px] rounded-b"
                  style={{
                    background: "#22c55e",
                    boxShadow: "0 0 6px rgba(34,197,94,0.4)",
                  }}
                />
              )}
              <span
                style={
                  active
                    ? { filter: "drop-shadow(0 0 3px rgba(34,197,94,0.3))" }
                    : undefined
                }
              >
                {item.icon}
              </span>
              <span
                className="text-[9px] font-medium font-mono tracking-wide"
                style={{ color: active ? "#22c55e" : "#5c6380" }}
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
