"use client";

import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { api } from "@/lib/api";

interface GraveyardToken {
  id: string;
  swipedAt: string;
  token: {
    mintAddress: string;
    name: string;
    ticker: string;
    imageUri: string | null;
    riskLevel: "LOW" | "MED" | "HIGH" | "EXTREME" | null;
    isGraduated: boolean;
    isActive: boolean;
    currentMarketCapSol: number | null;
  };
  marketCapAtSwipe: number | null;
  currentMarketCap: number | null;
  priceChangePct: number | null;
  outcome: "rug" | "pump" | "neutral";
}

interface GraveyardStats {
  totalPassed: number;
  rugsDodged: number;
  opportunitiesMissed: number;
}

function formatTimeSince(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function getOutcomeLabel(outcome: string, pct: number | null): {
  text: string;
  color: string;
} {
  if (outcome === "rug") {
    return { text: "Dodged a rug \u{1F6E1}\uFE0F", color: "text-green" };
  }
  if (outcome === "pump") {
    const multiplier =
      pct !== null ? `${Math.round((pct + 100) / 100)}x` : "big";
    return {
      text: `Missed a ${multiplier} \u{1F624}`,
      color: "text-red",
    };
  }
  return { text: "Meh", color: "text-text-muted" };
}

function GraveyardStatsCard({ stats }: { stats: GraveyardStats }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 mb-4">
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
        Graveyard Stats
      </h2>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-mono font-bold text-text-primary">
            {stats.totalPassed}
          </p>
          <p className="text-[10px] text-text-muted uppercase">Passed</p>
        </div>
        <div>
          <p className="text-lg font-mono font-bold text-green">
            {stats.rugsDodged}
          </p>
          <p className="text-[10px] text-text-muted uppercase">Rugs Dodged</p>
        </div>
        <div>
          <p className="text-lg font-mono font-bold text-red">
            {stats.opportunitiesMissed}
          </p>
          <p className="text-[10px] text-text-muted uppercase">Missed</p>
        </div>
      </div>
    </div>
  );
}

function GraveyardCard({ item }: { item: GraveyardToken }) {
  const { text: outcomeText, color: outcomeColor } = getOutcomeLabel(
    item.outcome,
    item.priceChangePct
  );
  const pctChange = item.priceChangePct;
  const isUp = pctChange !== null && pctChange > 0;

  return (
    <div className="bg-bg-card border border-border rounded-xl p-3">
      <div className="flex items-center gap-3">
        <TokenAvatar
          mintAddress={item.token.mintAddress}
          imageUri={item.token.imageUri}
          size={40}
          ticker={item.token.ticker}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-text-primary">
              ${item.token.ticker}
            </p>
            <RiskBadge level={item.token.riskLevel} />
          </div>
          <p className="text-xs text-text-muted truncate">{item.token.name}</p>
        </div>

        <div className="text-right shrink-0">
          <p className={`text-xs font-semibold ${outcomeColor}`}>
            {outcomeText}
          </p>
          <p className="text-[10px] text-text-muted">
            {formatTimeSince(item.swipedAt)}
          </p>
        </div>
      </div>

      {/* Price comparison row */}
      <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-3 gap-2 text-[11px] font-mono">
        <div>
          <p className="text-text-muted">At swipe</p>
          <p className="text-text-secondary">
            {item.marketCapAtSwipe !== null
              ? `${item.marketCapAtSwipe.toFixed(0)} SOL`
              : "--"}
          </p>
        </div>
        <div>
          <p className="text-text-muted">Now</p>
          <p className="text-text-secondary">
            {item.currentMarketCap !== null && item.currentMarketCap > 0
              ? `${item.currentMarketCap.toFixed(0)} SOL`
              : item.token.isActive
                ? "--"
                : "DEAD"}
          </p>
        </div>
        <div>
          <p className="text-text-muted">Change</p>
          <p className={isUp ? "text-green" : "text-red"}>
            {pctChange !== null
              ? `${isUp ? "+" : ""}${pctChange.toFixed(0)}%`
              : "--"}
          </p>
        </div>
      </div>

      {/* Graduated badge */}
      {item.token.isGraduated && (
        <div className="mt-2 text-center">
          <span className="text-[10px] text-green font-mono font-bold bg-green/10 px-2 py-0.5 rounded-full">
            GRADUATED TO RAYDIUM
          </span>
        </div>
      )}
    </div>
  );
}

export default function GraveyardPage() {
  const [items, setItems] = useState<GraveyardToken[]>([]);
  const [stats, setStats] = useState<GraveyardStats>({
    totalPassed: 0,
    rugsDodged: 0,
    opportunitiesMissed: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchGraveyard = useCallback(async () => {
    try {
      const res = await api.raw("/api/tokens/graveyard");
      if (res.ok) {
        const json = await res.json();
        setItems(json.data);
        setStats(json.stats);
      }
    } catch {
      // retry on next load
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraveyard();
  }, [fetchGraveyard]);

  if (loading) {
    return (
      <div>
        <h1 className="text-lg font-bold text-text-primary mb-4">
          Graveyard
        </h1>
        <Skeleton className="h-28 rounded-xl mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <h1 className="text-lg font-bold text-text-primary mb-4">
          Graveyard
        </h1>
        <div className="flex flex-col items-center justify-center gap-3 mt-16 text-center">
          <p className="text-4xl">&#x1F480;</p>
          <p className="text-text-secondary text-sm font-medium">
            No passed tokens yet.
          </p>
          <p className="text-text-muted text-xs">
            Start swiping!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-bold text-text-primary mb-4">
        Graveyard
      </h1>
      <GraveyardStatsCard stats={stats} />
      <div className="space-y-3">
        {items.map((item) => (
          <GraveyardCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
