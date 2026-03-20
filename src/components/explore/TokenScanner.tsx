"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { useSolPriceContext } from "@/components/providers/SolPriceProvider";
import type { TokenData } from "@/types/token";

/* ── Types ────────────────────────────────────── */

type ScanPreset =
  | "hot"
  | "fresh"
  | "graduating"
  | "whaleTarget"
  | "undervalued"
  | "risky";

interface ScanPresetConfig {
  key: ScanPreset;
  label: string;
  icon: string;
  description: string;
  filter: (t: TokenData) => boolean;
  sort: (a: TokenData, b: TokenData) => number;
  color: string;
}

/* ── Helpers ──────────────────────────────────── */

function fmt(n: number | null | undefined): string {
  if (n == null) return "--";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(n < 10 ? 1 : 0);
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

/* ── Presets ──────────────────────────────────── */

const PRESETS: ScanPresetConfig[] = [
  {
    key: "hot",
    label: "Hot Right Now",
    icon: "H",
    description: "High volume + buy pressure in last 5min",
    color: "#f23645",
    filter: (t) => {
      const buys = t.buyCount ?? 0;
      const sells = t.sellCount ?? 0;
      return buys + sells > 10 && buys > sells;
    },
    sort: (a, b) => {
      const aScore = (a.buyCount ?? 0) - (a.sellCount ?? 0);
      const bScore = (b.buyCount ?? 0) - (b.sellCount ?? 0);
      return bScore - aScore;
    },
  },
  {
    key: "fresh",
    label: "Just Launched",
    icon: "N",
    description: "Created in the last 5 minutes",
    color: "#3b82f6",
    filter: (t) => {
      const ageMs = Date.now() - new Date(t.detectedAt).getTime();
      return ageMs < 5 * 60 * 1000;
    },
    sort: (a, b) =>
      new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
  },
  {
    key: "graduating",
    label: "About to Graduate",
    icon: "G",
    description: "Bonding curve > 80%, not yet migrated",
    color: "#f0a000",
    filter: (t) => !t.isGraduated && (t.bondingProgress ?? 0) > 80,
    sort: (a, b) => (b.bondingProgress ?? 0) - (a.bondingProgress ?? 0),
  },
  {
    key: "whaleTarget",
    label: "Whale Interest",
    icon: "W",
    description: "Large buys from top wallets",
    color: "#8b5cf6",
    filter: (t) => (t.topHoldersPct ?? 0) > 40 && (t.buyCount ?? 0) > 5,
    sort: (a, b) => (b.topHoldersPct ?? 0) - (a.topHoldersPct ?? 0),
  },
  {
    key: "undervalued",
    label: "Low MCap Gems",
    icon: "L",
    description: "MCap < 5 SOL with growing holders",
    color: "#00d672",
    filter: (t) =>
      (t.marketCapSol ?? 999) < 5 && (t.holders ?? 0) > 10,
    sort: (a, b) => (b.holders ?? 0) - (a.holders ?? 0),
  },
  {
    key: "risky",
    label: "High Risk / High Reward",
    icon: "!",
    description: "Extreme risk tokens with high volatility",
    color: "#f23645",
    filter: (t) => t.riskLevel === "HIGH" || t.riskLevel === "EXTREME",
    sort: (a, b) => {
      const aVol = Math.abs(a.priceChange5m ?? 0);
      const bVol = Math.abs(b.priceChange5m ?? 0);
      return bVol - aVol;
    },
  },
];

/* ── Component ────────────────────────────────── */

interface TokenScannerProps {
  tokens: TokenData[];
}

export function TokenScanner({ tokens }: TokenScannerProps) {
  const router = useRouter();
  const { solPrice } = useSolPriceContext();
  const [activePreset, setActivePreset] = useState<ScanPreset>("hot");

  const preset = PRESETS.find((p) => p.key === activePreset)!;

  const results = useMemo(() => {
    return tokens.filter(preset.filter).sort(preset.sort).slice(0, 20);
  }, [tokens, preset]);

  const handleRowClick = useCallback(
    (mint: string) => {
      router.push(`/token/${mint}`);
    },
    [router],
  );

  return (
    <div
      style={{
        background: "#0a0d14",
        border: "1px solid #1a1f2e",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid #1a1f2e",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: "#eef0f6",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Token Scanner
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: 9,
                color: "#00d672",
                background: "rgba(0, 214, 114, 0.1)",
                padding: "1px 5px",
                borderRadius: 3,
                fontWeight: 700,
              }}
            >
              {results.length} found
            </span>
          </div>
          <span
            style={{
              fontSize: 9,
              color: "#5c6380",
              fontFamily: "var(--font-jetbrains-mono), monospace",
            }}
          >
            {preset.description}
          </span>
        </div>
      </div>

      {/* Preset pills */}
      <div
        className="scrollbar-hide"
        style={{
          display: "flex",
          gap: 4,
          padding: "6px 12px",
          overflowX: "auto",
          borderBottom: "1px solid #1a1f2e",
        }}
      >
        {PRESETS.map((p) => {
          const isActive = activePreset === p.key;
          return (
            <button
              key={p.key}
              onClick={() => setActivePreset(p.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 10px",
                borderRadius: 12,
                fontSize: 9,
                fontWeight: 700,
                fontFamily: "var(--font-jetbrains-mono), monospace",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                whiteSpace: "nowrap",
                cursor: "pointer",
                transition: "all 0.15s ease",
                background: isActive ? `${p.color}15` : "transparent",
                border: `1px solid ${isActive ? `${p.color}40` : "#1a1f2e"}`,
                color: isActive ? p.color : "#5c6380",
              }}
            >
              <span style={{ fontSize: 8 }}>{p.icon}</span>
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Results */}
      <div
        className="terminal-scrollbar"
        style={{ maxHeight: 320, overflowY: "auto" }}
      >
        {results.length === 0 ? (
          <div
            style={{
              padding: "24px 12px",
              textAlign: "center",
              color: "#363d54",
              fontSize: 11,
            }}
          >
            No tokens match this scanner
          </div>
        ) : (
          results.map((token, idx) => {
            const pct = token.priceChange5m ?? 0;
            const isPositive = pct >= 0;
            const mcapUsd =
              token.marketCapSol != null
                ? token.marketCapSol * solPrice
                : null;

            return (
              <div
                key={token.id}
                onClick={() => handleRowClick(token.mintAddress)}
                className="cursor-pointer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 12px",
                  borderBottom: "1px solid rgba(26, 31, 46, 0.25)",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#10131c")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {/* Rank */}
                <span
                  className="font-mono"
                  style={{
                    fontSize: 9,
                    color: "#363d54",
                    width: 16,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>

                {/* Avatar */}
                <TokenAvatar
                  mintAddress={token.mintAddress}
                  imageUri={token.imageUri}
                  size={22}
                  ticker={token.ticker}
                />

                {/* Name + Age */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#eef0f6",
                      }}
                    >
                      ${token.ticker}
                    </span>
                    <span
                      className="font-mono"
                      style={{ fontSize: 8, color: "#363d54" }}
                    >
                      {timeAgo(token.detectedAt)}
                    </span>
                  </div>
                </div>

                {/* MCap */}
                <span
                  className="font-mono"
                  style={{
                    fontSize: 9,
                    color: "#9ca3b8",
                    flexShrink: 0,
                    width: 52,
                    textAlign: "right",
                  }}
                >
                  {mcapUsd != null ? `$${fmt(mcapUsd)}` : "--"}
                </span>

                {/* Holders */}
                <span
                  className="font-mono"
                  style={{
                    fontSize: 9,
                    color: "#5c6380",
                    flexShrink: 0,
                    width: 32,
                    textAlign: "right",
                  }}
                >
                  {fmt(token.holders)}
                </span>

                {/* Bonding (for graduating preset) */}
                {activePreset === "graduating" &&
                  token.bondingProgress != null && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 3,
                          borderRadius: 2,
                          background: "#1a1f2e",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(token.bondingProgress, 100)}%`,
                            height: "100%",
                            background:
                              token.bondingProgress > 90
                                ? "#f23645"
                                : "#f0a000",
                            borderRadius: 2,
                          }}
                        />
                      </div>
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 8,
                          fontWeight: 700,
                          color:
                            token.bondingProgress > 90
                              ? "#f23645"
                              : "#f0a000",
                        }}
                      >
                        {token.bondingProgress.toFixed(0)}%
                      </span>
                    </div>
                  )}

                {/* Price change */}
                <span
                  className="font-mono"
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: isPositive ? "#00d672" : "#f23645",
                    flexShrink: 0,
                    width: 44,
                    textAlign: "right",
                  }}
                >
                  {isPositive ? "+" : ""}
                  {pct.toFixed(1)}%
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
