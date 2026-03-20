"use client";

import { useMemo } from "react";
import { useSolPriceContext } from "@/components/providers/SolPriceProvider";
import type { TokenData } from "@/types/token";

interface MarketOverviewProps {
  tokens: TokenData[];
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function StatCell({
  label,
  value,
  valueColor,
  subValue,
}: {
  label: string;
  value: string;
  valueColor?: string;
  subValue?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        padding: "4px 12px",
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: 8,
          fontWeight: 700,
          color: "#5c6380",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontFamily: "var(--font-jetbrains-mono), monospace",
        }}
      >
        {label}
      </span>
      <span
        className="font-mono"
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: valueColor ?? "#eef0f6",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      {subValue && (
        <span
          className="font-mono"
          style={{
            fontSize: 9,
            color: "#363d54",
            lineHeight: 1,
          }}
        >
          {subValue}
        </span>
      )}
    </div>
  );
}

export function MarketOverview({ tokens }: MarketOverviewProps) {
  const { solPrice } = useSolPriceContext();

  const stats = useMemo(() => {
    const total = tokens.length;
    const totalMcapSol = tokens.reduce((s, t) => s + (t.marketCapSol ?? 0), 0);
    const avgMcapSol = total > 0 ? totalMcapSol / total : 0;
    const totalVolume = tokens.reduce((s, t) => s + (t.volume1h ?? 0), 0);
    const totalBuys = tokens.reduce((s, t) => s + (t.buyCount ?? 0), 0);
    const totalSells = tokens.reduce((s, t) => s + (t.sellCount ?? 0), 0);
    const graduating = tokens.filter(
      (t) => !t.isGraduated && (t.bondingProgress ?? 0) > 60,
    ).length;
    const graduated = tokens.filter((t) => t.isGraduated).length;

    // Sentiment: what % of all txs are buys
    const totalTx = totalBuys + totalSells;
    const buyPct = totalTx > 0 ? (totalBuys / totalTx) * 100 : 50;

    return {
      total,
      totalMcapUsd: totalMcapSol * solPrice,
      avgMcapUsd: avgMcapSol * solPrice,
      totalVolume,
      totalBuys,
      totalSells,
      buyPct,
      graduating,
      graduated,
    };
  }, [tokens, solPrice]);

  const sentimentColor =
    stats.buyPct > 60
      ? "#00d672"
      : stats.buyPct > 45
        ? "#f0a000"
        : "#f23645";

  return (
    <div
      className="hidden terminal:flex items-center justify-between shrink-0"
      style={{
        padding: "4px 16px",
        background: "#0a0d14",
        borderBottom: "1px solid #1a1f2e",
        gap: 4,
      }}
    >
      {/* Left: market stats */}
      <div className="flex items-center" style={{ gap: 2 }}>
        <StatCell
          label="Tokens"
          value={fmt(stats.total)}
        />
        <div style={{ width: 1, height: 24, background: "#1a1f2e" }} />
        <StatCell
          label="Total MCap"
          value={`$${fmt(stats.totalMcapUsd)}`}
        />
        <div style={{ width: 1, height: 24, background: "#1a1f2e" }} />
        <StatCell
          label="Avg MCap"
          value={`$${fmt(stats.avgMcapUsd)}`}
        />
        <div style={{ width: 1, height: 24, background: "#1a1f2e" }} />
        <StatCell
          label="Vol (1h)"
          value={`$${fmt(stats.totalVolume)}`}
        />
      </div>

      {/* Right: sentiment + graduating */}
      <div className="flex items-center" style={{ gap: 2 }}>
        <StatCell
          label="Graduating"
          value={String(stats.graduating)}
          valueColor="#f0a000"
        />
        <div style={{ width: 1, height: 24, background: "#1a1f2e" }} />
        <StatCell
          label="Graduated"
          value={String(stats.graduated)}
          valueColor="#00d672"
        />
        <div style={{ width: 1, height: 24, background: "#1a1f2e" }} />

        {/* Sentiment gauge */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            padding: "4px 12px",
          }}
        >
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              color: "#5c6380",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontFamily: "var(--font-jetbrains-mono), monospace",
            }}
          >
            Sentiment
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className="font-mono"
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: sentimentColor,
                lineHeight: 1,
              }}
            >
              {stats.buyPct.toFixed(0)}%
            </span>
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: "#1a1f2e",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${stats.buyPct}%`,
                  height: "100%",
                  background: sentimentColor,
                  borderRadius: 2,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </div>
          <span
            className="font-mono"
            style={{ fontSize: 8, color: "#363d54" }}
          >
            {fmt(stats.totalBuys)}B / {fmt(stats.totalSells)}S
          </span>
        </div>
      </div>
    </div>
  );
}
