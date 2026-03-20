"use client";

import { useState, useRef, useEffect } from "react";
import { useNotifications } from "@/components/providers/NotificationProvider";
import { NotificationPanel } from "@/components/ui/NotificationPanel";

export function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  // Close panel when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleToggle}
        className="relative flex items-center justify-center w-8 h-8 rounded hover:bg-bg-hover transition-colors"
        aria-label="Notifications"
      >
        {/* Bell icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
          style={{ color: "#5c6380" }}
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className="absolute flex items-center justify-center rounded-full font-mono font-bold leading-none"
            style={{
              top: 0,
              right: -2,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              fontSize: 9,
              backgroundColor: "#f23645",
              color: "#eef0f6",
              border: "2px solid #04060b",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && <NotificationPanel onClose={() => setOpen(false)} />}
    </div>
  );
}
