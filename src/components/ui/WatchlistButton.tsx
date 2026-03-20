"use client";

import { useWatchlist } from "@/components/providers/WatchlistProvider";
import { useState } from "react";

interface WatchlistButtonProps {
  token: {
    mintAddress: string;
    name: string;
    ticker: string;
    imageUri?: string | null;
  };
  size?: number;
  className?: string;
}

export function WatchlistButton({ token, size = 24, className = "" }: WatchlistButtonProps) {
  const { isWatchlisted, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const [animating, setAnimating] = useState(false);
  const active = isWatchlisted(token.mintAddress);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Haptic feedback
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }

    // Bounce animation
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);

    if (active) {
      removeFromWatchlist(token.mintAddress);
    } else {
      addToWatchlist(token);
    }
  };

  return (
    <button
      onClick={handleClick}
      onPointerDown={(e) => e.stopPropagation()}
      className={`flex items-center justify-center transition-transform duration-200 ${
        animating ? "scale-125" : "scale-100"
      } ${className}`}
      aria-label={active ? `Remove ${token.name} from watchlist` : `Add ${token.name} to watchlist`}
      title={active ? "Remove from watchlist" : "Add to watchlist"}
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill={active ? "#facc15" : "none"}
        stroke={active ? "#facc15" : "currentColor"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: active ? "#facc15" : "#5c6380" }}
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
}
