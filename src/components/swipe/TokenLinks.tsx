"use client";

import { useState, useCallback } from "react";

interface TokenLinksProps {
  mintAddress: string;
}

function CopyIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function TokenLinks({ mintAddress }: TokenLinksProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(mintAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [mintAddress]);

  const pumpUrl = `https://pump.fun/${mintAddress}`;
  const solscanUrl = `https://solscan.io/token/${mintAddress}`;
  const dexscreenerUrl = `https://dexscreener.com/solana/${mintAddress}`;

  return (
    <div className="flex items-center justify-center gap-1 pt-1">
      <a
        href={pumpUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-[10px] transition-colors px-1.5 py-1 rounded"
        style={{ color: "#5c6380" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#8890a4"; e.currentTarget.style.background = "#1a1f2a"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#5c6380"; e.currentTarget.style.background = "transparent"; }}
        aria-label="View on Pump.fun"
      >
        <ExternalLinkIcon />
        <span>Pump</span>
      </a>
      <span style={{ color: "#444c60" }} aria-hidden="true">|</span>
      <a
        href={solscanUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-[10px] transition-colors px-1.5 py-1 rounded"
        style={{ color: "#5c6380" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#8890a4"; e.currentTarget.style.background = "#1a1f2a"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#5c6380"; e.currentTarget.style.background = "transparent"; }}
        aria-label="View on Solscan"
      >
        <ExternalLinkIcon />
        <span>Solscan</span>
      </a>
      <span style={{ color: "#444c60" }} aria-hidden="true">|</span>
      <a
        href={dexscreenerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-[10px] transition-colors px-1.5 py-1 rounded"
        style={{ color: "#5c6380" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#8890a4"; e.currentTarget.style.background = "#1a1f2a"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#5c6380"; e.currentTarget.style.background = "transparent"; }}
        aria-label="View on DexScreener"
      >
        <ExternalLinkIcon />
        <span>DexS</span>
      </a>
      <span style={{ color: "#444c60" }} aria-hidden="true">|</span>
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1 text-[10px] transition-colors px-1.5 py-1 rounded"
        style={{ color: copied ? "#22c55e" : "#5c6380" }}
        onMouseEnter={(e) => { if (!copied) { e.currentTarget.style.color = "#8890a4"; } e.currentTarget.style.background = "#1a1f2a"; }}
        onMouseLeave={(e) => { if (!copied) { e.currentTarget.style.color = "#5c6380"; } e.currentTarget.style.background = "transparent"; }}
        aria-label={copied ? "Copied" : "Copy contract address"}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        <span>{copied ? "Copied" : "Copy CA"}</span>
      </button>
    </div>
  );
}
