"use client";

import { useRouter } from "next/navigation";
import { TokenAvatar } from "@/components/ui/TokenAvatar";

interface TokenBadgeProps {
  mintAddress: string;
  ticker: string;
  imageUri?: string;
  size?: "sm" | "md";
}

export function TokenBadge({ mintAddress, ticker, imageUri, size = "sm" }: TokenBadgeProps) {
  const router = useRouter();

  const avatarSize = size === "sm" ? 16 : 22;
  const fontSize = size === "sm" ? 11 : 13;
  const padding = size === "sm" ? "2px 8px 2px 4px" : "3px 10px 3px 5px";
  const gap = size === "sm" ? 4 : 6;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/token/${mintAddress}`);
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap,
        padding,
        borderRadius: 9999,
        border: "1px solid rgba(34,197,94,0.1)",
        background: "#1a1c28",
        color: "#e0e2eb",
        fontSize,
        fontWeight: 600,
        cursor: "pointer",
        transition: "border-color 150ms ease, background 150ms ease, box-shadow 150ms ease",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(34,197,94,0.25)";
        e.currentTarget.style.background = "rgba(34,197,94,0.05)";
        e.currentTarget.style.boxShadow = "0 0 8px rgba(34,197,94,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(34,197,94,0.1)";
        e.currentTarget.style.background = "#1a1c28";
        e.currentTarget.style.boxShadow = "none";
      }}
      title={`View ${ticker}`}
    >
      <TokenAvatar
        mintAddress={mintAddress}
        imageUri={imageUri}
        size={avatarSize}
        ticker={ticker}
      />
      <span className="font-mono">{ticker}</span>
    </button>
  );
}
