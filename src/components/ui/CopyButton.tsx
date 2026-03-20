"use client";

import { useState, useCallback } from "react";

interface CopyButtonProps {
  text: string;
  label?: string;
  size?: "sm" | "md";
}

export function CopyButton({ text, label, size = "sm" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const iconSize = size === "sm" ? 14 : 18;
  const fontSize = size === "sm" ? 11 : 13;
  const padding = size === "sm" ? "2px 6px" : "4px 10px";
  const gap = size === "sm" ? 4 : 6;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap,
        padding,
        borderRadius: 4,
        border: "1px solid #2a2d3a",
        background: copied ? "#22c55e15" : "#1a1c28",
        color: copied ? "#22c55e" : "#5c6380",
        fontSize,
        fontFamily: "inherit",
        cursor: "pointer",
        transition: "all 150ms ease",
        whiteSpace: "nowrap",
      }}
      title={copied ? "Copied!" : `Copy${label ? ` ${label}` : ""}`}
      aria-label={copied ? "Copied!" : `Copy${label ? ` ${label}` : ""}`}
    >
      {copied ? (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
      {label && <span>{copied ? "Copied!" : label}</span>}
    </button>
  );
}
