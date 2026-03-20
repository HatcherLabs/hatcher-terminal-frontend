"use client";

import { useCompare } from "@/components/providers/CompareProvider";
import { useState } from "react";

interface CompareButtonProps {
  mintAddress: string;
  size?: number;
  className?: string;
}

export function CompareButton({ mintAddress, size = 24, className = "" }: CompareButtonProps) {
  const { isInCompare, addToCompare, removeFromCompare, compareCount } = useCompare();
  const [animating, setAnimating] = useState(false);
  const active = isInCompare(mintAddress);
  const isFull = compareCount >= 3 && !active;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isFull) return;

    // Haptic feedback
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }

    // Bounce animation
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);

    if (active) {
      removeFromCompare(mintAddress);
    } else {
      addToCompare(mintAddress);
    }
  };

  return (
    <button
      onClick={handleClick}
      onPointerDown={(e) => e.stopPropagation()}
      disabled={isFull}
      className={`flex items-center justify-center transition-transform duration-200 ${
        animating ? "scale-125" : "scale-100"
      } ${isFull ? "opacity-40 cursor-not-allowed" : ""} ${className}`}
      aria-label={active ? "Remove from compare" : isFull ? "Compare list full (max 3)" : "Add to compare"}
      title={active ? "Remove from compare" : isFull ? "Compare list full (max 3)" : "Add to compare"}
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={active ? "text-accent" : "text-text-muted hover:text-text-secondary"}
      >
        {active ? (
          <>
            {/* Columns with checkmark */}
            <rect x="3" y="3" width="7" height="18" rx="1" fill="currentColor" opacity="0.15" />
            <rect x="3" y="3" width="7" height="18" rx="1" />
            <rect x="14" y="3" width="7" height="18" rx="1" fill="currentColor" opacity="0.15" />
            <rect x="14" y="3" width="7" height="18" rx="1" />
            <circle cx="18" cy="6" r="4" fill="currentColor" stroke="none" />
            <path d="M16.5 6L17.5 7L19.5 5" stroke="var(--bg-card, #0a0a1a)" strokeWidth="1.5" fill="none" />
          </>
        ) : (
          <>
            {/* Two columns icon */}
            <rect x="3" y="3" width="7" height="18" rx="1" />
            <rect x="14" y="3" width="7" height="18" rx="1" />
            <path d="M6.5 8h0M6.5 12h0M6.5 16h0" strokeWidth="2" strokeLinecap="round" />
            <path d="M17.5 8h0M17.5 12h0M17.5 16h0" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </svg>
    </button>
  );
}
