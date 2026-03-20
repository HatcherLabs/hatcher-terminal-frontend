"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePositions } from "@/hooks/usePositions";
import { api } from "@/lib/api";

/** Format a duration from an ISO timestamp to now as a compact string. */
function formatDuration(isoTimestamp: string | null): string {
  if (!isoTimestamp) return "--";
  const ms = Date.now() - new Date(isoTimestamp).getTime();
  if (ms < 0) return "0s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function PositionPill({
  id,
  mint,
  ticker,
  imageUri,
  entryPrice,
  pnlPercent,
  pnlSol,
  entryTimestamp,
  onClose,
  closing,
}: {
  id: string;
  mint: string;
  ticker: string;
  imageUri: string | null;
  entryPrice: number;
  pnlPercent: number | null;
  pnlSol: number | null;
  entryTimestamp: string | null;
  onClose: (id: string) => void;
  closing: boolean;
}) {
  const pnl = pnlPercent ?? 0;
  const sol = pnlSol ?? 0;
  const isProfit = pnl >= 0;
  const duration = formatDuration(entryTimestamp);

  return (
    <div className="flex items-center gap-1.5 h-7 px-2 bg-bg-elevated border border-border rounded shrink-0 group hover:border-border-hover transition-colors">
      {/* Token avatar + ticker as link */}
      <Link
        href={`/token/${mint}`}
        className="flex items-center gap-1.5 min-w-0"
      >
        {imageUri ? (
          <Image
            src={imageUri}
            alt={ticker}
            width={20}
            height={20}
            className="w-5 h-5 rounded-full shrink-0"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-bg-hover shrink-0 flex items-center justify-center">
            <span className="text-[8px] font-mono text-text-muted">
              {ticker.charAt(0)}
            </span>
          </div>
        )}
        <span className="text-[11px] font-mono font-medium text-text-secondary group-hover:text-text-primary transition-colors truncate max-w-[60px]">
          {ticker}
        </span>
      </Link>

      {/* Separator */}
      <div className="w-px h-3.5 bg-border shrink-0" />

      {/* Entry price */}
      <span className="text-[10px] font-mono text-text-muted shrink-0">
        {entryPrice < 0.0001
          ? entryPrice.toExponential(1)
          : entryPrice < 1
            ? entryPrice.toFixed(4)
            : entryPrice.toFixed(2)}
      </span>

      {/* P&L % */}
      <span
        className={`text-[11px] font-mono font-semibold shrink-0 ${
          isProfit ? "text-green" : "text-red"
        }`}
      >
        {isProfit ? "+" : ""}
        {pnl.toFixed(1)}%
      </span>

      {/* P&L in SOL */}
      <span
        className={`text-[10px] font-mono shrink-0 ${
          isProfit ? "text-green" : "text-red"
        }`}
        style={{ opacity: 0.7 }}
      >
        {isProfit ? "+" : ""}
        {sol.toFixed(3)}
      </span>

      {/* Duration */}
      <span className="text-[10px] font-mono text-text-faint shrink-0">
        {duration}
      </span>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose(id);
        }}
        disabled={closing}
        className="w-4 h-4 flex items-center justify-center rounded text-text-faint hover:text-red hover:bg-red-dim transition-colors shrink-0 opacity-0 group-hover:opacity-100"
        aria-label={`Close ${ticker} position`}
      >
        {closing ? (
          <svg className="w-2.5 h-2.5 animate-spin" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.3" />
            <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-2.5 h-2.5">
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function PositionsBar() {
  const { positions, loading, refresh } = usePositions("open");
  const [expanded, setExpanded] = useState(false);
  const [closingIds, setClosingIds] = useState<Set<string>>(new Set());

  const totalPnlSol = useMemo(() => {
    return positions.reduce((sum, p) => sum + (p.pnlSol ?? 0), 0);
  }, [positions]);

  const totalPnlPercent = useMemo(() => {
    if (positions.length === 0) return 0;
    const totalEntry = positions.reduce((sum, p) => sum + p.entrySol, 0);
    if (totalEntry === 0) return 0;
    return (totalPnlSol / totalEntry) * 100;
  }, [positions, totalPnlSol]);

  const isTotalProfit = totalPnlSol >= 0;

  const handleClose = useCallback(
    async (positionId: string) => {
      setClosingIds((prev) => new Set(prev).add(positionId));
      try {
        await api.post(`/api/positions/${positionId}/close`);
        refresh();
      } catch {
        // Silently fail — user can retry
      } finally {
        setClosingIds((prev) => {
          const next = new Set(prev);
          next.delete(positionId);
          return next;
        });
      }
    },
    [refresh],
  );

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="h-9 bg-[#0a0d14] border-t border-[#1a1f2e] flex items-center px-3 gap-2 shrink-0">
        <span className="text-[10px] text-text-faint font-mono uppercase tracking-wider shrink-0">
          Positions
        </span>
        <div className="w-px h-4 bg-[#1a1f2e] shrink-0" />
        <span className="text-[10px] text-text-muted font-mono animate-pulse">
          Loading...
        </span>
      </div>
    );
  }

  // Empty state
  if (positions.length === 0) {
    return (
      <div className="h-9 bg-[#0a0d14] border-t border-[#1a1f2e] flex items-center px-3 gap-2 shrink-0">
        <span className="text-[10px] text-text-faint font-mono uppercase tracking-wider shrink-0">
          Positions
        </span>
        <div className="w-px h-4 bg-[#1a1f2e] shrink-0" />
        <span className="text-[10px] text-text-muted font-mono">
          No open positions
        </span>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0d14] border-t border-[#1a1f2e] shrink-0 transition-all duration-200">
      {/* Collapsed strip — always visible */}
      <div className="h-9 flex items-center px-3 gap-2">
        {/* Summary on the left */}
        <button
          onClick={toggleExpanded}
          className="flex items-center gap-2 shrink-0 group/summary"
        >
          <span className="text-[10px] text-text-faint font-mono uppercase tracking-wider">
            {positions.length} Position{positions.length !== 1 ? "s" : ""}
          </span>
          <span
            className={`text-[11px] font-mono font-semibold ${
              isTotalProfit ? "text-green" : "text-red"
            }`}
          >
            {isTotalProfit ? "+" : ""}
            {totalPnlSol.toFixed(3)} SOL
          </span>
          <span
            className={`text-[10px] font-mono ${
              isTotalProfit ? "text-green" : "text-red"
            }`}
            style={{ opacity: 0.6 }}
          >
            ({isTotalProfit ? "+" : ""}
            {totalPnlPercent.toFixed(1)}%)
          </span>
          {/* Expand/collapse chevron */}
          <svg
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`w-3 h-3 text-text-faint transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          >
            <path d="M2 8l4-4 4 4" />
          </svg>
        </button>

        {/* Separator */}
        <div className="w-px h-4 bg-[#1a1f2e] shrink-0" />

        {/* Horizontal scrollable pills */}
        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1.5">
            {positions.map((pos) => (
              <PositionPill
                key={pos.id}
                id={pos.id}
                mint={pos.mintAddress}
                ticker={pos.token.ticker}
                imageUri={pos.token.imageUri}
                entryPrice={pos.entryPricePerToken}
                pnlPercent={pos.pnlPercent}
                pnlSol={pos.pnlSol}
                entryTimestamp={pos.entryTimestamp}
                onClose={handleClose}
                closing={closingIds.has(pos.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Expanded view */}
      {expanded && (
        <div className="border-t border-[#1a1f2e] px-3 py-2 animate-fade-in">
          <div className="grid gap-1">
            {positions.map((pos) => {
              const pnl = pos.pnlPercent ?? 0;
              const sol = pos.pnlSol ?? 0;
              const isProfit = pnl >= 0;
              const duration = formatDuration(pos.entryTimestamp);

              return (
                <Link
                  key={pos.id}
                  href={`/token/${pos.mintAddress}`}
                  className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-bg-hover transition-colors group/row"
                >
                  {/* Avatar + ticker */}
                  <div className="flex items-center gap-2 w-28 shrink-0">
                    {pos.token.imageUri ? (
                      <Image
                        src={pos.token.imageUri}
                        alt={pos.token.ticker}
                        width={20}
                        height={20}
                        className="w-5 h-5 rounded-full"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-bg-hover flex items-center justify-center">
                        <span className="text-[8px] font-mono text-text-muted">
                          {pos.token.ticker.charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="text-[11px] font-mono font-medium text-text-secondary group-hover/row:text-text-primary transition-colors truncate">
                      {pos.token.ticker}
                    </span>
                  </div>

                  {/* Entry */}
                  <div className="w-24 shrink-0">
                    <span className="text-[10px] font-mono text-text-muted">
                      Entry:{" "}
                    </span>
                    <span className="text-[10px] font-mono text-text-secondary">
                      {pos.entryPricePerToken < 0.0001
                        ? pos.entryPricePerToken.toExponential(1)
                        : pos.entryPricePerToken < 1
                          ? pos.entryPricePerToken.toFixed(4)
                          : pos.entryPricePerToken.toFixed(2)}
                    </span>
                  </div>

                  {/* Size */}
                  <div className="w-20 shrink-0">
                    <span className="text-[10px] font-mono text-text-muted">
                      Size:{" "}
                    </span>
                    <span className="text-[10px] font-mono text-text-secondary">
                      {pos.entrySol.toFixed(2)} SOL
                    </span>
                  </div>

                  {/* P&L */}
                  <div className="w-24 shrink-0">
                    <span
                      className={`text-[11px] font-mono font-semibold ${
                        isProfit ? "text-green" : "text-red"
                      }`}
                    >
                      {isProfit ? "+" : ""}
                      {pnl.toFixed(1)}%
                    </span>
                    <span
                      className={`text-[10px] font-mono ml-1.5 ${
                        isProfit ? "text-green" : "text-red"
                      }`}
                      style={{ opacity: 0.7 }}
                    >
                      {isProfit ? "+" : ""}
                      {sol.toFixed(3)}
                    </span>
                  </div>

                  {/* Duration */}
                  <span className="text-[10px] font-mono text-text-faint w-10 shrink-0">
                    {duration}
                  </span>

                  {/* Close button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleClose(pos.id);
                    }}
                    disabled={closingIds.has(pos.id)}
                    className="w-5 h-5 flex items-center justify-center rounded text-text-faint hover:text-red hover:bg-red-dim transition-colors shrink-0 opacity-0 group-hover/row:opacity-100 ml-auto"
                    aria-label={`Close ${pos.token.ticker} position`}
                  >
                    {closingIds.has(pos.id) ? (
                      <svg className="w-3 h-3 animate-spin" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                        <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3 h-3">
                        <path d="M2 2l8 8M10 2l-8 8" />
                      </svg>
                    )}
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
