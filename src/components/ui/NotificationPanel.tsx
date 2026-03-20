"use client";

import { useRouter } from "next/navigation";
import {
  useNotifications,
  type Notification,
  type NotificationType,
} from "@/components/providers/NotificationProvider";

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function isToday(timestamp: number): boolean {
  const now = new Date();
  const date = new Date(timestamp);
  return (
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate()
  );
}

function NotificationIcon({ type }: { type: NotificationType }) {
  switch (type) {
    case "price-alert":
      return (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: "#f0a00020" }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f0a000"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
      );
    case "auto-sell":
      return (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: "#f2364520" }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f23645"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5"
          >
            <path d="M12 5v14" />
            <path d="M19 12l-7 7-7-7" />
          </svg>
        </div>
      );
    case "order-triggered":
      return (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: "#8b5cf620" }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5"
          >
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </div>
      );
    case "trade-confirmed":
      return (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: "#00d67220" }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00d672"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      );
    case "info":
    default:
      return (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: "#3b82f620" }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </div>
      );
  }
}

function getNavigationPath(notification: Notification): string | null {
  const { type, mintAddress } = notification;
  if (mintAddress) {
    if (type === "price-alert" || type === "trade-confirmed") {
      return `/token/${mintAddress}`;
    }
    if (type === "auto-sell") {
      return `/portfolio`;
    }
    if (type === "order-triggered") {
      return `/orders`;
    }
  }
  return null;
}

function NotificationItem({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose: () => void;
}) {
  const { markAsRead } = useNotifications();
  const router = useRouter();

  const handleClick = () => {
    markAsRead(notification.id);
    const path = getNavigationPath(notification);
    if (path) {
      onClose();
      router.push(path);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-start gap-2.5 px-3 py-2.5 transition-colors text-left"
      style={{
        backgroundColor: notification.read ? "transparent" : "#8b5cf608",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#181c28";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = notification.read
          ? "transparent"
          : "#8b5cf608";
      }}
    >
      <NotificationIcon type={notification.type} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="text-xs font-medium truncate"
            style={{ color: "#eef0f6" }}
          >
            {notification.title}
          </span>
          {!notification.read && (
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: "#8b5cf6" }}
            />
          )}
        </div>
        <p
          className="text-[11px] leading-snug mt-0.5 line-clamp-2"
          style={{ color: "#5c6380" }}
        >
          {notification.message}
        </p>
        <span
          className="text-[10px] mt-0.5 block font-mono"
          style={{ color: "#363d54" }}
        >
          {formatRelativeTime(notification.timestamp)}
        </span>
      </div>
    </button>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider"
      style={{
        color: "#363d54",
        backgroundColor: "#0a0d14",
        borderBottom: "1px solid #1a1f2e",
      }}
    >
      {label}
    </div>
  );
}

export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { notifications, clearAll, unreadCount, markAllRead } =
    useNotifications();

  const todayNotifications = notifications.filter((n) => isToday(n.timestamp));
  const earlierNotifications = notifications.filter(
    (n) => !isToday(n.timestamp)
  );

  return (
    <div
      className="absolute right-0 top-full mt-2 w-80 rounded-lg shadow-xl overflow-hidden"
      style={{
        backgroundColor: "#10131c",
        border: "1px solid #1a1f2e",
        zIndex: 80,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5"
        style={{ borderBottom: "1px solid #1a1f2e" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold font-mono"
            style={{ color: "#eef0f6" }}
          >
            NOTIFICATIONS
          </span>
          {unreadCount > 0 && (
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: "#8b5cf620",
                color: "#8b5cf6",
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[10px] font-mono px-2 py-1 rounded transition-colors"
              style={{ color: "#5c6380" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#9ca3b8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#5c6380";
              }}
            >
              Mark read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="text-[10px] font-mono px-2 py-1 rounded transition-colors"
              style={{ color: "#5c6380" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#9ca3b8";
                e.currentTarget.style.backgroundColor = "#181c28";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#5c6380";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Notification list */}
      <div
        className="max-h-96 overflow-y-auto overscroll-contain terminal-scrollbar"
      >
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#363d54"
              strokeWidth="1.5"
              className="w-8 h-8 mb-2"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="text-xs font-mono" style={{ color: "#363d54" }}>
              No notifications
            </span>
          </div>
        ) : (
          <>
            {todayNotifications.length > 0 && (
              <>
                <SectionLabel label="Today" />
                <div>
                  {todayNotifications.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onClose={onClose}
                    />
                  ))}
                </div>
              </>
            )}
            {earlierNotifications.length > 0 && (
              <>
                <SectionLabel label="Earlier" />
                <div>
                  {earlierNotifications.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onClose={onClose}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
