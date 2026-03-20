"use client";

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
      className={`flex items-center justify-center text-text-muted hover:text-accent transition-colors ${className}`}
      aria-label={`Quick trade ${token.ticker}`}
      title={`Quick trade ${token.ticker}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    </button>
  );
}
