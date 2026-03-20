"use client";

import { memo, useState } from "react";
import Link from "next/link";
import type { NewTokenInfo } from "@/hooks/useNewTokenAlert";

interface NewTokenBannerProps {
  tokens: NewTokenInfo[];
  onDismiss: (mint: string) => void;
  onDismissAll: () => void;
}

/**
 * Animated banner that slides in when brand new tokens are detected via WebSocket.
 * Clicking a token navigates to its detail page. Dismiss individually or all at once.
 */
export const NewTokenBanner = memo(function NewTokenBanner({
  tokens,
  onDismiss,
  onDismissAll,
}: NewTokenBannerProps) {
  if (tokens.length === 0) return null;

  return (
    <div
      className="rounded-lg overflow-hidden animate-fade-in"
      style={{
        background: "rgba(139,92,246,0.06)",
        border: "1px solid rgba(139,92,246,0.20)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ borderBottom: "1px solid rgba(139,92,246,0.12)" }}
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "#8b5cf6" }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ background: "#8b5cf6" }}
            />
          </span>
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "#8b5cf6" }}
          >
            New Tokens Detected
          </span>
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}
          >
            {tokens.length}
          </span>
        </div>
        <button
          onClick={onDismissAll}
          className="text-[10px] transition-colors"
          style={{ color: "#5c6380" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#9ca3b8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#5c6380"; }}
        >
          Dismiss all
        </button>
      </div>

      {/* Token list */}
      <div className="flex flex-wrap gap-1.5 px-3 py-2">
        {tokens.map((token) => (
          <NewTokenChip
            key={token.mintAddress}
            token={token}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>
  );
});

function NewTokenChip({
  token,
  onDismiss,
}: {
  token: NewTokenInfo;
  onDismiss: (mint: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex items-center gap-1.5 rounded-md transition-all"
      style={{
        padding: "4px 8px",
        background: hovered ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.05)",
        border: "1px solid rgba(139,92,246,0.15)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {token.imageUri && (
        <img
          src={token.imageUri}
          alt=""
          width={16}
          height={16}
          className="rounded-full"
          style={{ objectFit: "cover" }}
        />
      )}
      <Link
        href={`/token/${token.mintAddress}`}
        className="text-[11px] font-bold font-mono no-underline transition-colors"
        style={{ color: hovered ? "#eef0f6" : "#9ca3b8" }}
      >
        ${token.ticker}
      </Link>
      <span
        className="text-[9px] truncate max-w-[80px]"
        style={{ color: "#5c6380" }}
      >
        {token.name}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(token.mintAddress);
        }}
        className="ml-0.5 transition-colors"
        style={{ color: "#363d54", lineHeight: 1 }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#9ca3b8"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#363d54"; }}
        aria-label={`Dismiss ${token.ticker}`}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
