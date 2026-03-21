"use client";

import { useState } from "react";
import { useQuickTrade } from "@/components/providers/QuickTradeProvider";

interface QuickTradeButtonProps {
  token: {
    mintAddress: string;
    name: string;
    ticker: string;
    imageUri: string | null;
  };
  size?: number;
  className?: string;
}

export function QuickTradeButton({ token, size = 18, className = "" }: QuickTradeButtonProps) {
  const { selectTokenAndOpen } = useQuickTrade();
  const [hovered, setHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    selectTokenAndOpen({
      mintAddress: token.mintAddress,
      name: token.name,
      ticker: token.ticker,
      imageUri: token.imageUri,
      priceSol: null,
    });
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex items-center justify-center transition-colors ${className}`}
      style={{
        color: hovered ? "#8b5cf6" : "#5c6380",
        boxShadow: hovered ? "0 0 8px rgba(139,92,246,0.3)" : "none",
        transition: "color 0.15s, box-shadow 0.2s",
      }}
      aria-label={`Quick trade ${token.ticker}`}
      title={`Quick trade ${token.ticker}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ filter: "drop-shadow(0 0 4px rgba(139,92,246,0.4))" }}
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    </button>
  );
}
