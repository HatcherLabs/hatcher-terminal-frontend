"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { TokenLinks } from "./TokenLinks";
import { TokenChart } from "./TokenChart";
import type { TokenData } from "@/types/token";

const SOL_PRICE_USD = Number(process.env.NEXT_PUBLIC_SOL_PRICE_USD || 150);

interface TokenDetailModalProps {
  token: TokenData | null;
  isOpen: boolean;
  onClose: () => void;
  onBuy?: (token: TokenData) => void;
  onPass?: (token: TokenData) => void;
}

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(n < 10 ? 1 : 0);
}

function tokenAge(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function StatValue({
  value,
  color,
}: {
  value: string;
  color?: string;
}) {
  if (!value) {
    return (
      <span className="text-xs font-mono text-text-faint italic">
        Pending...
      </span>
    );
  }
  return (
    <span className={`text-sm font-mono font-semibold ${color ?? "text-text-primary"}`}>
      {value}
    </span>
  );
}

export function TokenDetailModal({
  token,
  isOpen,
  onClose,
  onBuy,
  onPass,
}: TokenDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleCopy = useCallback(() => {
    if (!token) return;
    navigator.clipboard.writeText(token.mintAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [token]);

  if (!token) return null;

  const mcapUsd =
    token.marketCapSol != null ? token.marketCapSol * SOL_PRICE_USD : null;
  const bondingPct = token.bondingProgress ?? 0;
  const bondingSol =
    token.bondingProgress != null
      ? ((token.bondingProgress / 100) * 85).toFixed(1)
      : null;

  const totalTrades = (token.buyCount ?? 0) + (token.sellCount ?? 0);
  const buyPressure =
    totalTrades > 0 ? ((token.buyCount ?? 0) / totalTrades) * 100 : 50;

  const descTruncLen = 120;
  const descNeedsTruncate =
    token.description != null && token.description.length > descTruncLen;
  const displayDesc =
    descNeedsTruncate && !descExpanded
      ? token.description!.slice(0, descTruncLen) + "..."
      : token.description;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            key="sheet"
            className="fixed inset-x-0 bottom-0 z-50 flex justify-center"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
          >
            <div
              className="w-full max-w-app bg-bg-card rounded-t-[20px] border border-b-0 border-border flex flex-col card-depth"
              style={{ maxHeight: "85vh" }}
              role="dialog"
              aria-modal="true"
              aria-label={`${token.name} details`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-2 shrink-0">
                <div className="w-10 h-1 rounded-full bg-text-faint" />
              </div>

              <div
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-4 space-y-4"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <div className="flex items-center gap-3">
                  <TokenAvatar
                    mintAddress={token.mintAddress}
                    imageUri={token.imageUri}
                    size={44}
                    ticker={token.ticker}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-text-primary truncate">
                        {token.name}
                      </h2>
                      <span className="text-sm font-mono text-text-muted shrink-0">
                        ${token.ticker}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors"
                        title="Copy contract address"
                      >
                        <span>
                          {token.mintAddress.slice(0, 6)}...
                          {token.mintAddress.slice(-4)}
                        </span>
                        <span className="text-[10px]">
                          {copied ? "\u2713" : "\u2398"}
                        </span>
                      </button>
                      <RiskBadge level={token.riskLevel} />
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
                    aria-label="Close"
                  >
                    &#10005;
                  </button>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">
                    MCap
                  </span>
                  {mcapUsd != null ? (
                    <>
                      <span className="text-2xl font-bold font-mono text-text-primary">
                        ${formatNumber(mcapUsd)}
                      </span>
                      {token.marketCapSol != null && (
                        <span className="text-xs font-mono text-text-muted">
                          ({formatNumber(token.marketCapSol)} SOL)
                        </span>
                      )}
                    </>
                  ) : token.marketCapSol != null ? (
                    <span className="text-2xl font-bold font-mono text-text-primary">
                      {formatNumber(token.marketCapSol)} SOL
                    </span>
                  ) : (
                    <span className="text-sm font-mono text-text-faint italic">
                      Pending...
                    </span>
                  )}
                </div>

                <div>
                  <TokenChart mintAddress={token.mintAddress} />
                </div>

                <div className="grid grid-cols-3 gap-[1px] bg-border rounded-xl overflow-hidden">
                  <div className="bg-bg-elevated px-3 py-2.5 text-center">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">MCap SOL</p>
                    <StatValue value={formatNumber(token.marketCapSol)} />
                  </div>
                  <div className="bg-bg-elevated px-3 py-2.5 text-center">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Vol 1h</p>
                    <StatValue value={token.volume1h != null ? `$${formatNumber(token.volume1h)}` : ""} />
                  </div>
                  <div className="bg-bg-elevated px-3 py-2.5 text-center">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Holders</p>
                    <StatValue value={formatNumber(token.holders)} />
                  </div>
                  <div className="bg-bg-elevated px-3 py-2.5 text-center">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Age</p>
                    <StatValue value={tokenAge(token.createdAt)} />
                  </div>
                  <div className="bg-bg-elevated px-3 py-2.5 text-center">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Buys / Sells</p>
                    {token.buyCount != null || token.sellCount != null ? (
                      <span className="text-sm font-mono font-semibold">
                        <span className="text-green">{formatNumber(token.buyCount) || "0"}</span>
                        <span className="text-text-muted mx-0.5">/</span>
                        <span className="text-red">{formatNumber(token.sellCount) || "0"}</span>
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-text-faint italic">Pending...</span>
                    )}
                  </div>
                  <div className="bg-bg-elevated px-3 py-2.5 text-center">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Dev Hold</p>
                    <StatValue
                      value={token.devHoldPct !== null ? `${token.devHoldPct.toFixed(1)}%` : ""}
                      color={token.devHoldPct !== null && token.devHoldPct > 15 ? "text-red" : undefined}
                    />
                  </div>
                </div>

                <div className="bg-bg-elevated rounded-xl p-3.5 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-text-secondary font-medium">Bonding Curve</span>
                    <span className="text-xs font-mono text-text-primary font-semibold">
                      {token.bondingProgress != null ? `${token.bondingProgress.toFixed(1)}%` : "0%"}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-bg-primary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.min(bondingPct, 100)}%`,
                        background: bondingPct >= 90 ? "#00ff88" : bondingPct >= 50 ? "#ffaa00" : "#3b82f6",
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-text-muted font-mono">{bondingSol ?? "0"} SOL</span>
                    <span className="text-[10px] text-text-muted font-mono">85 SOL</span>
                  </div>
                  {token.isGraduated && (
                    <div className="mt-2 text-center">
                      <span className="text-[10px] text-green font-bold uppercase tracking-wider bg-green-dim px-2 py-0.5 rounded-full">
                        Graduated to Raydium
                      </span>
                    </div>
                  )}
                </div>

                {totalTrades > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider">Buy/Sell Pressure</span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden">
                      <div className="bg-green transition-all duration-500" style={{ width: `${buyPressure}%` }} />
                      <div className="bg-red transition-all duration-500" style={{ width: `${100 - buyPressure}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] font-mono text-green">{buyPressure.toFixed(0)}% buys</span>
                      <span className="text-[10px] font-mono text-red">{(100 - buyPressure).toFixed(0)}% sells</span>
                    </div>
                  </div>
                )}

                {token.description && (
                  <div>
                    <p className="text-xs text-text-secondary leading-relaxed">{displayDesc}</p>
                    {descNeedsTruncate && (
                      <button
                        onClick={() => setDescExpanded(!descExpanded)}
                        className="text-[11px] text-text-muted hover:text-text-secondary mt-1 transition-colors"
                      >
                        {descExpanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </div>
                )}

                <div>
                  <TokenLinks
                    mintAddress={token.mintAddress}
                    twitter={token.twitter}
                    telegram={token.telegram}
                    website={token.website}
                  />
                </div>
              </div>

              <div className="shrink-0 px-4 pb-4 pt-2 border-t border-border bg-bg-card">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { onPass?.(token); onClose(); }}
                    className="flex-1 h-12 rounded-xl bg-red/10 border border-red/30 text-red font-bold text-sm flex items-center justify-center gap-2 hover:bg-red/20 transition-colors active:scale-[0.97]"
                    aria-label="Pass on token"
                  >
                    <span>&#10005;</span>
                    Pass
                  </button>
                  <button
                    onClick={() => { onBuy?.(token); onClose(); }}
                    className="flex-1 h-12 rounded-xl bg-green/10 border border-green/30 text-green font-bold text-sm flex items-center justify-center gap-2 hover:bg-green/20 transition-colors active:scale-[0.97]"
                    aria-label="Buy token"
                  >
                    <span className="text-base">&#9829;</span>
                    Buy
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
