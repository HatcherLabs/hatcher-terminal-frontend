"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { MiniChart } from "./MiniChart";
import type { TokenData } from "@/types/token";
import { useSolPriceContext } from "@/components/providers/SolPriceProvider";

/* ── Types ───────────────────────────────────────────── */

interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TokenDetailModalProps {
  token: TokenData | null;
  isOpen: boolean;
  onClose: () => void;
  onViewDetail?: (token: TokenData) => void;
  onBuy?: (token: TokenData) => void;
  /** Optional rect of the element that triggered the modal */
  anchorRect?: AnchorRect | null;
}

/* ── Helpers ─────────────────────────────────────────── */

const MODAL_W = 320;
const MODAL_GAP = 8;

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

function computePosition(
  anchor: AnchorRect | null | undefined,
  modalRef: React.RefObject<HTMLDivElement | null>,
): React.CSSProperties {
  if (!anchor) {
    // Center screen fallback
    return {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Try to place to the right of the anchor
  let left = anchor.left + anchor.width + MODAL_GAP;
  if (left + MODAL_W > vw - MODAL_GAP) {
    // Flip to left side
    left = anchor.left - MODAL_W - MODAL_GAP;
  }
  // Still off-screen? Center horizontally
  if (left < MODAL_GAP) {
    left = Math.max(MODAL_GAP, (vw - MODAL_W) / 2);
  }

  // Vertically align with anchor, but stay on-screen
  let top = anchor.top;
  const el = modalRef.current;
  const modalH = el ? el.offsetHeight : 480;
  if (top + modalH > vh - MODAL_GAP) {
    top = vh - modalH - MODAL_GAP;
  }
  if (top < MODAL_GAP) {
    top = MODAL_GAP;
  }

  return {
    position: "fixed",
    top,
    left,
  };
}

/* ── Component ───────────────────────────────────────── */

export function TokenDetailModal({
  token,
  isOpen,
  onClose,
  onViewDetail,
  onBuy,
  anchorRect,
}: TokenDetailModalProps) {
  const { solPrice: SOL_PRICE_USD } = useSolPriceContext();
  const [copied, setCopied] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [posStyle, setPosStyle] = useState<React.CSSProperties>({});

  // Recompute position when open/anchor changes
  useEffect(() => {
    if (!isOpen) return;
    // Small delay to let ref mount
    const raf = requestAnimationFrame(() => {
      setPosStyle(computePosition(anchorRect, modalRef));
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen, anchorRect]);

  // Escape to close
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
  const lpBurned = token.riskFactors
    ? (token.riskFactors as Record<string, unknown>).lpBurned === true
    : false;
  const mintRevoked = token.riskFactors
    ? (token.riskFactors as Record<string, unknown>).mintRevoked === true
    : false;

  const hasSocials = token.twitter || token.telegram || token.website;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="modal-backdrop"
            className="fixed inset-0 z-[60]"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            key="modal-card"
            ref={modalRef}
            className="z-[61]"
            style={{
              ...posStyle,
              width: MODAL_W,
              maxWidth: "calc(100vw - 16px)",
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-label={`${token.name} preview`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: "rgba(10,13,20,0.95)",
                backdropFilter: "blur(16px) saturate(1.2)",
                WebkitBackdropFilter: "blur(16px) saturate(1.2)",
                border: "1px solid rgba(34,197,94,0.08)",
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(34,197,94,0.04)",
              }}
            >
              {/* ── Header: Avatar + Name + Ticker + Risk ─── */}
              <div
                style={{
                  padding: "12px 14px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <TokenAvatar
                  mintAddress={token.mintAddress}
                  imageUri={token.imageUri}
                  size={36}
                  ticker={token.ticker}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        color: "#e5e7eb",
                        fontWeight: 700,
                        fontSize: 14,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {token.name}
                    </span>
                    <span
                      style={{
                        color: "#6b7280",
                        fontFamily: "monospace",
                        fontSize: 12,
                        flexShrink: 0,
                      }}
                    >
                      ${token.ticker}
                    </span>
                  </div>
                  <button
                    onClick={handleCopy}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "#4b5563",
                      fontFamily: "monospace",
                      fontSize: 10,
                      cursor: "pointer",
                      marginTop: 1,
                    }}
                    title="Copy contract address"
                  >
                    {token.mintAddress.slice(0, 6)}...
                    {token.mintAddress.slice(-4)}{" "}
                    {copied ? "\u2713" : "\u2398"}
                  </button>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <RiskBadge level={token.riskLevel} />
                </div>
              </div>

              {/* ── Price + Change ─────────────────────────── */}
              <div
                style={{
                  padding: "0 14px 8px",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    color: "#e5e7eb",
                    fontFamily: "monospace",
                    fontWeight: 700,
                    fontSize: 20,
                  }}
                >
                  {mcapUsd != null ? `$${fmt(mcapUsd)}` : token.marketCapSol != null ? `${fmt(token.marketCapSol)} SOL` : "--"}
                </span>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    color: pctColor(token.priceChange5m),
                  }}
                >
                  5m {pctStr(token.priceChange5m)}
                </span>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    color: pctColor(token.priceChange1h),
                  }}
                >
                  1h {pctStr(token.priceChange1h)}
                </span>
              </div>

              {/* ── 4-Cell Metrics Grid ───────────────────── */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 1,
                  background: "rgba(34,197,94,0.06)",
                  margin: "0 14px",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                {[
                  { label: "MCap", value: mcapUsd != null ? `$${fmt(mcapUsd)}` : fmt(token.marketCapSol) },
                  { label: "Holders", value: fmt(token.holders) },
                  { label: "Vol 1h", value: token.volume1h != null ? `$${fmt(token.volume1h)}` : "--" },
                  { label: "Bonding", value: token.bondingProgress != null ? `${token.bondingProgress.toFixed(1)}%` : "--" },
                ].map((cell) => (
                  <div
                    key={cell.label}
                    style={{
                      background: "#0f1219",
                      padding: "8px 10px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "#4b5563",
                        fontSize: 9,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 2,
                      }}
                    >
                      {cell.label}
                    </div>
                    <div
                      style={{
                        color: "#d1d5db",
                        fontFamily: "monospace",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {cell.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Mini Sparkline ─────────────────────────── */}
              <div
                style={{
                  padding: "10px 14px 6px",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <MiniChart
                  mintAddress={token.mintAddress}
                  width={280}
                  height={48}
                />
              </div>

              {/* ── Bonding Progress Bar ──────────────────── */}
              <div style={{ padding: "4px 14px 8px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 3,
                  }}
                >
                  <span style={{ color: "#6b7280", fontSize: 10 }}>
                    Bonding Curve
                  </span>
                  <span
                    style={{
                      color: "#d1d5db",
                      fontFamily: "monospace",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {token.bondingProgress != null
                      ? `${token.bondingProgress.toFixed(1)}%`
                      : "0%"}
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: 4,
                    background: "#1c2030",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(bondingPct, 100)}%`,
                      borderRadius: 2,
                      background:
                        bondingPct >= 90
                          ? "#22c55e"
                          : bondingPct >= 50
                            ? "#f59e0b"
                            : "#3b82f6",
                      transition: "width 0.5s ease-out",
                    }}
                  />
                </div>
                {token.isGraduated && (
                  <div style={{ textAlign: "center", marginTop: 4 }}>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#22c55e",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        background: "rgba(34,197,94,0.1)",
                        padding: "2px 8px",
                        borderRadius: 9999,
                      }}
                    >
                      Graduated to Raydium
                    </span>
                  </div>
                )}
              </div>

              {/* ── Security Indicators ───────────────────── */}
              <div
                style={{
                  padding: "4px 14px 8px",
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <SecurityPill
                  label="LP Burned"
                  active={lpBurned}
                />
                <SecurityPill
                  label="Mint Revoked"
                  active={mintRevoked}
                />
                {token.devHoldPct != null && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 10,
                      fontFamily: "monospace",
                      padding: "3px 8px",
                      borderRadius: 6,
                      background:
                        token.devHoldPct > 15
                          ? "rgba(239,68,68,0.1)"
                          : "rgba(34,197,94,0.1)",
                      color:
                        token.devHoldPct > 15 ? "#ef4444" : "#22c55e",
                      border: `1px solid ${token.devHoldPct > 15 ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`,
                    }}
                  >
                    Dev {token.devHoldPct.toFixed(1)}%
                  </span>
                )}
              </div>

              {/* ── Social Links ──────────────────────────── */}
              {hasSocials && (
                <div
                  style={{
                    padding: "2px 14px 8px",
                    display: "flex",
                    gap: 6,
                    justifyContent: "center",
                  }}
                >
                  {token.twitter && (
                    <SocialLink
                      href={token.twitter}
                      label="X"
                      hoverColor="#1DA1F2"
                    />
                  )}
                  {token.telegram && (
                    <SocialLink
                      href={
                        token.telegram.startsWith("http")
                          ? token.telegram
                          : `https://t.me/${token.telegram}`
                      }
                      label="TG"
                      hoverColor="#229ED9"
                    />
                  )}
                  {token.website && (
                    <SocialLink
                      href={
                        token.website.startsWith("http")
                          ? token.website
                          : `https://${token.website}`
                      }
                      label="Web"
                      hoverColor="#22c55e"
                    />
                  )}
                  <SocialLink
                    href={`https://pump.fun/coin/${token.mintAddress}`}
                    label="PF"
                    hoverColor="#22c55e"
                  />
                  <SocialLink
                    href={`https://dexscreener.com/solana/${token.mintAddress}`}
                    label="DS"
                    hoverColor="#22c55e"
                  />
                </div>
              )}

              {/* ── Action Buttons ────────────────────────── */}
              <div
                style={{
                  padding: "6px 14px 12px",
                  display: "flex",
                  gap: 8,
                }}
              >
                <button
                  onClick={() => {
                    onViewDetail?.(token);
                    onClose();
                  }}
                  style={{
                    flex: 1,
                    height: 36,
                    borderRadius: 8,
                    border: "1px solid #1c2030",
                    background: "#0f1219",
                    color: "#d1d5db",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#161b26";
                    e.currentTarget.style.borderColor = "#2a3040";
                    e.currentTarget.style.boxShadow = "0 0 8px rgba(34,197,94,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#0f1219";
                    e.currentTarget.style.borderColor = "#1c2030";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  View Detail
                </button>
                <button
                  onClick={() => {
                    onBuy?.(token);
                    onClose();
                  }}
                  style={{
                    flex: 1,
                    height: 36,
                    borderRadius: 8,
                    border: "1px solid rgba(34,197,94,0.3)",
                    background: "rgba(34,197,94,0.1)",
                    color: "#22c55e",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "background 0.15s",
                    boxShadow: "0 0 12px rgba(34,197,94,0.2)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(34,197,94,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(34,197,94,0.1)";
                  }}
                >
                  Quick Buy
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Sub-components ──────────────────────────────────── */

function SecurityPill({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 10,
        fontFamily: "monospace",
        padding: "3px 8px",
        borderRadius: 6,
        background: active
          ? "rgba(34,197,94,0.1)"
          : "rgba(107,114,128,0.1)",
        color: active ? "#22c55e" : "#4b5563",
        border: `1px solid ${active ? "rgba(34,197,94,0.2)" : "rgba(107,114,128,0.15)"}`,
      }}
    >
      <span style={{ fontSize: 9 }}>{active ? "\u2713" : "\u2717"}</span>
      {label}
    </span>
  );
}

function SocialLink({
  href,
  label,
  hoverColor,
}: {
  href: string;
  label: string;
  hoverColor: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 28,
        borderRadius: 6,
        background: "#0f1219",
        border: "1px solid #1c2030",
        color: "#6b7280",
        fontSize: 10,
        fontWeight: 700,
        textDecoration: "none",
        transition: "color 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = hoverColor;
        e.currentTarget.style.borderColor = `${hoverColor}44`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "#6b7280";
        e.currentTarget.style.borderColor = "#1c2030";
      }}
    >
      {label}
    </a>
  );
}
