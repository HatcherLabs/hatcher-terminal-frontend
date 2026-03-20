"use client";

import { useFeed, type ConnectionStatus as Status } from "@/components/providers/FeedProvider";

const STATUS_CONFIG: Record<
  Status,
  { color: string; label: string; pulse: boolean; clickable: boolean }
> = {
  connected: { color: "#00d672", label: "Live", pulse: false, clickable: false },
  connecting: { color: "#f0a000", label: "Connecting...", pulse: true, clickable: false },
  disconnected: { color: "#f23645", label: "Offline", pulse: false, clickable: true },
  error: { color: "#f23645", label: "Error", pulse: false, clickable: true },
};

export function ConnectionStatus() {
  const { connectionStatus, reconnect } = useFeed();
  const cfg = STATUS_CONFIG[connectionStatus];

  const handleClick = () => {
    if (cfg.clickable) reconnect();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!cfg.clickable}
      className="flex items-center gap-1.5 font-mono disabled:cursor-default cursor-pointer"
      style={{ fontSize: 10, lineHeight: 1, color: cfg.color }}
      title={cfg.clickable ? "Click to reconnect" : undefined}
    >
      {/* Dot */}
      <span
        className="relative flex shrink-0"
        style={{ width: 6, height: 6 }}
      >
        {cfg.pulse && (
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: cfg.color, opacity: 0.6 }}
          />
        )}
        <span
          className="relative inline-block w-full h-full rounded-full"
          style={{
            background: cfg.color,
            boxShadow: `0 0 6px ${cfg.color}80`,
          }}
        />
      </span>

      {/* Label */}
      <span>{cfg.label}</span>

      {/* Reconnect hint for error state */}
      {connectionStatus === "error" && (
        <span
          className="font-mono underline"
          style={{ fontSize: 10, color: "#5c6380" }}
        >
          Retry
        </span>
      )}
    </button>
  );
}
