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

function NotificationIcon({ type }: { type: NotificationType }) {
  switch (type) {
    case "trade_buy":
      return (
        <div className="w-7 h-7 rounded-full bg-green/15 flex items-center justify-center shrink-0">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5 text-green"
          >
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
          </svg>
        </div>
      );
    case "trade_sell":
      return (
        <div className="w-7 h-7 rounded-full bg-red/15 flex items-center justify-center shrink-0">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5 text-red"
          >
            <path d="M12 5v14" />
            <path d="M19 12l-7 7-7-7" />
          </svg>
        </div>
      );
    case "price_alert":
      return (
        <div className="w-7 h-7 rounded-full bg-yellow-500/15 flex items-center justify-center shrink-0">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5 text-yellow-500"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
      );
    case "position_update":
      return (
        <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5 text-accent"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
      );
    case "system":
    default:
      return (
        <div className="w-7 h-7 rounded-full bg-blue/15 flex items-center justify-center shrink-0">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5 text-blue"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </div>
      );
  }
}

function NotificationItem({
  notification,
  onNavigate,
}: {
  notification: Notification;
  onNavigate: (mint: string) => void;
}) {
  const { markAsRead } = useNotifications();

  const handleClick = () => {
    markAsRead(notification.id);
    if (notification.data?.mintAddress) {
      onNavigate(notification.data.mintAddress);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-bg-hover/60 transition-colors text-left"
    >
      <NotificationIcon type={notification.type} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-text-primary truncate">
            {notification.title}
          </span>
          {!notification.read && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
          )}
        </div>
        <p className="text-[11px] text-text-muted leading-snug mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <span className="text-[10px] text-text-faint mt-0.5 block">
          {formatRelativeTime(notification.timestamp)}
        </span>
      </div>
    </button>
  );
}

export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { notifications, clearAll } = useNotifications();
  const router = useRouter();
  const visibleNotifications = notifications.slice(0, 10);

  const handleNavigate = (mint: string) => {
    onClose();
    router.push(`/token/${mint}`);
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-bg-elevated rounded-lg shadow-xl border border-border z-[80] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <span className="text-xs font-semibold text-text-primary">
          Notifications
        </span>
      </div>

      {/* Notification list */}
      <div className="max-h-80 overflow-y-auto overscroll-contain terminal-scrollbar">
        {visibleNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-8 h-8 text-text-faint mb-2"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="text-xs text-text-faint">
              No notifications yet
            </span>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {visibleNotifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer with Clear all */}
      {notifications.length > 0 && (
        <div className="border-t border-border px-3 py-2 flex items-center justify-center">
          <button
            onClick={clearAll}
            className="text-[10px] text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded hover:bg-bg-hover font-mono"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
