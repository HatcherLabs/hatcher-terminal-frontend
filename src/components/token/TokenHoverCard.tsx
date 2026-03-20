"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { MiniChart } from "./MiniChart";
import type { TokenData } from "@/types/token";

/* ── Helpers ─────────────────────────────────────────── */

function fmt(n: number | null | undefined): string {
  if (n == null) return "--";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(n < 1 ? 4 : n < 10 ? 2 : 0);
}

function pctStr(n: number | null | undefined): string {
  if (n == null) return "--";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function pctColor(n: number | null | undefined): string {
  if (n == null) return "#6b7280";
  return n >= 0 ? "#22c55e" : "#ef4444";
}

/* ── Constants ───────────────────────────────────────── */

const CARD_MAX_W = 280;
const SHOW_DELAY = 300;
const HIDE_DELAY = 100;
const CARD_GAP = 8;

/* ── Props ───────────────────────────────────────────── */

interface TokenHoverCardProps {
  mintAddress: string;
  tokenData: Partial<TokenData>;
  children: React.ReactNode;
}

/* ── Component ───────────────────────────────────────── */

export function TokenHoverCard({
  mintAddress,
  tokenData,
  children,
}: TokenHoverCardProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<"above" | "below">("below");
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const clearTimers = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    showTimer.current = null;
    hideTimer.current = null;
  }, []);

  const computeCoords = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;

    // Estimate card height (~200px) to decide above/below
    const estimatedCardH = 200;
    const spaceBelow = vh - rect.bottom;
    const placeAbove = spaceBelow < estimatedCardH + CARD_GAP && rect.top > estimatedCardH + CARD_GAP;

    setPosition(placeAbove ? "above" : "below");

    // Horizontal: center relative to trigger, clamp to viewport
    let left = rect.left + rect.width / 2 - CARD_MAX_W / 2;
    left = Math.max(CARD_GAP, Math.min(left, window.innerWidth - CARD_MAX_W - CARD_GAP));

    const top = placeAbove
      ? rect.top - CARD_GAP // card will use bottom positioning via transform
      : rect.bottom + CARD_GAP;

    setCoords({ top, left });
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    showTimer.current = setTimeout(() => {
      computeCoords();
      setVisible(true);
    }, SHOW_DELAY);
  }, [computeCoords]);

  const handleMouseLeave = useCallback(() => {
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    hideTimer.current = setTimeout(() => {
      setVisible(false);
    }, HIDE_DELAY);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const {
    name,
    ticker,
    imageUri,
    marketCapUsd,
    volume1h,
    holders,
    bondingProgress,
    riskLevel,
    priceChange5m,
    priceChange1h,
  } = tokenData;

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex"
      >
        {children}
      </span>

      {visible && (
        <div
          ref={cardRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="fixed z-[9999] animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            top: position === "above" ? undefined : coords.top,
            bottom: position === "above" ? `calc(100vh - ${coords.top}px)` : undefined,
            left: coords.left,
            maxWidth: CARD_MAX_W,
            width: CARD_MAX_W,
          }}
        >
          <div
            className="rounded-lg border overflow-hidden"
            style={{
              background: "rgba(16, 19, 28, 0.95)",
              borderColor: "#1c2030",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            {/* ── Header: Avatar + Name + Risk ── */}
            <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
              <TokenAvatar
                mintAddress={mintAddress}
                imageUri={imageUri}
                ticker={ticker ?? undefined}
                size={32}
              />
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold truncate" style={{ color: "#f0f2f7" }}>
                    {ticker ?? mintAddress.slice(0, 6)}
                  </span>
                  {riskLevel && <RiskBadge level={riskLevel} />}
                </div>
                {name && (
                  <span className="text-[11px] truncate leading-tight" style={{ color: "#8890a4" }}>
                    {name}
                  </span>
                )}
              </div>
            </div>

            {/* ── Stats Grid ── */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 px-3 py-2 border-t border-[#1c2030]">
              <StatRow label="MCap" value={`$${fmt(marketCapUsd)}`} />
              <StatRow label="Vol 1h" value={`$${fmt(volume1h)}`} />
              <StatRow label="Holders" value={fmt(holders)} />
              <StatRow
                label="Bonding"
                value={bondingProgress != null ? `${bondingProgress.toFixed(1)}%` : "--"}
              />
              <StatRow
                label="5m"
                value={pctStr(priceChange5m)}
                valueColor={pctColor(priceChange5m)}
              />
              <StatRow
                label="1h"
                value={pctStr(priceChange1h)}
                valueColor={pctColor(priceChange1h)}
              />
            </div>

            {/* ── Mini Sparkline ── */}
            <div className="px-3 pb-3 pt-1 border-t border-[#1c2030]">
              <MiniChart
                mintAddress={mintAddress}
                width={CARD_MAX_W - 24}
                height={32}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Stat Row ────────────────────────────────────────── */

function StatRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-wider" style={{ color: "#444c60" }}>
        {label}
      </span>
      <span
        className="text-[11px] font-mono font-medium"
        style={{ color: valueColor ?? "#c9cdd5" }}
      >
        {value}
      </span>
    </div>
  );
}
